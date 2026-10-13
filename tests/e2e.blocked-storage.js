// E2E regression: login must succeed even when localStorage is BLOCKED
// (private mode / sandboxed preview iframe). Token lives in memory.
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuoba-blk-'));
  const { start } = require(path.join(ROOT, 'server/index.js'));
  const { server, port } = await start({ port: 0, dataDir: tmpDir });
  const base = 'http://127.0.0.1:' + port;

  const html = (await (await fetch(base + '/index.html')).text())
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { url: base + '/index.html', runScripts: 'dangerously', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;

  // Simulate a browser that blocks ALL localStorage access (throws like Safari ITP).
  const blockedErr = new Error('SecurityError: storage blocked');
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw blockedErr; }
  });

  window.fetch = (u, o) => fetch(String(u).startsWith('http') ? u : base + u, o);
  for (const f of FILES) {
    const s = document.createElement('script');
    s.textContent = await (await fetch(base + '/' + f)).text();
    document.body.appendChild(s);
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  await sleep(700);
  check('blocked storage: gate renders', !document.getElementById('login-root').hidden);
  check('blocked storage: probe detected', window.eval('publicCfg.storageBlocked') === true);

  document.getElementById('login-user').value = 'admin';
  document.getElementById('login-pass').value = 'admin123';
  click(document.getElementById('login-btn'));
  await sleep(900);
  check('blocked storage: LOGIN SUCCEEDS', !document.getElementById('app-shell').hidden);
  check('blocked storage: data loaded', window.eval('Array.isArray(state.orders)') === true);

  // In-page action still authorized (memory token) — place an order via API
  const orderOk = await window.eval(`(async () => {
    try {
      const item = state.menu[0];
      const r = await api('/api/orders', 'POST', { brand: state.brandSel, branch: state.branchSel, mode: 'takeaway', payment: 'cash', items: [{ id: item.id, qty: 1 }] });
      return r.order && r.order.orderNo.startsWith('ORD-');
    } catch (e) { return 'ERR:' + e.code; }
  })()`);
  await sleep(300);
  check('blocked storage: authenticated API calls work in-page', orderOk === true);

  // wrong password still shows the right localized error (no session-expiry confusion)
  click(document.getElementById('logout-btn'));
  await sleep(500);
  document.getElementById('login-user').value = 'admin';
  document.getElementById('login-pass').value = 'WRONG';
  click(document.getElementById('login-btn'));
  await sleep(600);
  const errTxt = document.getElementById('login-err').textContent;
  check('blocked storage: wrong-creds message correct', errTxt.length > 3 && !errTxt.includes('انتهت الجلسة') && !errTxt.includes('Session'));

  server.close();
  console.log(failures === 0 ? '\nBLOCKED-STORAGE SUITE: ALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(2); });
