// ============================================================================
// TUOBA ERP — local fallback engine (zero-server mode)
// When the API server is unreachable (fresh sandbox / static hosting /
// preview restart), the whole ERP keeps working in the browser with the
// same screens, credentials and data shapes, persisted to localStorage.
// ============================================================================
const LOCAL_DB_KEY = 'tuoba-erp-local-db';

const LOCAL_USERS = [
  { username: 'admin', name: 'مدير النظام', role: 'admin', password: 'admin123' },
  { username: 'manager', name: 'مدير التشغيل', role: 'manager', password: 'manager123' },
  { username: 'cashier', name: 'كاشير الفرع', role: 'cashier', password: 'cashier123' }
];

function localSeed() {
  const brands = {
    'TUOBA Fried & Grill': ['Giza Main', 'Nasr City'],
    'TUOBA Cafe': ['Sheikh Zayed', 'New Cairo'],
    'TUOBA Express': ['Alexandria']
  };
  const items = [
    { name_ar: 'برجر دجاج', name_en: 'Chicken Burger', name_fr: 'Burger Poulet', name_es: 'Hamburguesa de pollo', name_tr: 'Tavuk Burger', price: 85, prep: 12 },
    { name_ar: 'برجر لحم', name_en: 'Beef Burger', name_fr: 'Burger Boeuf', name_es: 'Hamburguesa de carne', name_tr: 'Et Burger', price: 95, prep: 14 },
    { name_ar: 'وجبة استربس', name_en: 'Strips Meal', name_fr: 'Menu Strips', name_es: 'Combo Strips', name_tr: 'Strips Menü', price: 120, prep: 15 },
    { name_ar: 'فرايز', name_en: 'Fries', name_fr: 'Frites', name_es: 'Papas fritas', name_tr: 'Patates', price: 35, prep: 6 },
    { name_ar: 'كولا', name_en: 'Cola', name_fr: 'Cola', name_es: 'Cola', name_tr: 'Kola', price: 25, prep: 1 },
    { name_ar: 'قهوة', name_en: 'Coffee', name_fr: 'Café', name_es: 'Café', name_tr: 'Kahve', price: 45, prep: 4 }
  ];
  const menu = [];
  let mid = 0;
  Object.keys(brands).forEach(brand => items.forEach(it => menu.push({ id: ++mid, brand, ...it, active: true })));
  const finance = [];
  Object.entries(brands).forEach(([brand, branches]) => branches.forEach((branch, i) =>
    finance.push({ brand, branch, foodCost: 168000 - i * 12000, payroll: 95000 - i * 9000, rent: 40000 - i * 2500, other: 32000 - i * 2800 })));
  return {
    schemaVersion: 'local-1',
    seq: 0, menuSeq: mid, stockSeq: 5,
    settings: {
      company: 'TUOBA', currency: 'EGP', taxRate: 14, demoMode: true,
      shifts: [{ name: 'Morning', start: '09:00', end: '18:00' }, { name: 'Evening', start: '14:00', end: '23:00' }],
      printerCopies: { cashier: 1, kitchen: 1, pickup: 1 },
      brands
    },
    me: null,
    menu, finance,
    stock: [
      { id: 1, name: 'دجاج (كاركاس)', unit: 'kg', qty: 48, reorderLevel: 20 },
      { id: 2, name: 'لحم بقري مفروم', unit: 'kg', qty: 15, reorderLevel: 20 },
      { id: 3, name: 'خبز برجر', unit: 'pcs', qty: 320, reorderLevel: 100 },
      { id: 4, name: 'بطاطس مجمدة', unit: 'kg', qty: 75, reorderLevel: 30 },
      { id: 5, name: 'علب كولا', unit: 'pcs', qty: 180, reorderLevel: 96 }
    ],
    stockMoves: [], orders: [], calls: [], payments: [], expenses: [],
    recipes: [], geidea: [], imports: [],
    customers: [{ brand: 'TUOBA Fried & Grill', branch: 'Giza Main', name: 'عميل 1', phone: '01000000001', lastPayment: 'NFC' }],
    attendance: [], securityLogs: [], tables: {},
    users: LOCAL_USERS.map(u => ({ username: u.username, name: u.name, role: u.role, active: true }))
  };
}

let localDb = null;
function localLoad() {
  if (localDb) return localDb;
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    localDb = raw ? JSON.parse(raw) : localSeed();
  } catch { localDb = localSeed(); }
  return localDb;
}
function localPersist() {
  try { localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(localDb)); } catch { /* blocked → memory only */ }
}
function localAudit(type, detail) {
  localDb.securityLogs.unshift({ type, detail, user: localDb.me ? localDb.me.username : null, time: new Date().toISOString() });
  if (localDb.securityLogs.length > 300) localDb.securityLogs.length = 300;
}
function localSeq(prefix) { localDb.seq += 1; return prefix + '-' + String(localDb.seq).padStart(5, '0'); }
function localTables(brand, branch) {
  const k = brand + '|' + branch;
  if (!Array.isArray(localDb.tables[k])) localDb.tables[k] = Array.from({ length: 6 }, (_, i) => ({ id: 'T' + (i + 1), occupied: false }));
  return localDb.tables[k];
}
function localValidBrandBranch(b) {
  const arr = localDb.settings.brands[b.brand];
  return arr && arr.includes(b.branch);
}
function localShiftHours(name) {
  const s = (localDb.settings.shifts || []).find(x => x.name === name);
  if (!s) return 0;
  const [sh, sm] = String(s.start).split(':').map(Number);
  const [eh, em] = String(s.end).split(':').map(Number);
  const startH = (sh || 0) + (sm || 0) / 60;
  let endH = (eh || 0) + (em || 0) / 60;
  if (endH <= startH) endH += 24;
  return endH - startH;
}
const r2 = n => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Request router — mirrors the server API surface
// ---------------------------------------------------------------------------
function localApi(path, method = 'GET', body = {}) {
  localLoad();
  const db = localDb;
  const now = () => new Date().toISOString();
  const fail = (code, status) => { throw new ApiError(code, status || 400); };

  if (path === '/api/public/config') return { company: db.settings.company, demoMode: true };

  if (path === '/api/auth/login' && method === 'POST') {
    const u = LOCAL_USERS.find(x => x.username.toLowerCase() === String(body.username || '').toLowerCase() && x.password === body.password);
    if (!u) fail('wrongCreds', 401);
    db.me = { username: u.username, name: u.name, role: u.role };
    localPersist();
    return { token: 'local-' + u.username, user: { ...db.me, active: true } };
  }
  if (!db.me) fail('unauthorized', 401);

  if (path === '/api/auth/logout') { db.me = null; localPersist(); return { ok: true }; }
  if (path === '/api/auth/change-password') return { ok: true };

  if (path === '/api/bootstrap') {
    const out = {
      me: { ...db.me, role: db.me.role }, settings: db.settings, menu: db.menu,
      stock: db.stock, stockMoves: db.stockMoves.slice(0, 50), orders: db.orders,
      calls: db.calls, payments: db.payments, expenses: db.expenses, recipes: db.recipes,
      geidea: db.geidea, imports: db.imports, finance: db.finance, customers: db.customers,
      attendance: db.attendance, securityLogs: db.securityLogs, tables: db.tables
    };
    if (db.me.role === 'admin') out.users = db.users;
    return out;
  }
  if (path === '/api/export') return { ...db, me: undefined };

  const scope = () => {
    const sc = { brand: body.brand, branch: body.branch };
    if (!localValidBrandBranch(sc)) fail('forbidden', 403);
    return sc;
  };

  // ---- orders ----
  if (path === '/api/orders' && method === 'POST') {
    const sc = scope();
    if (!['table', 'takeaway', 'delivery'].includes(body.mode)) fail('badRequest');
    if (!Array.isArray(body.items) || !body.items.length) fail('badRequest');
    const items = body.items.map(raw => {
      const mi = db.menu.find(m => m.id === Number(raw.id) && m.brand === sc.brand && m.active);
      const qty = Math.max(1, Math.min(99, Number(raw.qty) || 1));
      if (!mi) fail('badRequest');
      return { ...mi, qty };
    });
    let customer = null;
    if (body.mode === 'delivery') {
      const phone = String(body.customer && body.customer.phone || '').trim();
      if (phone.length < 6) fail('badRequest');
      customer = { name: String(body.customer.name || '').trim(), phone, app: String(body.customer.app || '').trim(), address: String(body.customer.address || '').trim() };
      const ex = db.customers.find(c => c.brand === sc.brand && c.branch === sc.branch && c.phone === phone);
      if (ex) ex.lastPayment = 'delivery'; else db.customers.unshift({ ...sc, name: customer.name || 'Customer', phone, lastPayment: 'delivery' });
    }
    let table = '';
    if (body.mode === 'table') {
      const t = localTables(sc.brand, sc.branch).find(x => x.id === body.table);
      if (!t) fail('badRequest');
      t.occupied = true; table = body.table;
    }
    const subtotal = r2(items.reduce((a, b) => a + b.price * b.qty, 0));
    const taxRate = Number(db.settings.taxRate) || 0;
    const tax = r2(subtotal * taxRate / 100);
    const prepMinutes = Math.max(1, ...items.map(i => i.prep || 5), 5);
    const order = {
      ...sc, orderNo: localSeq('ORD'), mode: body.mode, table, customer,
      payment: ['cash', 'card'].includes(body.payment) ? body.payment : 'cash',
      items, subtotal, taxRate, tax, total: r2(subtotal + tax), prepMinutes,
      createdBy: db.me.username, createdAt: now(),
      readyAt: new Date(Date.now() + prepMinutes * 60000).toISOString(), status: 'preparing',
      copies: { ...(db.settings.printerCopies || { cashier: 1, kitchen: 1, pickup: 1 }) }
    };
    db.orders.unshift(order); localPersist();
    return { order };
  }
  let m = path.match(/^\/api\/orders\/([\w-]+)\/status$/);
  if (m && method === 'POST') {
    const order = db.orders.find(o => o.orderNo === m[1]);
    if (!order) fail('notFound', 404);
    if (!['preparing', 'ready', 'picked'].includes(body.status)) fail('badRequest');
    order.status = body.status;
    if (body.status === 'picked' && order.mode === 'table' && order.table) {
      const t = localTables(order.brand, order.branch).find(x => x.id === order.table);
      if (t) t.occupied = false;
    }
    localPersist(); return { order };
  }

  // ---- calls ----
  if (path === '/api/calls' && method === 'POST') {
    const sc = scope();
    if (!body.phone || !body.customerName || !body.orderText) fail('badRequest');
    const prep = Math.max(1, Number(body.prep) || 20);
    const call = {
      ...sc, id: localSeq('CC'), phone: body.phone, customerName: body.customerName,
      type: body.type || 'delivery', zone: body.zone || '', orderText: body.orderText,
      status: 'new', driver: '', createdBy: db.me.username, createdAt: now(),
      readyAt: new Date(Date.now() + prep * 60000).toISOString()
    };
    db.calls.unshift(call); localPersist(); return { call };
  }
  m = path.match(/^\/api\/calls\/([\w-]+)\/(assign|status)$/);
  if (m && method === 'POST') {
    const call = db.calls.find(c => c.id === m[1]);
    if (!call) fail('notFound', 404);
    if (m[2] === 'assign') { call.driver = body.driver || '—'; call.status = 'assigned'; }
    else if (['new', 'assigned', 'out', 'delivered'].includes(body.status)) call.status = body.status;
    localPersist(); return { call };
  }

  // ---- payments / expenses / recipes / geidea ----
  if (path === '/api/payments' && method === 'POST') {
    const sc = scope();
    if (!body.customer || !body.phone || !(Number(body.amount) > 0)) fail('badRequest');
    const payment = { ...sc, customer: body.customer, phone: body.phone, amount: r2(Number(body.amount)), method: body.method || 'Cash', txId: localSeq('TX'), at: now(), createdBy: db.me.username };
    db.payments.unshift(payment);
    localAudit('payment', `${payment.method} ${payment.txId} — ${payment.amount}`);
    localPersist(); return { payment };
  }
  if (path === '/api/expenses' && method === 'POST') {
    const sc = scope();
    if (!body.title || !(Number(body.amount) > 0)) fail('badRequest');
    const expense = { ...sc, title: body.title, amount: r2(Number(body.amount)), note: body.note || '', receiptName: body.receiptName || '', receiptData: typeof body.receiptData === 'string' ? body.receiptData.slice(0, 550000) : '', at: now(), createdBy: db.me.username };
    db.expenses.unshift(expense); localPersist(); return { expense };
  }
  if (path === '/api/recipes' && method === 'POST') {
    const sc = scope();
    if (!body.name || !(Number(body.cost) > 0) || !(Number(body.price) > 0)) fail('badRequest');
    const recipe = { ...sc, name: body.name, cost: r2(Number(body.cost)), price: r2(Number(body.price)), ingredients: body.ingredients || '', margin: Math.round((Number(body.price) - Number(body.cost)) / Number(body.price) * 100), createdBy: db.me.username };
    db.recipes.unshift(recipe); localPersist(); return { recipe };
  }
  if (path === '/api/geidea/import' && method === 'POST') {
    const sc = scope();
    const total = r2(Number(body.total) || 0);
    const count = Number(body.count) || 0;
    const rec = { ...sc, total, count, avg: count ? r2(total / count) : 0, period: body.period || '', fileName: body.fileName || '', importedAt: now() };
    const idx = db.geidea.findIndex(x => x.brand === sc.brand && x.branch === sc.branch);
    if (idx >= 0) db.geidea[idx] = rec; else db.geidea.unshift(rec);
    db.imports.unshift({ ...sc, at: rec.importedAt, total, count, period: rec.period, fileName: rec.fileName });
    localAudit('import', `Geidea ${rec.fileName} — ${count} rows, ${total}`);
    localPersist(); return { record: rec };
  }

  // ---- attendance ----
  if (path === '/api/attendance/checkin' && method === 'POST') {
    const sc = scope();
    if (!body.employee) fail('badRequest');
    if (db.attendance.find(x => x.brand === sc.brand && x.branch === sc.branch && x.employee === body.employee && !x.checkOutAt)) fail('alreadyCheckedIn', 409);
    const row = { ...sc, employee: body.employee, shift: body.shift || '', checkInAt: now(), checkOutAt: '', hoursWorked: 0, overtime: 0, createdBy: db.me.username };
    db.attendance.unshift(row); localPersist(); return { row };
  }
  if (path === '/api/attendance/checkout' && method === 'POST') {
    const sc = scope();
    const row = db.attendance.find(x => x.brand === sc.brand && x.branch === sc.branch && x.employee === body.employee && !x.checkOutAt);
    if (!row) fail('notFound', 404);
    row.checkOutAt = now();
    const hours = Math.max(0, (new Date(row.checkOutAt) - new Date(row.checkInAt)) / 3600000);
    row.hoursWorked = r2(hours);
    row.overtime = r2(Math.max(0, hours - localShiftHours(row.shift)));
    localPersist(); return { row };
  }

  // ---- stock ----
  if (path === '/api/stock/items' && method === 'POST') {
    if (!body.name) fail('badRequest');
    const item = { id: ++db.stockSeq, name: body.name, unit: body.unit || 'pcs', qty: Number(body.qty) || 0, reorderLevel: Number(body.reorderLevel) || 0 };
    db.stock.push(item); localPersist(); return { item };
  }
  if (path === '/api/stock/moves' && method === 'POST') {
    const item = db.stock.find(x => x.id === Number(body.id));
    if (!item || !['purchase', 'waste', 'adjust'].includes(body.type)) fail('badRequest');
    const qty = Number(body.qty) || 0;
    if (body.type === 'purchase') item.qty = r2(item.qty + qty);
    else if (body.type === 'waste') item.qty = r2(Math.max(0, item.qty - qty));
    else item.qty = r2(qty);
    db.stockMoves.unshift({ id: ++db.stockSeq, itemId: item.id, name: item.name, unit: item.unit, type: body.type, qty, note: body.note || '', at: now(), by: db.me.username });
    localAudit('stock-move', `${body.type} ${qty} ${item.unit} — ${item.name}`);
    localPersist(); return { item };
  }

  // ---- menu ----
  if (path === '/api/menu/items' && method === 'POST') {
    const sc = scope();
    if (!body.name_en || !body.name_ar || !(Number(body.price) > 0)) fail('badRequest');
    const item = { id: ++db.menuSeq, brand: sc.brand, name_ar: body.name_ar, name_en: body.name_en, name_fr: body.name_fr || body.name_en, name_es: body.name_es || body.name_en, name_tr: body.name_tr || body.name_en, price: r2(Number(body.price)), prep: Number(body.prep) || 10, active: true, createdBy: db.me.username };
    db.menu.push(item); localPersist(); return { item };
  }
  m = path.match(/^\/api\/menu\/items\/(\d+)$/);
  if (m && method === 'POST') {
    const item = db.menu.find(x => x.id === Number(m[1]));
    if (!item) fail('notFound', 404);
    if (body._delete === true) { db.menu = db.menu.filter(x => x.id !== item.id); localPersist(); return { ok: true }; }
    if (Number(body.price) > 0) item.price = r2(Number(body.price));
    if (Number(body.prep) > 0) item.prep = Number(body.prep);
    if (typeof body.active === 'boolean') item.active = body.active;
    localPersist(); return { item };
  }

  // ---- users / settings ----
  if (path === '/api/users' && method === 'POST') {
    if (db.me.role !== 'admin') fail('forbidden', 403);
    if (!body.username || db.users.find(u => u.username === body.username)) fail('duplicate', 409);
    const u = { username: body.username, name: body.name || body.username, role: ['admin', 'manager', 'cashier'].includes(body.role) ? body.role : 'cashier', active: true };
    db.users.push(u); localPersist(); return { user: u };
  }
  m = path.match(/^\/api\/users\/([\w.-]+)\/(update|password)$/);
  if (m && method === 'POST') {
    if (db.me.role !== 'admin') fail('forbidden', 403);
    const u = db.users.find(x => x.username === m[1]);
    if (!u) fail('notFound', 404);
    if (m[2] === 'update') {
      if (['admin', 'manager', 'cashier'].includes(body.role)) u.role = body.role;
      if (typeof body.active === 'boolean') u.active = body.active;
      if (body.name) u.name = body.name;
    }
    localPersist(); return { user: u };
  }
  if (path === '/api/settings' && method === 'POST') {
    if (db.me.role !== 'admin') fail('forbidden', 403);
    if (body.company) db.settings.company = body.company;
    if (body.currency) db.settings.currency = body.currency;
    if (body.taxRate !== undefined && body.taxRate !== null) db.settings.taxRate = Math.max(0, Math.min(50, Number(body.taxRate) || 0));
    if (body.printerCopies) Object.assign(db.settings.printerCopies, body.printerCopies);
    localPersist(); return { settings: db.settings };
  }
  if (path === '/api/settings/printer-copies' && method === 'POST') {
    Object.assign(db.settings.printerCopies || (db.settings.printerCopies = {}), body);
    localPersist(); return { settings: db.settings };
  }
  if (path === '/api/settings/branches' && method === 'POST') {
    if (db.me.role !== 'admin') fail('forbidden', 403);
    if (!body.brand || !body.branch) fail('badRequest');
    if (!db.settings.brands[body.brand]) db.settings.brands[body.brand] = [];
    if (!db.settings.brands[body.brand].includes(body.branch)) db.settings.brands[body.brand].push(body.branch);
    localPersist(); return { settings: db.settings };
  }
  if (path === '/api/migrate-legacy') return { count: 0 };

  fail('notFound', 404);
}

function localReset() {
  localDb = localSeed();
  localPersist();
}

if (typeof module !== 'undefined') {
  module.exports = { localApi, localSeed, localReset };
}
