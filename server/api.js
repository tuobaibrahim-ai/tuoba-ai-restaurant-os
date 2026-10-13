// ============================================================================
// TUOBA ERP — REST API: validation, RBAC, rate limiting, audit trail
// All state mutations go through here; the client never writes storage.
// ============================================================================
const { verifyPassword, hashPassword, newSessionToken, tokenHash } = require('./passwords');

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_RECEIPT_CHARS = 550000; // ~400KB base64 image
const ROLES = ['admin', 'manager', 'cashier'];
const ORDER_STATUSES = ['preparing', 'ready', 'picked'];
const CALL_STATUSES = ['new', 'assigned', 'out', 'delivered'];
const STOCK_MOVE_TYPES = ['purchase', 'waste', 'adjust'];

// ---------------------------------------------------------------- validators
function vStr(v, { min = 1, max = 200 } = {}) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length >= min && s.length <= max ? s : null;
}
function vNum(v, { min = -1e12, max = 1e12 } = {}) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}
function vEnum(v, list) { return list.includes(v) ? v : null; }
function round2(n) { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------- rate limit
const attempts = new Map();
function loginAllowed(key) {
  const now = Date.now();
  const arr = (attempts.get(key) || []).filter(ts => now - ts < 60000);
  attempts.set(key, arr);
  return arr.length < 5;
}
function loginFail(key) {
  const arr = attempts.get(key) || [];
  arr.push(Date.now());
  attempts.set(key, arr);
}

// ---------------------------------------------------------------- sessions
function issueSession(store, user) {
  const token = newSessionToken();
  store.db.sessions.push({
    hash: tokenHash(token), username: user.username,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  });
  store.save();
  return token;
}
function resolveUser(store, token) {
  if (!token) return null;
  const h = tokenHash(token);
  const sess = store.db.sessions.find(s => s.hash === h);
  if (!sess || new Date(sess.expiresAt).getTime() < Date.now()) return null;
  const user = store.db.users.find(u => u.username === sess.username);
  return user && user.active ? { username: user.username, name: user.name, role: user.role } : null;
}

// ---------------------------------------------------------------- RBAC
const ROLE_RANK = { cashier: 1, manager: 2, admin: 3 };
function can(user, minRole) { return user && ROLE_RANK[user.role] >= ROLE_RANK[minRole]; }

// ---------------------------------------------------------------- helpers
function tablesKey(brand, branch) { return brand + '|' + branch; }
function getTables(db, brand, branch) {
  const k = tablesKey(brand, branch);
  if (!Array.isArray(db.tables[k])) {
    db.tables[k] = Array.from({ length: 6 }, (_, i) => ({ id: 'T' + (i + 1), occupied: false }));
  }
  return db.tables[k];
}
function brandExists(settings, brand) { return Object.keys(settings.brands).includes(brand); }
function branchExists(settings, brand, branch) { return (settings.brands[brand] || []).includes(branch); }
function shiftHours(settings, shiftName) {
  const s = (settings.shifts || []).find(x => x.name === shiftName);
  if (!s) return 0;
  const [sh, sm] = String(s.start).split(':').map(Number);
  const [eh, em] = String(s.end).split(':').map(Number);
  const startH = (sh || 0) + (sm || 0) / 60;
  let endH = (eh || 0) + (em || 0) / 60;
  if (endH <= startH) endH += 24;
  return endH - startH;
}
function publicUser(u) { return { username: u.username, name: u.name, role: u.role, active: u.active }; }

// ---------------------------------------------------------------- main handler
function handle(store, ctx) {
  const { method, path, body = {}, user, ip } = ctx;
  const db = store.db;
  const S = () => db.settings;

  // ---------------- public config (pre-login, no secrets) ----------------
  if (method === 'GET' && path === '/api/public/config') {
    return { code: 200, json: { company: S().company, demoMode: !!S().demoMode } };
  }

  // ---------------- auth ----------------
  if (method === 'POST' && path === '/api/auth/login') {
    const username = vStr(body.username, { min: 3, max: 40 });
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password) return { code: 400, json: { error: 'badRequest' } };
    const key = ip + '|' + username;
    if (!loginAllowed(key)) return { code: 429, json: { error: 'tooManyAttempts' } };
    const u = db.users.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (!u || !verifyPassword(password, u.salt, u.hash)) {
      loginFail(key);
      store.audit({ type: 'login-fail', detail: username, user: username });
      store.save();
      return { code: 401, json: { error: 'wrongCreds' } };
    }
    if (!u.active) return { code: 403, json: { error: 'disabled' } };
    const token = issueSession(store, u);
    store.audit({ type: 'login', detail: u.username, user: u.username });
    store.save();
    return { code: 200, json: { token, user: publicUser(u) } };
  }

  // Everything below requires authentication.
  if (!user) return { code: 401, json: { error: 'unauthorized' } };

  if (method === 'POST' && path === '/api/auth/logout') {
    const h = tokenHash(ctx.token || '');
    db.sessions = db.sessions.filter(s => s.hash !== h);
    store.save();
    return { code: 200, json: { ok: true } };
  }

  if (method === 'POST' && path === '/api/auth/change-password') {
    const u = db.users.find(x => x.username === user.username);
    const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!u || !verifyPassword(oldPassword, u.salt, u.hash)) return { code: 401, json: { error: 'wrongCreds' } };
    if (newPassword.length < 6) return { code: 400, json: { error: 'passwordTooShort' } };
    const { salt, hash } = hashPassword(newPassword);
    u.salt = salt; u.hash = hash;
    store.audit({ type: 'password-change', detail: u.username, user: u.username });
    store.save();
    return { code: 200, json: { ok: true } };
  }

  if (method === 'GET' && path === '/api/bootstrap') {
    const out = {
      me: user,
      settings: S(),
      menu: db.menu,
      stock: db.stock,
      stockMoves: db.stockMoves.slice(0, 50),
      orders: db.orders,
      calls: db.calls,
      payments: db.payments,
      expenses: db.expenses,
      recipes: db.recipes,
      geidea: db.geidea,
      imports: db.imports,
      finance: db.finance,
      customers: db.customers,
      attendance: db.attendance,
      securityLogs: db.securityLogs,
      tables: db.tables,
      shifts: S().shifts || []
    };
    if (user.role === 'admin') out.users = db.users.map(publicUser);
    return { code: 200, json: out };
  }

  if (method === 'GET' && path === '/api/export') {
    if (!can(user, 'manager')) return { code: 403, json: { error: 'forbidden' } };
    const dump = { ...db };
    delete dump.sessions;
    dump.users = db.users.map(publicUser);
    store.audit({ type: 'export', detail: 'Data exported', user: user.username });
    store.save();
    return { code: 200, json: dump, download: 'tuoba-erp-export.json' };
  }

  const scoped = (req, minRole) => {
    if (!can(user, minRole)) return null;
    const brand = vStr(req.brand, { max: 60 });
    const branch = vStr(req.branch, { max: 60 });
    if (!brand || !branch || !brandExists(S(), brand) || !branchExists(S(), brand, branch)) return null;
    return { brand, branch };
  };

  // ---------------- POS orders ----------------
  if (method === 'POST' && path === '/api/orders') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const mode = vEnum(body.mode, ['table', 'takeaway', 'delivery']);
    if (!mode) return { code: 400, json: { error: 'badRequest' } };
    if (!Array.isArray(body.items) || body.items.length === 0) return { code: 400, json: { error: 'badRequest' } };
    // Server-side price resolution from the menu (no client price tampering).
    const items = [];
    for (const raw of body.items.slice(0, 60)) {
      const id = vNum(raw && raw.id);
      const qty = vNum(raw && raw.qty, { min: 1, max: 99 });
      const mi = db.menu.find(m => m.id === id && m.brand === sc.brand && m.active);
      if (!mi || !qty) return { code: 400, json: { error: 'badRequest' } };
      items.push({ id: mi.id, name_en: mi.name_en, name_ar: mi.name_ar, name_fr: mi.name_fr, name_es: mi.name_es, name_tr: mi.name_tr, price: mi.price, prep: mi.prep, qty });
    }
    let customer = null;
    if (mode === 'delivery') {
      const name = vStr(body.customer && body.customer.name, { max: 60 }) || '';
      const phone = vStr(body.customer && body.customer.phone, { min: 6, max: 20 });
      if (!phone) return { code: 400, json: { error: 'badRequest' } };
      customer = {
        name, phone,
        app: vStr(body.customer && body.customer.app, { max: 60 }) || '',
        address: vStr(body.customer && body.customer.address, { max: 300 }) || ''
      };
      const existing = db.customers.find(c => c.brand === sc.brand && c.branch === sc.branch && c.phone === customer.phone);
      if (existing) { existing.name = customer.name || existing.name; existing.lastPayment = 'delivery'; }
      else db.customers.unshift({ brand: sc.brand, branch: sc.branch, name: customer.name || 'Customer', phone: customer.phone, lastPayment: 'delivery' });
    }
    let table = '';
    if (mode === 'table') {
      const tid = vStr(body.table, { max: 10 });
      const t = getTables(db, sc.brand, sc.branch).find(x => x.id === tid);
      if (!t) return { code: 400, json: { error: 'badRequest' } };
      table = tid;
    }
    const subtotal = round2(items.reduce((a, b) => a + b.price * b.qty, 0));
    const taxRate = Math.min(50, Math.max(0, vNum(S().taxRate) || 0));
    const tax = round2(subtotal * taxRate / 100);
    const total = round2(subtotal + tax);
    const prepMinutes = Math.max(1, ...items.map(i => i.prep || 5), 5);
    const order = {
      brand: sc.brand, branch: sc.branch, orderNo: store.nextSeq('ORD'),
      mode, table, customer, payment: vEnum(body.payment, ['cash', 'card']) || 'cash',
      items, subtotal, taxRate, tax, total, prepMinutes,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      readyAt: new Date(Date.now() + prepMinutes * 60000).toISOString(),
      status: 'preparing',
      copies: {
        cashier: Number(S().printerCopies?.cashier) || 1,
        kitchen: Number(S().printerCopies?.kitchen) || 1,
        pickup: Number(S().printerCopies?.pickup) || 1
      }
    };
    db.orders.unshift(order);
    if (mode === 'table') {
      const t = getTables(db, sc.brand, sc.branch).find(x => x.id === table);
      if (t) t.occupied = true;
    }
    store.save();
    return { code: 200, json: { order } };
  }

  const orderStatus = path.match(/^\/api\/orders\/([\w-]+)\/status$/);
  if (method === 'POST' && orderStatus) {
    const status = vEnum(body.status, ORDER_STATUSES);
    if (!status) return { code: 400, json: { error: 'badRequest' } };
    const order = db.orders.find(o => o.orderNo === orderStatus[1]);
    if (!order) return { code: 404, json: { error: 'notFound' } };
    order.status = status;
    if (status === 'picked' && order.mode === 'table' && order.table) {
      const t = getTables(db, order.brand, order.branch).find(x => x.id === order.table);
      if (t) t.occupied = false;
    }
    store.save();
    return { code: 200, json: { order } };
  }

  // ---------------- Call center ----------------
  if (method === 'POST' && path === '/api/calls') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const phone = vStr(body.phone, { min: 6, max: 20 });
    const customerName = vStr(body.customerName, { max: 60 });
    const orderText = vStr(body.orderText, { max: 500 });
    if (!phone || !customerName || !orderText) return { code: 400, json: { error: 'badRequest' } };
    const prep = Math.max(1, Math.min(240, vNum(body.prep) || 20));
    const call = {
      ...sc, id: store.nextSeq('CC'), phone, customerName,
      type: vEnum(body.type, ['delivery', 'takeaway', 'table']) || 'delivery',
      zone: vStr(body.zone, { max: 60 }) || '',
      orderText, status: 'new', driver: '', createdBy: user.username,
      createdAt: new Date().toISOString(),
      readyAt: new Date(Date.now() + prep * 60000).toISOString()
    };
    db.calls.unshift(call);
    const existing = db.customers.find(c => c.brand === sc.brand && c.branch === sc.branch && c.phone === phone);
    if (existing) existing.lastPayment = 'CC';
    else db.customers.unshift({ brand: sc.brand, branch: sc.branch, name: customerName, phone, lastPayment: 'CC' });
    store.save();
    return { code: 200, json: { call } };
  }

  const callAction = path.match(/^\/api\/calls\/([\w-]+)\/(assign|status)$/);
  if (method === 'POST' && callAction) {
    const call = db.calls.find(c => c.id === callAction[1]);
    if (!call) return { code: 404, json: { error: 'notFound' } };
    if (callAction[2] === 'assign') {
      const driver = vStr(body.driver, { max: 60 });
      if (!driver) return { code: 400, json: { error: 'badRequest' } };
      call.driver = driver; call.status = 'assigned';
    } else {
      const status = vEnum(body.status, CALL_STATUSES);
      if (!status) return { code: 400, json: { error: 'badRequest' } };
      call.status = status;
    }
    store.save();
    return { code: 200, json: { call } };
  }

  // ---------------- Payments ----------------
  if (method === 'POST' && path === '/api/payments') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const customer = vStr(body.customer, { max: 60 });
    const phone = vStr(body.phone, { min: 6, max: 20 });
    const amount = vNum(body.amount, { min: 0.01, max: 1e9 });
    const method_ = vEnum(body.method, ['NFC', 'Card', 'QR', 'Cash', 'Wallet', 'Split']);
    if (!customer || !phone || !amount || !method_) return { code: 400, json: { error: 'badRequest' } };
    const payment = { ...sc, customer, phone, amount: round2(amount), method: method_, txId: store.nextSeq('TX'), at: new Date().toISOString(), createdBy: user.username };
    db.payments.unshift(payment);
    const existing = db.customers.find(c => c.brand === sc.brand && c.branch === sc.branch && c.phone === phone);
    if (existing) { existing.name = customer; existing.lastPayment = method_; }
    else db.customers.unshift({ ...sc, name: customer, phone, lastPayment: method_ });
    store.audit({ ...sc, type: 'payment', detail: `${method_} ${payment.txId} — ${amount.toFixed(2)}`, user: user.username });
    store.save();
    return { code: 200, json: { payment } };
  }

  // ---------------- Expenses ----------------
  if (method === 'POST' && path === '/api/expenses') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const title = vStr(body.title, { max: 80 });
    const amount = vNum(body.amount, { min: 0.01, max: 1e9 });
    if (!title || !amount) return { code: 400, json: { error: 'badRequest' } };
    let receiptData = typeof body.receiptData === 'string' && body.receiptData.startsWith('data:image/') ? body.receiptData : '';
    if (receiptData.length > MAX_RECEIPT_CHARS) return { code: 413, json: { error: 'tooLarge' } };
    const expense = {
      ...sc, title, amount: round2(amount),
      note: vStr(body.note, { max: 300 }) || '',
      receiptName: vStr(body.receiptName, { max: 120 }) || '',
      receiptData, at: new Date().toISOString(), createdBy: user.username
    };
    db.expenses.unshift(expense);
    store.save();
    return { code: 200, json: { expense } };
  }

  // ---------------- Recipes ----------------
  if (method === 'POST' && path === '/api/recipes') {
    const sc = scoped(body, 'manager');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const name = vStr(body.name, { max: 80 });
    const cost = vNum(body.cost, { min: 0.01 });
    const price = vNum(body.price, { min: 0.01 });
    if (!name || !cost || !price) return { code: 400, json: { error: 'badRequest' } };
    const recipe = {
      ...sc, name, cost: round2(cost), price: round2(price),
      ingredients: vStr(body.ingredients, { max: 500 }) || '',
      margin: Math.round(((price - cost) / price) * 100), createdBy: user.username
    };
    db.recipes.unshift(recipe);
    store.save();
    return { code: 200, json: { recipe } };
  }

  // ---------------- Geidea import ----------------
  if (method === 'POST' && path === '/api/geidea/import') {
    const sc = scoped(body, 'manager');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const total = vNum(body.total, { min: 0 });
    const count = vNum(body.count, { min: 0, max: 1e6 });
    if (total === null || count === null) return { code: 400, json: { error: 'badRequest' } };
    const at = new Date().toISOString();
    const rec = {
      ...sc, total: round2(total), count, avg: count ? round2(total / count) : 0,
      period: vStr(body.period, { max: 60 }) || '',
      fileName: vStr(body.fileName, { max: 120 }) || '', importedAt: at
    };
    const idx = db.geidea.findIndex(x => x.brand === sc.brand && x.branch === sc.branch);
    if (idx >= 0) db.geidea[idx] = rec; else db.geidea.unshift(rec);
    db.imports.unshift({ ...sc, at, total: rec.total, count, period: rec.period, fileName: rec.fileName });
    if (db.imports.length > 100) db.imports.length = 100;
    store.audit({ ...sc, type: 'import', detail: `Geidea ${rec.fileName} — ${count} rows, total ${rec.total}`, user: user.username });
    store.save();
    return { code: 200, json: { record: rec } };
  }

  // ---------------- Attendance ----------------
  if (method === 'POST' && path === '/api/attendance/checkin') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const employee = vStr(body.employee, { max: 60 });
    if (!employee) return { code: 400, json: { error: 'badRequest' } };
    if (db.attendance.find(x => x.brand === sc.brand && x.branch === sc.branch && x.employee === employee && !x.checkOutAt)) {
      return { code: 409, json: { error: 'alreadyCheckedIn' } };
    }
    const row = {
      ...sc, employee,
      shift: vStr(body.shift, { max: 40 }) || '',
      checkInAt: new Date().toISOString(), checkOutAt: '', hoursWorked: 0, overtime: 0,
      createdBy: user.username
    };
    db.attendance.unshift(row);
    store.save();
    return { code: 200, json: { row } };
  }

  if (method === 'POST' && path === '/api/attendance/checkout') {
    const sc = scoped(body, 'cashier');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const employee = vStr(body.employee, { max: 60 });
    const row = db.attendance.find(x => x.brand === sc.brand && x.branch === sc.branch && x.employee === employee && !x.checkOutAt);
    if (!row) return { code: 404, json: { error: 'notFound' } };
    row.checkOutAt = new Date().toISOString();
    const hours = Math.max(0, (new Date(row.checkOutAt).getTime() - new Date(row.checkInAt).getTime()) / 3600000);
    row.hoursWorked = round2(hours);
    row.overtime = round2(Math.max(0, hours - shiftHours(S(), row.shift)));
    store.save();
    return { code: 200, json: { row } };
  }

  // ---------------- Inventory ----------------
  if (method === 'POST' && path === '/api/stock/items') {
    if (!can(user, 'manager')) return { code: 403, json: { error: 'forbidden' } };
    const name = vStr(body.name, { max: 80 });
    const qty = vNum(body.qty, { min: 0 });
    const reorderLevel = vNum(body.reorderLevel, { min: 0 });
    if (!name || qty === null || reorderLevel === null) return { code: 400, json: { error: 'badRequest' } };
    const item = { id: store.nextStockId(), name, unit: vEnum(body.unit, ['kg', 'g', 'L', 'pcs', 'box']) || 'pcs', qty, reorderLevel };
    db.stock.push(item);
    store.audit({ type: 'stock-add', detail: `${name} qty ${qty}`, user: user.username });
    store.save();
    return { code: 200, json: { item } };
  }

  if (method === 'POST' && path === '/api/stock/moves') {
    if (!can(user, 'manager')) return { code: 403, json: { error: 'forbidden' } };
    const id = vNum(body.id);
    const type = vEnum(body.type, STOCK_MOVE_TYPES);
    const qty = vNum(body.qty, { min: 0.001, max: 1e6 });
    const item = db.stock.find(x => x.id === id);
    if (!item || !type || qty === null) return { code: 400, json: { error: 'badRequest' } };
    if (type === 'purchase') item.qty = round2(item.qty + qty);
    else if (type === 'waste') item.qty = round2(Math.max(0, item.qty - qty));
    else item.qty = round2(qty); // adjust: set absolute
    const move = { id: store.nextStockId(), itemId: item.id, name: item.name, unit: item.unit, type, qty, note: vStr(body.note, { max: 140 }) || '', at: new Date().toISOString(), by: user.username };
    db.stockMoves.unshift(move);
    if (db.stockMoves.length > 300) db.stockMoves.length = 300;
    store.audit({ type: 'stock-move', detail: `${type} ${qty} ${item.unit} — ${item.name}`, user: user.username });
    store.save();
    return { code: 200, json: { item, move } };
  }

  // ---------------- Menu management ----------------
  if (method === 'POST' && path === '/api/menu/items') {
    const sc = scoped(body, 'manager');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const name_en = vStr(body.name_en, { max: 60 });
    const name_ar = vStr(body.name_ar, { max: 60 });
    const price = vNum(body.price, { min: 0.5 });
    const prep = vNum(body.prep, { min: 1, max: 240 });
    if (!name_en || !name_ar || price === null || prep === null) return { code: 400, json: { error: 'badRequest' } };
    const item = {
      id: store.nextMenuId(), brand: sc.brand,
      name_ar, name_en,
      name_fr: vStr(body.name_fr, { max: 60 }) || name_en,
      name_es: vStr(body.name_es, { max: 60 }) || name_en,
      name_tr: vStr(body.name_tr, { max: 60 }) || name_en,
      price: round2(price), prep, active: true, createdBy: user.username
    };
    db.menu.push(item);
    store.save();
    return { code: 200, json: { item } };
  }

  const menuItemId = path.match(/^\/api\/menu\/items\/(\d+)$/);
  if (method === 'POST' && menuItemId) {
    if (!can(user, 'manager')) return { code: 403, json: { error: 'forbidden' } };
    const item = db.menu.find(m => m.id === Number(menuItemId[1]));
    if (!item) return { code: 404, json: { error: 'notFound' } };
    if (path.endsWith('/delete') || body._delete === true) {
      db.menu = db.menu.filter(m => m !== item);
      store.audit({ type: 'menu-delete', detail: item.name_en, user: user.username });
      store.save();
      return { code: 200, json: { ok: true } };
    }
    const price = vNum(body.price, { min: 0.5 });
    const prep = vNum(body.prep, { min: 1, max: 240 });
    const active = typeof body.active === 'boolean' ? body.active : item.active;
    if (price !== null) item.price = round2(price);
    if (prep !== null) item.prep = prep;
    item.active = active;
    const name_ar = vStr(body.name_ar, { max: 60 }); if (name_ar) item.name_ar = name_ar;
    const name_en = vStr(body.name_en, { max: 60 }); if (name_en) item.name_en = name_en;
    store.audit({ type: 'menu-update', detail: item.name_en, user: user.username });
    store.save();
    return { code: 200, json: { item } };
  }

  // ---------------- Finance ----------------
  if (method === 'POST' && path === '/api/finance') {
    const sc = scoped(body, 'manager');
    if (!sc) return { code: 403, json: { error: 'forbidden' } };
    const num = k => vNum(body[k], { min: 0, max: 1e10 });
    const rec = { foodCost: num('foodCost'), payroll: num('payroll'), rent: num('rent'), other: num('other') };
    if (Object.values(rec).some(v => v === null)) return { code: 400, json: { error: 'badRequest' } };
    let row = db.finance.find(x => x.brand === sc.brand && x.branch === sc.branch);
    if (!row) { row = { ...sc }; db.finance.push(row); }
    Object.assign(row, rec);
    store.save();
    return { code: 200, json: { row } };
  }

  // ---------------- Users (admin) ----------------
  if (method === 'POST' && path === '/api/users') {
    if (!can(user, 'admin')) return { code: 403, json: { error: 'forbidden' } };
    const username = vStr(body.username, { min: 3, max: 40 });
    const name = vStr(body.name, { max: 60 });
    const role = vEnum(body.role, ROLES);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !name || !role) return { code: 400, json: { error: 'badRequest' } };
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return { code: 400, json: { error: 'badRequest' } };
    if (password.length < 6) return { code: 400, json: { error: 'passwordTooShort' } };
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) return { code: 409, json: { error: 'duplicate' } };
    const { salt, hash } = hashPassword(password);
    const u = { username, name, role, salt, hash, active: true, createdAt: new Date().toISOString(), createdBy: user.username };
    db.users.push(u);
    store.audit({ type: 'user-create', detail: `${username} (${role})`, user: user.username });
    store.save();
    return { code: 200, json: { user: publicUser(u) } };
  }

  const userUpdate = path.match(/^\/api\/users\/([a-zA-Z0-9_.-]+)\/(update|password)$/);
  if (method === 'POST' && userUpdate) {
    if (!can(user, 'admin')) return { code: 403, json: { error: 'forbidden' } };
    const target = db.users.find(u => u.username === userUpdate[1]);
    if (!target) return { code: 404, json: { error: 'notFound' } };
    if (userUpdate[2] === 'update') {
      const role = vEnum(body.role, ROLES);
      if (role) target.role = role;
      if (typeof body.active === 'boolean') {
        if (target.username === user.username && !body.active) return { code: 400, json: { error: 'badRequest' } };
        target.active = body.active;
        if (!body.active) db.sessions = db.sessions.filter(s => s.username !== target.username);
      }
      const name = vStr(body.name, { max: 60 }); if (name) target.name = name;
      store.audit({ type: 'user-update', detail: target.username, user: user.username });
    } else {
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      if (newPassword.length < 6) return { code: 400, json: { error: 'passwordTooShort' } };
      const { salt, hash } = hashPassword(newPassword);
      target.salt = salt; target.hash = hash;
      store.audit({ type: 'user-password', detail: target.username, user: user.username });
    }
    store.save();
    return { code: 200, json: { user: publicUser(target) } };
  }

  // ---------------- Settings (admin) ----------------
  if (method === 'POST' && path === '/api/settings') {
    if (!can(user, 'admin')) return { code: 403, json: { error: 'forbidden' } };
    const company = vStr(body.company, { max: 60 });
    const currency = vEnum(body.currency, ['EGP', 'USD', 'EUR', 'SAR', 'AED', 'TRY']);
    const taxRate = vNum(body.taxRate, { min: 0, max: 50 });
    if (company) S().company = company;
    if (currency) S().currency = currency;
    if (taxRate !== null) S().taxRate = taxRate;
    if (typeof body.demoMode === 'boolean') S().demoMode = body.demoMode;
    if (body.printerCopies && typeof body.printerCopies === 'object') {
      const pc = S().printerCopies || {};
      ['cashier', 'kitchen', 'pickup'].forEach(k => {
        const n = vNum(body.printerCopies[k], { min: 1, max: 9 });
        if (n !== null) pc[k] = Math.floor(n);
      });
      S().printerCopies = pc;
    }
    store.audit({ type: 'settings', detail: 'Settings updated', user: user.username });
    store.save();
    return { code: 200, json: { settings: S() } };
  }

  if (method === 'POST' && path === '/api/settings/printer-copies') {
    if (!can(user, 'manager')) return { code: 403, json: { error: 'forbidden' } };
    const pc = S().printerCopies || {};
    ['cashier', 'kitchen', 'pickup'].forEach(k => {
      const n = vNum(body[k], { min: 1, max: 9 });
      if (n !== null) pc[k] = Math.floor(n);
    });
    S().printerCopies = pc;
    store.save();
    return { code: 200, json: { settings: S() } };
  }

  if (method === 'POST' && path === '/api/settings/branches') {
    if (!can(user, 'admin')) return { code: 403, json: { error: 'forbidden' } };
    const brand = vStr(body.brand, { max: 60 });
    const branch = vStr(body.branch, { max: 60 });
    if (!brand || !branch) return { code: 400, json: { error: 'badRequest' } };
    if (!brandExists(S(), brand)) {
      if (Object.keys(S().brands).length >= 12) return { code: 400, json: { error: 'tooMany' } };
      S().brands[brand] = [];
    } else if ((S().brands[brand] || []).length >= 12) {
      return { code: 400, json: { error: 'tooMany' } };
    }
    if (!branchExists(S(), brand, branch)) S().brands[brand].push(branch);
    store.audit({ type: 'branch-add', detail: `${brand} / ${branch}`, user: user.username });
    store.save();
    return { code: 200, json: { settings: S() } };
  }

  // ---------------- Legacy data migration (admin) ----------------
  if (method === 'POST' && path === '/api/migrate-legacy') {
    if (!can(user, 'admin')) return { code: 403, json: { error: 'forbidden' } };
    const legacy = body.legacy;
    if (!legacy || typeof legacy !== 'object') return { code: 400, json: { error: 'badRequest' } };
    let count = 0;
    const take = (arr, mapFn) => {
      if (!Array.isArray(arr)) return;
      for (const r of arr.slice(0, 500)) {
        try { db[collection].unshift(mapFn(r)); count++; } catch { /* skip bad rows */ }
      }
    };
    let collection;
    const scOf = r => ({ brand: vStr(r.brand, { max: 60 }) || Object.keys(S().brands)[0], branch: vStr(r.branch, { max: 60 }) || Object.values(S().brands)[0][0] });
    collection = 'orders'; take(legacy.orders, r => ({ ...scOf(r), orderNo: store.nextSeq('ORD'), mode: r.mode || 'takeaway', table: r.table || '', customer: r.customer || null, payment: r.payment || 'cash', items: Array.isArray(r.items) ? r.items : [], subtotal: Number(r.total) || 0, taxRate: 0, tax: 0, total: Number(r.total) || 0, prepMinutes: Number(r.prepMinutes) || 10, createdBy: 'legacy', createdAt: r.createdAt || new Date().toISOString(), readyAt: r.readyAt || new Date().toISOString(), status: r.status || 'picked', copies: { cashier: 1, kitchen: 1, pickup: 1 } }));
    collection = 'payments'; take(legacy.payments, r => ({ ...scOf(r), customer: vStr(r.customer, { max: 60 }) || '—', phone: vStr(r.phone, { min: 6, max: 20 }) || '0000000000', amount: Number(r.amount) || 0, method: vEnum(r.method, ['NFC', 'Card', 'QR', 'Cash', 'Wallet', 'Split']) || 'Cash', txId: store.nextSeq('TX'), at: r.at || new Date().toISOString(), createdBy: 'legacy' }));
    collection = 'expenses'; take(legacy.expenses, r => ({ ...scOf(r), title: vStr(r.title, { max: 80 }) || '—', amount: Number(r.amount) || 0, note: vStr(r.note, { max: 300 }) || '', receiptName: '', receiptData: '', at: new Date().toISOString(), createdBy: 'legacy' }));
    collection = 'attendance'; take(legacy.attendance, r => ({ ...scOf(r), employee: vStr(r.employee, { max: 60 }) || '—', shift: vStr(r.shift, { max: 40 }) || '', checkInAt: r.checkInAt || new Date().toISOString(), checkOutAt: r.checkOutAt || '', hoursWorked: Number(r.hoursWorked) || 0, overtime: Number(r.overtime) || 0, createdBy: 'legacy' }));
    store.audit({ type: 'legacy-import', detail: count + ' records', user: user.username });
    store.save();
    return { code: 200, json: { count } };
  }

  return { code: 404, json: { error: 'notFound' } };
}

module.exports = { handle, resolveUser, can };
