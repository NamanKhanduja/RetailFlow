/**
 * testOrchestrator.js  —  RetailFlow Gateway Orchestrator Integration Tests
 * ═════════════════════════════════════════════════════════════════════════
 * Logs in as seeded owner and exercises the API Gateway Orchestrator endpoint
 * to assert all five contract rules:
 *
 *   1. Intent Mapping (Hinglish/English parsed to PLACE_ORDER)
 *   2. Data Integrity (Extracts from P001 & P002 DB context)
 *   3. Idempotency (Validates deterministic hash ID seed matches)
 *   4. Brevity (Checks spoken response is strictly under 10 words)
 *   5. Security Gate (Asserts 403 Forbidden when roles are restricted)
 *   6. Partial Info (Asserts ASK_MISSING intent)
 *
 * Run with: node testOrchestrator.js
 */

const BASE = 'http://localhost:5000/api/v1';
const OWNER = {
  email: 'rajesh@sharmakirana.dev',
  password: 'demo1234',
};

let TOKEN = '';

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('\n═════════════════════════════════════════════════════════');
  console.log('    RetailFlow — API Gateway Orchestrator E2E Tests     ');
  console.log('═════════════════════════════════════════════════════════\n');

  // ── 1. LOGIN ───────────────────────────────────────────────────────────────
  console.log('🔑 Authenticating...');
  try {
    const { status, data } = await req('POST', '/auth/login', OWNER);
    if (data.token) {
      TOKEN = data.token;
      console.log(`  ✅ Login successful! Token acquired for: ${OWNER.email}\n`);
    } else {
      console.error(`  ❌ Login failed (Status ${status}):`, data.message);
      process.exit(1);
    }
  } catch (e) {
    console.error('  ❌ Auth Network Error:', e.message);
    process.exit(1);
  }

  // ── 2. SHARED CONTEXT DEFINITION ──────────────────────────────────────────
  const mockContext = {
    products: [
      { id: 'P001', name: 'Britannia Bread', price: 40, stock: 50 },
      { id: 'P002', name: 'Amul Butter', price: 60, stock: 20 }
    ],
    sales_today: { revenue: 1200, profit: 350 }
  };

  const tests = [
    // ── TEST 1: Hinglish Mapping (Option 1) ──────────────────────────────────
    {
      name: 'Test 1: Hinglish Intent Mapping & Calculations (Option 1)',
      payload: {
        text: 'Customer Raj ke liye 2 bread aur 1 butter ka order place kar do.',
        context_data: mockContext,
        roles: { role: 'owner', can_place_order: true },
        timestamp: 1716912000000
      },
      assert: (status, res) => {
        if (status !== 200) throw new Error(`Expected 200 OK, got ${status}`);
        if (res.intent !== 'PLACE_ORDER') throw new Error(`Expected PLACE_ORDER, got ${res.intent}`);
        if (res.payload?.value !== 140) throw new Error(`Expected value 140 (2x40 + 1x60), got ${res.payload?.value}`);
        
        // Assert Brevity (<10 words)
        const wordCount = res.spokenResponse.split(/\s+/).length;
        console.log(`     Spoken: "${res.spokenResponse}" (${wordCount} words)`);
        if (wordCount > 10) throw new Error(`Spoken response exceeded 10 words: ${wordCount}`);
        
        console.log(`  ✅ Hinglish mapping passed! Value: ₹${res.payload.value}`);
      }
    },

    // ── TEST 2: English Mapping (Option 2) ───────────────────────────────────
    {
      name: 'Test 2: English Intent Mapping & Calculations (Option 2)',
      payload: {
        text: 'Place an order for 2 breads and 1 butter for customer Raj.',
        context_data: mockContext,
        roles: { role: 'owner', can_place_order: true },
        timestamp: 1716912000000
      },
      assert: (status, res) => {
        if (status !== 200) throw new Error(`Expected 200 OK, got ${status}`);
        if (res.intent !== 'PLACE_ORDER') throw new Error(`Expected PLACE_ORDER, got ${res.intent}`);
        if (res.payload?.value !== 140) throw new Error(`Expected value 140, got ${res.payload?.value}`);
        
        console.log(`  ✅ English mapping passed! Value: ₹${res.payload.value}`);
      }
    },

    // ── TEST 3: Security & Authorization Block (Access Denied) ───────────────
    {
      name: 'Test 3: Security Permission Gate Enforcement (Pre-flight Block)',
      payload: {
        text: 'Place an order for 2 Britannia Bread.',
        context_data: mockContext,
        roles: { role: 'cashier', can_place_order: false }, // Restrained!
        timestamp: 1716912000000
      },
      assert: (status, res) => {
        if (status !== 403) throw new Error(`Expected 403 Forbidden, got ${status}`);
        if (res.intent !== 'ERROR') throw new Error(`Expected intent ERROR, got ${res.intent}`);
        if (res.payload?.error !== 'UNAUTHORIZED') throw new Error(`Expected UNAUTHORIZED payload, got ${res.payload?.error}`);
        
        console.log(`  ✅ Security Gate blocked unauthorized order placement! (403 Forbidden)`);
        console.log(`     Spoken Block: "${res.spokenResponse}"`);
      }
    },

    // ── TEST 4: Partial Information (ASK_MISSING) ────────────────────────────
    {
      name: 'Test 4: Partial Information Handling (ASK_MISSING Intent)',
      payload: {
        text: 'Place order please.', // No products or quantities!
        context_data: mockContext,
        roles: { role: 'owner', can_place_order: true },
        timestamp: 1716912000000
      },
      assert: (status, res) => {
        if (status !== 200) throw new Error(`Expected 200 OK, got ${status}`);
        if (res.intent !== 'ASK_MISSING') throw new Error(`Expected ASK_MISSING, got ${res.intent}`);
        
        console.log(`  ✅ Partial info intent resolved to: ${res.intent}`);
        console.log(`     Missing slots recorded:`, res.payload?.meta?.missing_slots || 'None');
        console.log(`     Spoken prompt: "${res.spokenResponse}"`);
      }
    },

    // ── TEST 5: Idempotency Assertion ────────────────────────────────────────
    {
      name: 'Test 5: Idempotency Request ID Deterministic Seeds',
      payload: {
        text: 'Place an order for 2 breads and 1 butter for customer Raj.',
        context_data: mockContext,
        roles: { role: 'owner', can_place_order: true },
        timestamp: 1716912000000 // same timestamp seed
      },
      assert: async (status, res) => {
        const id1 = res.request_id;
        
        // Re-execute identical request
        const dup = await req('POST', '/ai/orchestrator', {
          text: 'Place an order for 2 breads and 1 butter for customer Raj.',
          context_data: mockContext,
          roles: { role: 'owner', can_place_order: true },
          timestamp: 1716912000000
        });
        
        const id2 = dup.data.request_id;
        if (id1 !== id2) throw new Error(`Non-idempotent IDs! ID1: ${id1}, ID2: ${id2}`);
        console.log(`  ✅ Identical request returned same ID: ${id1}`);

        // Execute request with a new timestamp seed
        const distinct = await req('POST', '/ai/orchestrator', {
          text: 'Place an order for 2 breads and 1 butter for customer Raj.',
          context_data: mockContext,
          roles: { role: 'owner', can_place_order: true },
          timestamp: 1716912000001 // +1ms change
        });

        const id3 = distinct.data.request_id;
        if (id1 === id3) throw new Error('Same Request ID returned for different timestamp!');
        console.log(`  ✅ Altered seed successfully produced distinct ID: ${id3}`);
      }
    }
  ];

  // Run through scenarios
  for (const tc of tests) {
    console.log(`🎬 Running ${tc.name}...`);
    let lastResponse = null;
    try {
      const { status, data } = await req('POST', '/ai/orchestrator', tc.payload);
      lastResponse = data;
      await tc.assert(status, data);
    } catch (err) {
      console.error(`  ❌ Assertion Failed in: ${tc.name}`);
      console.error(`     Error Details: ${err.message}`);
      if (lastResponse) {
        console.error(`     Server Response Body:`, JSON.stringify(lastResponse, null, 2));
      }
      console.error();
      process.exit(1);
    }
    console.log('─────────────────────────────────────────────────────────\n');
  }

  console.log('═════════════════════════════════════════════════════════');
  console.log(' 🎉 ALL GATEWAY ORCHESTRATOR INTEGRATION TESTS PASSED!');
  console.log('═════════════════════════════════════════════════════════\n');
}

run().catch(console.error);
