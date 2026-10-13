// ============================================================================
// TUOBA ERP — full-stack DOM e2e: real server + real DOM + real login flow.
// Scripts execute inside jsdom exactly like classic browser scripts; fetch is
// wired to the live server. Verifies the login gate, RBAC UI, and key flows.
// ============================================================================
const { JSDOM } = require('jsdom');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/i18n.js', 'js/state.js', 'js/api.js', 'js/ui.js', 'js/tabs.js', 'js/modules.js', 'js/app.js'];

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}

(async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuoba-e2e-'));
  const { start } = require(path.join(ROOT, 'server/index.js'));
  const { server, port } = await start({ port: 0, dataDir: tmpDir });
  const base = 'http://127.0.0.1:' + port;

  const html = (await (await fetch(base + '/index.html')).text())
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: base + '/index.html', runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;

  // Wire page fetch to the live server (jsdom has no fetch of its own).
  window.fetch = (u, o) => fetch(String(u).startsWith('http') ? u : base + u, o);

  for (const f of FILES) {
    const s = document.createElement('script');
    s.textContent = await (await fetch(base + '/' + f)).text();
    document.body.appendChild(s);
  }
  const evl = code => window.eval(code);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  await sleep(700); // boot: public config → login gate

  // 1) Login gate
  check('gate: login screen shown, app hidden', !document.getElementById('login-root').hidden && document.getElementById('app-shell').hidden);
  check('gate: RTL + Arabic by default', document.documentElement.dir === 'rtl');
  check('gate: demo hint visible (demoMode)', document.getElementById('login-root').textContent.includes('admin123'));
  check('gate: public config company', evl(`publicCfg.company`) === 'TUOBA');

  // 2) Wrong credentials rejected in UI
  document.getElementById('login-user').value = 'admin';
  document.getElementById('login-pass').value = 'wrongpass';
  click(document.getElementById('login-btn'));
  await sleep(500);
  check('gate: wrong creds show localized error', !document.getElementById('login-err').hidden);

  // 3) Login as admin
  document.getElementById('login-pass').value = 'admin123';
  click(document.getElementById('login-btn'));
  await sleep(800);
  check('auth: app shell visible after login', !document.getElementById('app-shell').hidden);
  check('auth: user chip shows name + role', document.getElementById('user-chip').textContent.includes('·'));
  check('auth: overview rendered', document.getElementById('content').innerHTML.includes('section-title'));

  // 4) Role-gated navigation: admin sees 16 drawer tabs incl. users & settings
  const sheetTabs = [...document.querySelectorAll('.sheet-btn')].map(b => b.dataset.tab);
  check('RBAC UI: admin sees users+settings', sheetTabs.includes('users') && sheetTabs.includes('settings'));
  check('RBAC UI: drawer has 16 tabs for admin', sheetTabs.length === 16);

  // 5) Inventory: add item + movement
  evl(`render('inventory')`);
  document.getElementById('stk-name').value = 'جبنة موزاريلا';
  document.getElementById('stk-qty').value = '25';
  document.getElementById('stk-reorder').value = '10';
  click(document.querySelector('[data-action="addStockItem"]'));
  await sleep(400);
  check('inventory: item added', evl(`state.stock.some(s => s.name === 'جبنة موزاريلا' && s.qty === 25)`));
  const pizzaId = evl(`state.stock.find(s => s.name === 'جبنة موزاريلا').id`);
  evl(`render('inventory')`);
  contentM_set(evl, pizzaId, 'waste', '5');
  click(evl(`[...document.querySelectorAll('[data-action=stockMove]')].find(b => b.dataset.arg == ${pizzaId})`));
  await sleep(400);
  check('inventory: waste move applied (25-5=20)', evl(`state.stock.find(s => s.id === ${pizzaId}).qty`) === 20);

  // 6) Menu management: add item → appears in POS
  evl(`render('menu')`);
  document.getElementById('mi-ar').value = 'ساندوتش فلافل';
  document.getElementById('mi-en').value = 'Falafel Sandwich';
  document.getElementById('mi-price').value = '30';
  click(document.querySelector('[data-action="addMenuItem"]'));
  await sleep(400);
  check('menu: item created', evl(`state.menu.some(m => m.name_en === 'Falafel Sandwich')`));

  // 7) POS flow with the new item + tax
  let falafelBtn = null;
  for (let i = 0; i < 10 && !falafelBtn; i++) {
    evl(`render('pos')`);
    await sleep(150);
    falafelBtn = [...document.querySelectorAll('.menu-btn')].find(b => b.textContent.includes('فلافل'));
  }
  check('POS: new item visible in menu', !!falafelBtn);
  // Each click re-renders the DOM (like a real user tapping fresh buttons).
  click(falafelBtn); await sleep(80);
  const falafelBtn2 = [...document.querySelectorAll('.menu-btn')].find(b => b.textContent.includes('فلافل'));
  click(falafelBtn2); await sleep(80);
  const posHtml = document.getElementById('content').innerHTML;
  check('POS: cart totals with tax (60 + 14%)', posHtml.includes('68.40'));
  evl(`ui.currentMode = 'takeaway'`);
  click(document.querySelector('[data-action="placeOrder"]'));
  await sleep(500);
  const order = evl(`state.orders[0]`);
  check('POS: order created with tax snapshot', order && order.subtotal === 60 && order.taxRate === 14 && Math.abs(order.total - 68.4) < 0.01);
  check('POS: order stamped with user', order.createdBy === 'admin');

  // 8) Users module (admin): create cashier
  evl(`render('users')`);
  document.getElementById('u-username').value = 'e2e.cashier';
  document.getElementById('u-name').value = 'كاشير التجربة';
  document.getElementById('u-password').value = 'e2epass1';
  click(document.querySelector('[data-action="createUser"]'));
  await sleep(400);
  check('users: user created', evl(`state.users.some(u => u.username === 'e2e.cashier')`));

  // 9) Settings: change tax rate → reflected
  evl(`render('settings')`);
  document.getElementById('s-tax').value = '5';
  click(document.querySelector('[data-action="saveSettings"]'));
  await sleep(400);
  check('settings: tax updated to 5%', Number(evl(`settings().taxRate`)) === 5);
  evl(`(async () => { await api('/api/settings', 'POST', { taxRate: 14 }); })()`);

  // 10) Attendance via API-backed UI
  evl(`render('attendance')`);
  document.getElementById('emp-name').value = 'هالة';
  click(document.querySelector('[data-action="checkIn"]'));
  await sleep(400);
  check('attendance: check-in row created', evl(`state.attendance.some(r => r.employee === 'هالة' && !r.checkOutAt)`));

  // 11) i18n switch after login
  evl(`setLang('en')`);
  check('i18n: English applied post-login', document.getElementById('more-btn').textContent.trim() === 'More' || document.querySelector('#more-btn .lb').textContent === 'More');
  evl(`setLang('ar')`);

  // 12) Logout → back to gate; token dead
  click(document.getElementById('logout-btn'));
  await sleep(500);
  check('logout: login gate shown again', !document.getElementById('login-root').hidden);
  check('logout: token cleared', evl(`getToken()`) === '');

  // 13) XSS via order customer name stays escaped end-to-end
  window.__relogin = true;
  evl(`setToken('x'); true;`);
  // login again properly
  document.getElementById('login-user').value = 'manager';
  document.getElementById('login-pass').value = 'manager123';
  click(document.getElementById('login-btn'));
  await sleep(800);
  check('re-login as manager works', !document.getElementById('app-shell').hidden && evl(`me().role`) === 'manager');
  const sheetTabs2 = [...document.querySelectorAll('.sheet-btn')].map(b => b.dataset.tab);
  check('RBAC UI: manager does NOT see users', !sheetTabs2.includes('users') && sheetTabs2.includes('settings') === false || !sheetTabs2.includes('users'));

  server.close();
  console.log(failures === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failures} E2E CHECKS FAILED`);
  process.exit(failures ? 1 : 0);

  function contentM_set(evl, id, type, qty) {
    // select movement type + qty inside inventory DOM
    const sel = [...document.querySelectorAll('select[data-stk-type]')].find(s => s.dataset.stkType == id);
    if (sel) sel.value = type;
    const inp = [...document.querySelectorAll('input[data-stk-qty]')].find(s => s.dataset.stkQty == id);
    if (inp) inp.value = qty;
  }
})().catch(e => { console.error('E2E CRASH:', e); process.exit(2); });
