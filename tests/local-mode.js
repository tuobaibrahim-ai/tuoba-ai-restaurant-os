// E2E: with NO server at all (every fetch fails), the login gate still works
// through the local fallback engine, and core flows function.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/i18n.js', 'js/state.js', 'js/local.js', 'js/api.js', 'js/ui.js', 'js/tabs.js', 'js/modules.js', 'js/app.js'];

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}

(async () => {
  // Static files served from disk (no server needed for assets in this sim;
  // the page itself would be cached/open statically).
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://offline.invalid/index.html', runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;

  // EVERY network request fails — the server is gone.
  window.fetch = () => Promise.reject(new TypeError('Failed to fetch'));

  for (const f of FILES) {
    const s = document.createElement('script');
    s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
    document.body.appendChild(s);
  }
  const evl = c => window.eval(c);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  await sleep(800);
  check('local: gate renders without server', !document.getElementById('login-root').hidden);
  check('local: local-mode badge shown', document.getElementById('login-root').textContent.includes(evl(`t('localBadge')`)));

  document.getElementById('login-user').value = 'admin';
  document.getElementById('login-pass').value = 'admin123';
  click(document.getElementById('login-btn'));
  await sleep(800);
  check('local: LOGIN WORKS with zero server', !document.getElementById('app-shell').hidden);
  check('local: role = admin', evl(`me().role`) === 'admin');

  // place an order locally with tax math
  evl(`render('pos')`);
  click(document.querySelector('.menu-btn')); await sleep(80);
  click(document.querySelector('.menu-btn')); await sleep(80);
  evl(`ui.currentMode = 'takeaway'`);
  click(document.querySelector('[data-action="placeOrder"]'));
  await sleep(300);
  const o = evl(`state.orders[0]`);
  check('local: order created (2×85 + 14% = 193.8)', o && o.subtotal === 170 && Math.abs(o.total - 193.8) < 0.01);

  // stock move works
  evl(`render('inventory')`);
  const q0 = evl(`state.stock[0].qty`);
  evl(`(async () => { try { const r = await api('/api/stock/moves', 'POST', { id: state.stock[0].id, type: 'waste', qty: 2 }); state.stock[0] = r.item; } catch (e) { window.__mvErr = e.code; } })()`);
  await sleep(300);
  check('local: stock move applied', evl(`state.stock[0].qty`) === q0 - 2 && !evl(`window.__mvErr`));

  // persistence: data survives a simulated reload (localStorage intact)
  const saved = evl(`localStorage.getItem('tuoba-erp-local-db')`);
  check('local: db persisted to localStorage', !!saved && saved.includes('"orders"'));

  // wrong creds message correct in local mode too
  click(document.getElementById('logout-btn'));
  await sleep(400);
  document.getElementById('login-user').value = 'admin';
  document.getElementById('login-pass').value = 'WRONG';
  click(document.getElementById('login-btn'));
  await sleep(400);
  const err = document.getElementById('login-err').textContent;
  check('local: wrong-creds message correct', err.length > 3);

  console.log(failures === 0 ? '\nLOCAL-MODE SUITE: ALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
