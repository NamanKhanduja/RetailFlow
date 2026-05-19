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
    "actionType": "GET_REVENUE" | "MARK_ATTENDANCE" | "CREATE_ORDER" | "GET_ORDERS" | "GET_LOW_STOCK" | "ADD_PRODUCT" | "ADD_EMPLOYEE" | "GET_EMPLOYEES" | null,
    "payload": {} // Any extracted data needed to perform the action (e.g., {"employeeName": "Naman", "status": "Absent", "salary": 50000})
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
        else if (actionType === 'GET_ORDERS') {
            const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
            const orders = await Order.find({ shop: req.user.id, createdAt: { $gte: startOfDay } });
            internalData = `Aaj total ${orders.length} orders aaye hain.`;
            aiResult.navigationTarget = '/orders';
        }
        else if (actionType === 'GET_EMPLOYEES') {
            const employees = await Employee.find({ shop: req.user.id });
            const absentCount = await Attendance.countDocuments({ date: { $gte: new Date().setHours(0,0,0,0) }, status: 'Absent' });
            internalData = `You have ${employees.length} employees. ${absentCount} are absent today.`;
            aiResult.navigationTarget = '/employees';
        }
        else if (actionType === 'MARK_ATTENDANCE' && payload.employeeName && payload.status) {
            const emp = await Employee.findOne({ shop: req.user.id, name: { $regex: new RegExp(payload.employeeName, 'i') } });
            if (emp) {
                await Attendance.create({ employee: emp._id, status: payload.status, date: new Date() });
                internalData = `Attendance marked ${payload.status} for ${emp.name}`;
                aiResult.refreshRequired = true;
            } else {
                internalData = `Employee ${payload.employeeName} not found in database.`;
            }
        }
        else if (actionType === 'ADD_EMPLOYEE' && payload.employeeName) {
            await Employee.create({
                shop: req.user.id,
                name: payload.employeeName,
                salary: payload.salary || 0
            });
            internalData = `Successfully added new employee named ${payload.employeeName}.`;
            aiResult.refreshRequired = true;
            aiResult.navigationTarget = '/employees';
        }
        else if (actionType === 'CREATE_ORDER' && payload.productName && payload.quantity) {
            const product = await Product.findOne({ shop: req.user.id, name: { $regex: new RegExp(payload.productName, 'i') } });
            if (!product) {
                internalData = `Product ${payload.productName} inventory me nahi mila.`;
            } else {
                const subtotal = product.sellingPrice * payload.quantity;
                await Order.create({
                    shop: req.user.id,
                    customer: { name: payload.customerName || 'Walk-in' },
                    items: [{
                        product: product._id,
                        productName: product.name,
                        unitPrice: product.sellingPrice,
                        costPrice: product.costPrice,
                        quantity: payload.quantity,
                        subtotal: subtotal
                    }],
                    totalAmount: subtotal,
                    finalAmount: subtotal
                });
                product.quantity = Math.max(0, product.quantity - payload.quantity);
                await product.save();
                internalData = `Order ban gaya for ${payload.quantity} ${product.name}. Total amount ₹${subtotal}.`;
                aiResult.refreshRequired = true;
                aiResult.navigationTarget = '/orders';
            }
        }
        else if (actionType === 'ADD_PRODUCT' && payload.productName && payload.price && payload.quantity !== undefined) {
            // Add product logic (satisfying ProductSchema)
            await Product.create({
                shop: req.user.id, // Auth middleware must provide req.user
                name: payload.productName,
                costPrice: payload.price,       // Assuming spoken price is both for simplicity or cost
                sellingPrice: payload.price,    // Same here unless LLM splits them
                quantity: payload.quantity,
                unit: payload.unit || 'pcs'
            });
            internalData = `Successfully added ${payload.quantity} ${payload.productName} at price ${payload.price}.`;
            aiResult.refreshRequired = true;
            aiResult.navigationTarget = '/inventory';
        }

        // Step 3: If we performed an action, ask LLM to generate the final spoken response based on real data
        if (internalData) {
            try {
                const followUpResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Original Request: "${text}". \nSystem Result: "${internalData}". \n\nGenerate ONLY a natural Hinglish spoken response representing this system result.`
                });
                aiResult.spokenResponse = followUpResponse.text.trim();
            } catch (err) {
                console.error("Follow-up AI failed:", err.message);
                aiResult.spokenResponse = "Action successful, but I'm currently experiencing high network demand.";
            }
        }
    }

    // Send final JSON to frontend
    res.json(aiResult);

  } catch (error) {
    console.error('AI Processing Error:', error);
    const msg = error?.status === 503 || error?.message?.includes('503') 
        ? "AI provider is currently overloaded (503). Please try again in a moment."
        : "Internal server error";
    res.status(500).json({ message: msg, error: error.message });
  }
};
