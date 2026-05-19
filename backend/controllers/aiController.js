const { GoogleGenAI } = require('@google/genai');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// Ensure GEMINI_API_KEY is available in .env
let ai = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.warn("Google Gen AI client not initialized (check API key).");
}

const SYSTEM_PROMPT = `
You are 'RetailFlow AI', the intelligent co-pilot for a Shop Management application. 
Your user will speak to you in Hindi, English, or Hinglish. Your personality is highly efficient, helpful, and concise.

Your goal is to map the user's spoken command to the exact actions required by the application.
You must ONLY output a valid JSON object. No markdown formatting, no conversational filler, no code blocks.

### CONTEXT & SCHEMA
You have access to the following modules:
1. Inventory: Products have name, quantity, price, stockStatus.
2. Orders: Orders require customer details, product items, and totalAmount.
3. HR: Employees have attendance (Present, Absent, Half-Day).
4. Finance: Tracks daily/monthly revenue and profit.

### JSON OUTPUT FORMAT
You must respond with the following strict JSON structure:
{
  "intent": "FETCH_DATA" | "MUTATE_DATA" | "NAVIGATE" | "ASK_CLARIFICATION",
  "internalAction": {
    "actionType": "GET_REVENUE" | "MARK_ATTENDANCE" | "CREATE_ORDER" | "GET_LOW_STOCK" | "ADD_PRODUCT" | null,
    "payload": {} // Any extracted data needed to perform the action (e.g., {"productName": "Shirt", "quantity": 10, "price": 500})
  },
  "navigationTarget": "/dashboard" | "/inventory" | "/orders" | "/finance" | "/employees" | null,
  "spokenResponse": "The exact Hinglish phrase to speak back to the user. (Keep empty if internal action is required)",
  "requiresFollowUp": boolean,
  "refreshRequired": boolean
}
`;

exports.processVoiceCommand = async (req, res) => {
  try {
    if (!ai) return res.status(500).json({ message: "AI Assistant is not configured. Missing API Key." });

    const { text, history } = req.body;
    if (!text) return res.status(400).json({ message: "No text provided" });

    // Format history for context
    let promptContext = text;
    if (history && history.length > 0) {
        promptContext = history.map(h => `${h.role}: ${h.content}`).join('\n');
    }

    // Step 1: Get Initial Intent from LLM
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptContext,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      }
    });

    let aiResult;
    try {
      let rawText = response.text;
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(rawText);
    } catch (e) {
      return res.status(500).json({ message: "Failed to parse AI response", error: e.message });
    }

    // Step 2: Backend Internal Actions (The Agent Logic)
    if (aiResult.internalAction && aiResult.internalAction.actionType) {
        const { actionType, payload } = aiResult.internalAction;
        let internalData = null;

        if (actionType === 'GET_REVENUE') {
            const today = new Date();
            today.setHours(0,0,0,0);
            const sales = await Sale.find({ createdAt: { $gte: today }});
            const totalRev = sales.reduce((sum, s) => sum + s.finalAmount, 0);
            internalData = `Today's Revenue is ₹${totalRev}`;
        }
        else if (actionType === 'GET_LOW_STOCK') {
            const lowStock = await Product.find({ quantity: { $lte: 5 }});
            internalData = `There are ${lowStock.length} items low on stock.`;
            aiResult.navigationTarget = '/inventory';
        }
        else if (actionType === 'MARK_ATTENDANCE' && payload.employeeName && payload.status) {
            const emp = await Employee.findOne({ name: { $regex: new RegExp(payload.employeeName, 'i') } });
            if (emp) {
                await Attendance.create({ employee: emp._id, status: payload.status, date: new Date() });
                internalData = `Attendance marked ${payload.status} for ${emp.name}`;
                aiResult.refreshRequired = true;
            } else {
                internalData = `Employee ${payload.employeeName} not found in database.`;
            }
        }
        else if (actionType === 'ADD_PRODUCT' && payload.productName && payload.price && payload.quantity !== undefined) {
            // Add product logic
            await Product.create({
                name: payload.productName,
                price: payload.price,
                quantity: payload.quantity,
                stockStatus: payload.quantity > 5 ? 'In Stock' : 'Low Stock',
                unit: payload.unit || 'pcs'
            });
            internalData = `Successfully added ${payload.quantity} ${payload.productName} at price ${payload.price}.`;
            aiResult.refreshRequired = true;
            aiResult.navigationTarget = '/inventory';
        }

        // Step 3: If we performed an action, ask LLM to generate the final spoken response based on real data
        if (internalData) {
            const followUpResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Original Request: "${text}". \nSystem Result: "${internalData}". \n\nGenerate ONLY a natural Hinglish spoken response representing this system result.`
            });
            aiResult.spokenResponse = followUpResponse.text.trim();
        }
    }

    // Send final JSON to frontend
    res.json(aiResult);

  } catch (error) {
    console.error('AI Processing Error:', error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
