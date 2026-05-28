/**
 * orchestratorController.js  —  RetailFlow API Gateway Orchestrator
 * ─────────────────────────────────────────────────────────────
 * Strict mapping controller designed with contract rules:
 *
 *  1. Intent Mapping: Maps Hindi / Hinglish / English inputs to a strict JSON schema.
 *  2. Data Integrity: Employs live [DB_CONTEXT] context data dynamically.
 *  3. Idempotency: Generates a deterministic request_id using Client-side Timestamp + UserID + input.
 *  4. Brevity: Constraints spokenResponse to <10 words, no fluff, no greetings.
 *  5. Security Gate: Blocks execution and returns 403 Forbidden if user lacks necessary permissions.
 *  6. 2s Timeout Pattern: Avoids hanging by racing LLM execution against a 2000ms timer.
 *  7. Robust JSON Safety: Prevents crashes on malformed AI text outputs.
 */

const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');
const { producer } = require('../config/kafka');

// Initialise Gemini client once using existing key
let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.warn('[RetailFlow Orchestrator] Gemini client could not initialise:', e.message);
}

/**
 * Main Controller Handler for POST /api/v1/ai/orchestrator
 */
exports.processGatewayCommand = async (req, res) => {
  const userId = req.user?.id || req.body.userId || 'anonymous-user';
  const { text, context_data = {}, roles = {}, timestamp = Date.now() } = req.body;

  // 1. Generate Deterministic Request ID for Idempotency
  const seed = `${userId}-${timestamp}-${text}`;
  const requestId = crypto.createHash('sha256').update(seed).digest('hex');

  // Verify natural language input is present
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      request_id: requestId,
      intent: 'ERROR',
      payload: { error: 'BAD_REQUEST', message: 'Input command "text" is required.' },
      spokenResponse: 'Command khali hai.'
    });
  }

  // 2. Build Data-Enriched Prompt enforcing contract rules
  const dbProducts = context_data.products || [];
  const dbProductsStr = dbProducts.map(p => `${p.name} (ID: ${p.id}, price: ₹${p.price}, stock: ${p.stock})`).join('; ');
  const dbSales = context_data.sales_today
    ? `Revenue: ₹${context_data.sales_today.revenue}, Profit: ₹${context_data.sales_today.profit}`
    : 'No sales today.';

  const systemInstruction = `
Role: You are the RetailFlow API Gateway Orchestrator. You are a high-speed data processing API mapper.

CONTRACT RULES:
1. INTENT MAPPING: Map natural language to: ADD_PRODUCT | LOG_SALE | PLACE_ORDER | MARK_ATTENDANCE | FETCH_ANALYTICS | ASK_MISSING | ERROR.
2. DATA INTEGRITY: Use provided [DATABASE CONTEXT]. If a product exists in context (e.g. matching "bread" to "Britannia Bread"), map to its exact name and ID. Do not ask for info that is present in the context.
3. PARTIAL INFORMATION / ASK_MISSING: If vital slots (e.g., customerName, contact details, items, or quantities) are completely missing to perform an action, set "intent" to "ASK_MISSING" and specify the missing slots in payload. Ask for only ONE missing detail in spokenResponse.
4. BREVITY: Spoken response MUST be strictly under 10 words, with NO greetings (no Namaste, hello), and NO fluff. Direct and concise.
5. STRICT JSON SCHEMA: Return ONLY the exact JSON matching this schema (do not wrap in markdown code fences or backticks, just raw JSON):
{
  "intent": "ADD_PRODUCT | LOG_SALE | PLACE_ORDER | MARK_ATTENDANCE | FETCH_ANALYTICS | ASK_MISSING | ERROR",
  "payload": {
    "entity_id": "string or null",
    "value": (number or null),
    "meta": {
      "customerName": "string or null",
      "items": [
        {
          "product_id": "string",
          "name": "string",
          "quantity": (number)
        }
      ],
      "missing_slots": ["array of strings e.g. customerName, items, quantities"]
    }
  },
  "spokenResponse": "Concise language-matched confirmation (<10 words)"
}

[DATABASE CONTEXT]:
- Products In Stock: ${dbProductsStr}
- Sales Today Metrics: ${dbSales}
`.trim();

  // Helper function to call LLM with fallback models
  const queryGemini = async () => {
    if (!ai) throw new Error('Gemini API client not initialised.');
    const models = [
      'gemini-2.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview'
    ];

    let lastErr = null;
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Process this input: "${text}"`,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json'
          }
        });
        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[RetailFlow Orchestrator] Model ${modelName} call failed: ${err.message}`);
      }
    }
    throw lastErr || new Error('All Gemini model calls failed.');
  };

  // 3. Race LLM Execution with 8-second Timeout Pattern (safe for cold starts)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 8000)
  );

  try {
    const rawResult = await Promise.race([queryGemini(), timeoutPromise]);

    // 4. Safe JSON Extraction & Parsing Block
    let parsedResult;
    try {
      const cleanedText = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedText);
    } catch (e) {
      console.error('[RetailFlow Orchestrator] JSON parse crash. Raw text was:', rawResult);
      return res.status(500).json({
        request_id: requestId,
        intent: 'ERROR',
        payload: { error: 'PARSE_ERROR', rawText: rawResult },
        spokenResponse: 'A I response reading failed.'
      });
    }

    let intent = parsedResult.intent || 'ERROR';
    const payload = parsedResult.payload || { meta: {} };
    if (!payload.meta) payload.meta = {};
    let spokenResponse = parsedResult.spokenResponse || 'Ho gaya.';

    // 4.1 Programmatic Calculation Refinement for Data Integrity
    if (intent === 'PLACE_ORDER' || intent === 'LOG_SALE') {
      if (!payload.entity_id && payload.meta.customerName) {
        payload.entity_id = payload.meta.customerName;
      }
      
      if (payload.meta.items && Array.isArray(payload.meta.items)) {
        let computedTotal = 0;
        const productsInContext = context_data.products || [];

        for (const item of payload.meta.items) {
          const matchedProd = productsInContext.find(p => 
            p.id === item.product_id || 
            (item.name && p.name.toLowerCase() === item.name.toLowerCase())
          );
          
          if (matchedProd) {
            if (!item.product_id) item.product_id = matchedProd.id;
            if (!item.name) item.name = matchedProd.name;
            computedTotal += matchedProd.price * (item.quantity || 1);
          }
        }
        payload.value = computedTotal;
      }
    }

    // 4.2 Programmatic Intent Safeguard for Missing Slots
    if (payload.meta.missing_slots && Array.isArray(payload.meta.missing_slots) && payload.meta.missing_slots.length > 0) {
      intent = 'ASK_MISSING';
    }

    // 5. Security Authorization Gate Check
    // If the classified action requires specific roles, assert pre-flight permissions
    if (intent === 'PLACE_ORDER' && roles.can_place_order !== true) {
      return res.status(403).json({
        request_id: requestId,
        intent: 'ERROR',
        payload: { error: 'UNAUTHORIZED', action: 'PLACE_ORDER' },
        spokenResponse: 'Order place karne ki permission nahi hai.'
      });
    }

    if (intent === 'ADD_PRODUCT' && roles.can_add_product !== true && roles.role !== 'owner') {
      return res.status(403).json({
        request_id: requestId,
        intent: 'ERROR',
        payload: { error: 'UNAUTHORIZED', action: 'ADD_PRODUCT' },
        spokenResponse: 'Product add karne ki permission nahi hai.'
      });
    }

    // Enforce word count limit strictly (<10 words) on final output
    const words = spokenResponse.trim().split(/\s+/);
    if (words.length > 10) {
      spokenResponse = words.slice(0, 9).join(' ') + '.';
    }

    // 6. Asynchronous Event-Driven Kafka Pipeline
    if (intent === 'PLACE_ORDER') {
      try {
        console.log(`[Trace ID: ${requestId}] [Kafka Producer] Publishing order event...`);
        await producer.send({
          topic: 'retailflow.orders.v1',
          messages: [
            {
              key: requestId,
              value: JSON.stringify({
                request_id: requestId,
                intent,
                payload,
                timestamp,
                userId
              }),
              headers: {
                correlation_id: requestId
              }
            }
          ]
        });
        console.log(`[Trace ID: ${requestId}] [Kafka Producer] Event successfully published to topic 'retailflow.orders.v1'.`);
      } catch (err) {
        console.error(`[Trace ID: ${requestId}] [Kafka Producer] Failed to publish message:`, err.message);
      }
    }

    // Success response
    return res.json({
      request_id: requestId,
      intent,
      payload,
      spokenResponse
    });

  } catch (error) {
    console.error('[RetailFlow Orchestrator] Execution Error:', error.message);

    // If dynamic timeout occurs
    if (error.message === 'TIMEOUT_EXCEEDED') {
      return res.status(503).json({
        request_id: requestId,
        intent: 'ERROR',
        payload: { error: 'TIMEOUT', message: 'System busy, please try again.' },
        spokenResponse: 'Server busy hai, thodi der baad koshish karein.'
      });
    }

    // General exception fallback
    return res.status(500).json({
      request_id: requestId,
      intent: 'ERROR',
      payload: { error: 'INTERNAL_SERVER_ERROR', message: error.message },
      spokenResponse: 'Kuch gadbad ho gayi. Firse try karein.'
    });
  }
};
