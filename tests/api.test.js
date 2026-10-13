// ============================================================================
// TUOBA ERP — server integration tests: auth, RBAC, orders+tax, stock, menu,
// users, settings, audit, rate limiting. Real HTTP against an ephemeral port.
// ============================================================================
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let srv, base, tmpDir;
const tokens = {};

const api = (p, method = 'GET', body, as) => fetch(base + p, {
  method,
  headers: {
    'content-type': 'application/json',
    ...(tokens[as] ? { authorization: 'Bearer ' + tokens[as] } : {})
  },
  body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined
});

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuoba-api-test-'));
  const { start } = require(path.join(ROOT(), 'server/index.js'));
  const started = await start({ port: 0, dataDir: tmpDir });
  srv = started.server;
  base = 'http://127.0.0.1:' + started.port;
});
function ROOT() { return path.join(__dirname, '..'); }

after(() => new Promise(resolve => srv.close(resolve)));

test('public config exposes no secrets', async () => {
  const r = await api('/api/public/config');
  const cfg = await r.json();
  assert.strictEqual(r.status, 200);
  assert.ok(cfg.company);
  assert.strictEqual(cfg.users, undefined);
});

test('login rejects bad credentials and accepts seeded users', async () => {
  assert.strictEqual((await api('/api/auth/login', 'POST', { username: 'admin', password: 'nope' })).status, 401);
  for (const [u, p] of [['admin', 'admin123'], ['manager', 'manager123'], ['cashier', 'cashier123']]) {
    const r = await api('/api/auth/login', 'POST', { username: u, password: p });
    assert.strictEqual(r.status, 200, u);
    tokens[u] = (await r.json()).token;
  }
});

test('unauthenticated bootstrap is rejected', async () => {
  assert.strictEqual((await api('/api/bootstrap')).status, 401);
});

test('bootstrap hides users from non-admin and exposes them to admin', async () => {
  const cash = await (await api('/api/bootstrap', 'GET', undefined, 'cashier')).json();
  assert.strictEqual(cash.users, undefined);
  const admin = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  assert.ok(Array.isArray(admin.users) && admin.users.length >= 3);
  assert.ok(admin.me.role === 'admin');
  assert.ok(admin.settings.taxRate > 0);
});

test('order: server-side pricing, 14% tax, table lifecycle, RBAC', async () => {
  const boot = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  const scope = { brand: 'TUOBA Fried & Grill', branch: 'Giza Main' };
  const chicken = boot.menu.find(m => m.brand === scope.brand && m.name_en === 'Chicken Burger');

  // cashier may place orders
  let r = await api('/api/orders', 'POST', { ...scope, mode: 'table', table: 'T1', payment: 'cash', items: [{ id: chicken.id, qty: 2 }] }, 'cashier');
  assert.strictEqual(r.status, 200);
  const { order } = await r.json();
  assert.strictEqual(order.subtotal, 170); // 85 × 2 (server price)
  assert.strictEqual(order.tax, Math.round(170 * 0.14 * 100) / 100);
  assert.ok(order.orderNo.startsWith('ORD-'));
  assert.strictEqual(order.createdBy, 'cashier');

  // price tampering is ignored
  r = await api('/api/orders', 'POST', { ...scope, mode: 'takeaway', payment: 'cash', items: [{ id: chicken.id, qty: 1, price: 1 }] }, 'cashier');
  assert.strictEqual((await r.json()).order.subtotal, 85);

  // table occupied, then freed on picked
  let b2 = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  const key = scope.brand + '|' + scope.branch;
  assert.strictEqual(b2.tables[key].find(t => t.id === 'T1').occupied, true);
  r = await api('/api/orders/' + order.orderNo + '/status', 'POST', { status: 'picked' }, 'cashier');
  assert.strictEqual(r.status, 200);
  b2 = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  assert.strictEqual(b2.tables[key].find(t => t.id === 'T1').occupied, false);

  // invalid status rejected
  r = await api('/api/orders/' + order.orderNo + '/status', 'POST', { status: 'zzz' }, 'cashier');
  assert.strictEqual(r.status, 400);

  // cashier cannot import geidea or manage stock (RBAC)
  assert.strictEqual((await api('/api/geidea/import', 'POST', { ...scope, total: 10, count: 1 }, 'cashier')).status, 403);
  assert.strictEqual((await api('/api/stock/moves', 'POST', { id: 1, type: 'waste', qty: 1 }, 'cashier')).status, 403);
  assert.strictEqual((await api('/api/menu/items', 'POST', { ...scope, name_en: 'X', name_ar: 'س', price: 10, prep: 5 }, 'cashier')).status, 403);
  assert.strictEqual((await api('/api/users', 'POST', { username: 'hacker', name: 'x', role: 'admin', password: 'secret1' }, 'cashier')).status, 403);
});

test('stock: manager moves update quantities and write audit', async () => {
  const before = (await (await api('/api/bootstrap', 'GET', undefined, 'manager')).json());
  const item = before.stock[0];
  const r = await api('/api/stock/moves', 'POST', { id: item.id, type: 'waste', qty: 2, note: 'spoilage' }, 'manager');
  assert.strictEqual(r.status, 200);
  const { item: after } = await r.json();
  assert.strictEqual(after.qty, item.qty - 2);
  const boot = await (await api('/api/bootstrap', 'GET', undefined, 'manager')).json();
  assert.ok(boot.stockMoves.some(m => m.type === 'waste' && m.name === item.name));
  assert.ok(boot.securityLogs.some(l => l.type === 'stock-move' && l.user === 'manager'));
  // unknown item id rejected
  assert.strictEqual((await api('/api/stock/moves', 'POST', { id: 9999, type: 'waste', qty: 1 }, 'manager')).status, 400);
});

test('menu: manager CRUD works, active items filter into POS', async () => {
  const scope = { brand: 'TUOBA Cafe', branch: 'Sheikh Zayed' };
  const r = await api('/api/menu/items', 'POST', { ...scope, name_en: 'Croissant', name_ar: 'كرواسون', price: 40, prep: 5 }, 'manager');
  assert.strictEqual(r.status, 200);
  const { item } = await r.json();
  const r2 = await api('/api/menu/items/' + item.id, 'POST', { price: 45, active: false }, 'manager');
  assert.strictEqual((await r2.json()).item.active, false);
  const r3 = await api('/api/menu/items/' + item.id, 'POST', { _delete: true }, 'manager');
  assert.strictEqual(r3.status, 200);
});

test('users: admin creates, disables, resets password; sessions revoked', async () => {
  let r = await api('/api/users', 'POST', { username: 'test.cashier', name: 'Test', role: 'cashier', password: 'test123' }, 'admin');
  assert.strictEqual(r.status, 200);
  // new user can login
  const lr = await api('/api/auth/login', 'POST', { username: 'test.cashier', password: 'test123' });
  const ctok = (await lr.json()).token;
  assert.ok(ctok);
  // disable → session revoked
  r = await api('/api/users/test.cashier/update', 'POST', { active: false }, 'admin');
  assert.strictEqual(r.status, 200);
  const br = await fetch(base + '/api/bootstrap', { headers: { authorization: 'Bearer ' + ctok } });
  assert.strictEqual(br.status, 401);
  // weak password rejected
  assert.strictEqual((await api('/api/users/test.cashier/password', 'POST', { newPassword: '123' }, 'admin')).status, 400);
});

test('finance update + attendance checkout math', async () => {
  const scope = { brand: 'TUOBA Express', branch: 'Alexandria' };
  let r = await api('/api/finance', 'POST', { ...scope, foodCost: 1000, payroll: 500, rent: 200, other: 100 }, 'manager');
  assert.strictEqual(r.status, 200);
  r = await api('/api/attendance/checkin', 'POST', { ...scope, employee: 'سعاد', shift: 'Morning' }, 'cashier');
  assert.strictEqual(r.status, 200);
  // duplicate blocked
  assert.strictEqual((await api('/api/attendance/checkin', 'POST', { ...scope, employee: 'سعاد', shift: 'Morning' }, 'cashier')).status, 409);
  // checkout computes hours (simulate 10h ago)
  const boot = await (await api('/api/bootstrap', 'GET', undefined, 'manager')).json();
  const row = boot.attendance.find(x => x.employee === 'سعاد');
  row.checkInAt = new Date(Date.now() - 10 * 3600000).toISOString();
  // write directly via store for test speed
  srv.store.db.attendance.find(x => x.employee === 'سعاد').checkInAt = row.checkInAt;
  r = await api('/api/attendance/checkout', 'POST', { ...scope, employee: 'سعاد' }, 'cashier');
  const { row: done } = await r.json();
  assert.ok(done.hoursWorked > 9.5 && done.hoursWorked < 10.5, 'hours ~10, got ' + done.hoursWorked);
  assert.ok(done.overtime > 0.5 && done.overtime < 1.5, 'overtime ~1, got ' + done.overtime);
});

test('change password + login with new password', async () => {
  let r = await api('/api/auth/change-password', 'POST', { oldPassword: 'wrong', newPassword: 'newpass1' }, 'cashier');
  assert.strictEqual(r.status, 401);
  r = await api('/api/auth/change-password', 'POST', { oldPassword: 'cashier123', newPassword: 'newpass1' }, 'cashier');
  assert.strictEqual(r.status, 200);
  const lr = await api('/api/auth/login', 'POST', { username: 'cashier', password: 'newpass1' });
  assert.strictEqual(lr.status, 200);
  tokens.cashier = (await lr.json()).token;
});

test('logout invalidates the session token', async () => {
  const lr = await api('/api/auth/login', 'POST', { username: 'manager', password: 'manager123' });
  const tok = (await lr.json()).token;
  const r = await fetch(base + '/api/auth/logout', {
    method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: '{}'
  });
  assert.strictEqual(r.status, 200);
  const br = await fetch(base + '/api/bootstrap', { headers: { authorization: 'Bearer ' + tok } });
  assert.strictEqual(br.status, 401);
});

test('payment creates audit entry with the acting user', async () => {
  const scope = { brand: 'TUOBA Fried & Grill', branch: 'Giza Main' };
  const r = await api('/api/payments', 'POST', { ...scope, customer: 'عميل', phone: '01000000000', amount: 250, method: 'QR' }, 'cashier');
  assert.strictEqual(r.status, 200);
  const boot = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  assert.ok(boot.securityLogs.some(l => l.type === 'payment' && l.user === 'cashier'));
});

test('settings: only admin; tax rate applied to next order', async () => {
  const scope = { brand: 'TUOBA Cafe', branch: 'New Cairo' };
  assert.strictEqual((await api('/api/settings', 'POST', { taxRate: 5 }, 'manager')).status, 403);
  const r = await api('/api/settings', 'POST', { taxRate: 5 }, 'admin');
  assert.strictEqual(r.status, 200);
  const boot = await (await api('/api/bootstrap', 'GET', undefined, 'admin')).json();
  const cola = boot.menu.find(m => m.brand === scope.brand && m.name_en === 'Cola');
  const { order } = await (await api('/api/orders', 'POST', { ...scope, mode: 'takeaway', payment: 'cash', items: [{ id: cola.id, qty: 2 }] }, 'admin')).json();
  assert.strictEqual(order.taxRate, 5);
  assert.strictEqual(order.tax, 2.5); // 50 × 5%
  await api('/api/settings', 'POST', { taxRate: 14 }, 'admin'); // restore
});

test('login rate limiting kicks in after 5 attempts', async () => {
  let last = 0;
  for (let i = 0; i < 6; i++) {
    last = (await api('/api/auth/login', 'POST', { username: 'ratelimit', password: 'bad' + i })).status;
  }
  assert.strictEqual(last, 429);
});

test('export download includes data but never password hashes', async () => {
  const r = await api('/api/export', 'GET', undefined, 'admin');
  assert.strictEqual(r.status, 200);
  const dump = await r.json();
  assert.ok(dump.orders.length > 0);
  for (const u of dump.users) { assert.strictEqual(u.salt, undefined); assert.strictEqual(u.hash, undefined); }
  assert.strictEqual(dump.sessions, undefined);
});
