/**
 * Full end-to-end API test script.
 * Run with: node test.js
 * Tests all endpoints with dummy data and prints pass/fail for each.
 */

const BASE = 'http://localhost:5000/api/v1';

let TOKEN = '';
let IDs = {};  // Stores IDs returned from create calls

const pass = (label) => console.log(`  ✅  ${label}`);
const fail = (label, msg) => console.log(`  ❌  ${label} — ${msg}`);

async function req(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  ShopPro — Full API Test Suite');
  console.log('═══════════════════════════════════════════════\n');

  // ── 1. HEALTH CHECK ───────────────────────────────────────────────────────
  console.log('🏥 Health Check');
  try {
    const { data } = await req('GET', '/health', null, false);
    data.success ? pass('GET /health') : fail('GET /health', JSON.stringify(data));
  } catch (e) { fail('GET /health', e.message); }

  // ── 2. AUTH ───────────────────────────────────────────────────────────────
  console.log('\n🔐 Auth');

  // Register (might fail if email already exists — that's OK)
  try {
    const { status, data } = await req('POST', '/auth/register', {
      shopName: 'ShopPro Test Store',
      ownerName: 'Naman Khan',
      email: 'testowner@shoppro.dev',
      password: 'test1234',
      phone: '+91 9876543210',
      address: '123 MG Road, New Delhi',
    }, false);
    if (data.token) { TOKEN = data.token; pass('POST /auth/register (new user)'); }
    else if (status === 400 && data.message?.includes('Duplicate')) pass('POST /auth/register (email exists — expected)');
    else fail('POST /auth/register', data.message);
  } catch (e) { fail('POST /auth/register', e.message); }

  // Login
  try {
    const { data } = await req('POST', '/auth/login', {
      email: 'testowner@shoppro.dev',
      password: 'test1234',
    }, false);
    if (data.token) { TOKEN = data.token; pass('POST /auth/login'); }
    else fail('POST /auth/login', data.message);
  } catch (e) { fail('POST /auth/login', e.message); }

  // Get Me
  try {
    const { data } = await req('GET', '/auth/me');
    data.success ? pass('GET /auth/me') : fail('GET /auth/me', data.message);
  } catch (e) { fail('GET /auth/me', e.message); }

  // Update Me
  try {
    const { data } = await req('PUT', '/auth/me', { phone: '+91 9000000000' });
    data.success ? pass('PUT /auth/me') : fail('PUT /auth/me', data.message);
  } catch (e) { fail('PUT /auth/me', e.message); }

  // ── 3. PRODUCTS ───────────────────────────────────────────────────────────
  console.log('\n📦 Products & Inventory');

  const products = [
    { name: 'Basmati Rice', sku: 'RICE-001', category: 'Grains', unit: 'kg', costPrice: 60, sellingPrice: 80, quantity: 100, lowStockThreshold: 15 },
    { name: 'Refined Oil', sku: 'OIL-001', category: 'Oils', unit: 'litre', costPrice: 110, sellingPrice: 140, quantity: 8, lowStockThreshold: 10 },
    { name: 'Sugar', sku: 'SUG-001', category: 'Essentials', unit: 'kg', costPrice: 40, sellingPrice: 55, quantity: 0, lowStockThreshold: 20 },
  ];

  for (const p of products) {
    try {
      const { data } = await req('POST', '/products', p);
      if (data.success) { IDs[p.sku] = data.data._id; pass(`POST /products — ${p.name}`); }
      else if (data.message?.includes('Duplicate')) { 
        // Already exists, fetch it
        const list = await req('GET', '/products');
        const found = list.data.data?.find(x => x.sku === p.sku);
        if (found) { IDs[p.sku] = found._id; pass(`POST /products — ${p.name} (already exists)`); }
      }
      else fail(`POST /products — ${p.name}`, data.message);
    } catch (e) { fail(`POST /products — ${p.name}`, e.message); }
  }

  try {
    const { data } = await req('GET', '/products');
    data.success ? pass(`GET /products (${data.count} total)`) : fail('GET /products', data.message);
  } catch (e) { fail('GET /products', e.message); }

  try {
    const { data } = await req('GET', '/products/low-stock');
    data.success ? pass(`GET /products/low-stock (${data.count} items)`) : fail('GET /products/low-stock', data.message);
  } catch (e) { fail('GET /products/low-stock', e.message); }

  const riceId = IDs['RICE-001'];
  if (riceId) {
    try {
      const { data } = await req('GET', `/products/${riceId}`);
      data.success ? pass('GET /products/:id') : fail('GET /products/:id', data.message);
    } catch (e) { fail('GET /products/:id', e.message); }

    try {
      const { data } = await req('PUT', `/products/${riceId}`, { sellingPrice: 85 });
      data.success ? pass('PUT /products/:id') : fail('PUT /products/:id', data.message);
    } catch (e) { fail('PUT /products/:id', e.message); }

    try {
      const { data } = await req('PATCH', `/products/${riceId}/stock`, { adjustment: -5 });
      data.success ? pass('PATCH /products/:id/stock (adjustment -5)') : fail('PATCH /products/:id/stock', data.message);
    } catch (e) { fail('PATCH /products/:id/stock', e.message); }
  }

  // ── 4. ORDERS ─────────────────────────────────────────────────────────────
  console.log('\n🛒 Orders');
  if (riceId) {
    try {
      const { data } = await req('POST', '/orders', {
        customer: { name: 'Rahul Sharma', phone: '+91 8888888888' },
        items: [{ product: riceId, quantity: 5 }],
        discount: 10,
        notes: 'Test order',
      });
      if (data.success) {
        IDs['order1'] = data.data._id;
        pass(`POST /orders — ${data.data.orderNumber} (₹${data.data.finalAmount})`);
      } else fail('POST /orders', data.message);
    } catch (e) { fail('POST /orders', e.message); }
  }

  try {
    const { data } = await req('GET', '/orders');
    data.success ? pass(`GET /orders (${data.count} total)`) : fail('GET /orders', data.message);
  } catch (e) { fail('GET /orders', e.message); }

  if (IDs['order1']) {
    try {
      const { data } = await req('GET', `/orders/${IDs['order1']}`);
      data.success ? pass('GET /orders/:id') : fail('GET /orders/:id', data.message);
    } catch (e) { fail('GET /orders/:id', e.message); }

    try {
      const { data } = await req('PATCH', `/orders/${IDs['order1']}/status`, { status: 'Completed' });
      data.success ? pass('PATCH /orders/:id/status → Completed (auto-logs sale)') : fail('PATCH /orders/:id/status', data.message);
    } catch (e) { fail('PATCH /orders/:id/status', e.message); }
  }

  // ── 5. SALES / FINANCE ────────────────────────────────────────────────────
  console.log('\n💰 Finance & Sales');

  try {
    const { data } = await req('POST', '/sales', {
      revenue: 2500,
      costOfGoodsSold: 1800,
      date: new Date().toISOString(),
      notes: 'Manual test sale',
    });
    if (data.success) { IDs['sale1'] = data.data._id; pass(`POST /sales (profit: ₹${data.data.profit})`); }
    else fail('POST /sales', data.message);
  } catch (e) { fail('POST /sales', e.message); }

  try {
    const { data } = await req('GET', '/sales');
    data.success ? pass(`GET /sales (${data.count} records)`) : fail('GET /sales', data.message);
  } catch (e) { fail('GET /sales', e.message); }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await req('GET', `/sales/daily?date=${today}`);
    data.success ? pass(`GET /sales/daily — Revenue: ₹${data.data.totalRevenue}, Profit: ₹${data.data.totalProfit}`) : fail('GET /sales/daily', data.message);
  } catch (e) { fail('GET /sales/daily', e.message); }

  try {
    const m = new Date().getMonth() + 1, y = new Date().getFullYear();
    const { data } = await req('GET', `/sales/monthly?month=${m}&year=${y}`);
    data.success ? pass(`GET /sales/monthly — Total Revenue: ₹${data.totals.totalRevenue}`) : fail('GET /sales/monthly', data.message);
  } catch (e) { fail('GET /sales/monthly', e.message); }

  // ── 6. EMPLOYEES ──────────────────────────────────────────────────────────
  console.log('\n👥 Employees & Attendance');

  const employees = [
    { name: 'Priya Verma', phone: '+91 7777777777', role: 'Cashier', salary: 15000 },
    { name: 'Ravi Gupta',  phone: '+91 6666666666', role: 'Stock Boy', salary: 12000 },
  ];

  for (const emp of employees) {
    try {
      const { data } = await req('POST', '/employees', emp);
      if (data.success) { IDs[emp.name] = data.data._id; pass(`POST /employees — ${emp.name}`); }
      else fail(`POST /employees — ${emp.name}`, data.message);
    } catch (e) { fail(`POST /employees — ${emp.name}`, e.message); }
  }

  try {
    const { data } = await req('GET', '/employees');
    data.success ? pass(`GET /employees (${data.count} active)`) : fail('GET /employees', data.message);
  } catch (e) { fail('GET /employees', e.message); }

  // Mark attendance for both employees
  const today = new Date().toISOString().slice(0, 10);
  const attRecords = Object.entries(IDs)
    .filter(([k]) => employees.some(e => e.name === k))
    .map(([, id], i) => ({ employee: id, date: today, status: i === 0 ? 'Present' : 'Absent' }));

  if (attRecords.length > 0) {
    try {
      const { data } = await req('POST', '/employees/attendance', { records: attRecords });
      data.success ? pass('POST /employees/attendance (bulk mark)') : fail('POST /employees/attendance', data.message);
    } catch (e) { fail('POST /employees/attendance', e.message); }

    try {
      const { data } = await req('GET', `/employees/attendance?date=${today}`);
      data.success ? pass(`GET /employees/attendance — ${data.count} records for ${today}`) : fail('GET /employees/attendance', data.message);
    } catch (e) { fail('GET /employees/attendance', e.message); }
  }

  const firstEmpId = IDs[employees[0].name];
  if (firstEmpId) {
    try {
      const { data } = await req('GET', `/employees/${firstEmpId}`);
      data.success ? pass('GET /employees/:id') : fail('GET /employees/:id', data.message);
    } catch (e) { fail('GET /employees/:id', e.message); }

    try {
      const m = new Date().getMonth() + 1, y = new Date().getFullYear();
      const { data } = await req('GET', `/employees/${firstEmpId}/attendance?month=${m}&year=${y}`);
      data.success ? pass(`GET /employees/:id/attendance — ${JSON.stringify(data.summary)}`) : fail('GET /employees/:id/attendance', data.message);
    } catch (e) { fail('GET /employees/:id/attendance', e.message); }

    try {
      const { data } = await req('PUT', `/employees/${firstEmpId}`, { salary: 16000 });
      data.success ? pass('PUT /employees/:id') : fail('PUT /employees/:id', data.message);
    } catch (e) { fail('PUT /employees/:id', e.message); }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Test suite complete!');
  console.log('═══════════════════════════════════════════════\n');
}

run().catch(console.error);
