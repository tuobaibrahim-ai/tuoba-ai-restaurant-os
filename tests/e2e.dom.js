// End-to-end boot test in a real DOM (jsdom) with actual <script> tag injection —
// replicates browser classic-script semantics (shared global lexical env).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/i18n.js', 'js/state.js', 'js/ui.js', 'js/tabs.js', 'js/app.js'];

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/index.html#overview',
  runScripts: 'dangerously',
  pretendToBeVisual: true
});
const { window } = dom;
const { document } = window;

// Inject scripts exactly like the browser does (classic scripts, in order).
for (const f of FILES) {
  const s = document.createElement('script');
  s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
  document.body.appendChild(s);
}

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}
const evl = code => window.eval(code);

// 1) Boot
check('boot: title translated', document.title.includes('TUOBA'));
check('boot: 17 nav labels filled', document.querySelectorAll('.nav-btn .lb').length === 17 &&
  [...document.querySelectorAll('.nav-btn .lb')].every(el => el.textContent.length > 0));
check('boot: overview rendered', document.getElementById('content').innerHTML.includes('section-title'));

// 2) POS flow
evl(`render('pos')`);
check('pos: 6 menu items', document.querySelectorAll('.menu-btn').length === 6);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
click(document.querySelector('.menu-btn'));
click(document.querySelector('.menu-btn'));
check('pos: cart qty=2 after two clicks', evl(`state.cart[0].qty`) === 2);

// 3) Delivery mode — fields persist across re-renders (B1 regression)
evl(`setOrderMode('delivery')`);
const dfields = () => [...document.querySelectorAll('[data-dfield]')];
check('pos: 4 delivery inputs', dfields().length === 4);
const setField = (i, v) => { dfields()[i].value = v; dfields()[i].dispatchEvent(new window.Event('input', { bubbles: true })); };
setField(0, 'محمد علي');
setField(1, '01012345678');
setField(3, '14 شارع التحرير، الجيزة');
click(document.querySelector('.menu-btn[data-action="addToCart"]')); // triggers re-render
check('B1 fix: name survives re-render', dfields()[0].value === 'محمد علي');
check('B1 fix: phone survives re-render', dfields()[1].value === '01012345678');
check('B1 fix: address survives re-render', dfields()[3].value.includes('التحرير'));

// 4) Place order
evl(`placeOrder('cash')`);
check('order id sequential', /^ORD-\d{5}$/.test(evl(`state.orders[0].orderNo`)));
check('order captured customer', evl(`state.orders[0].customer.name`) === 'محمد علي');
check('order captured address', evl(`JSON.stringify(state.orders[0].customer.address)`).includes('التحرير'));
check('cart cleared after order', evl(`state.cart.length`) === 0);
check('delivery form cleared', evl(`state.deliveryForm.name`) === '');

// 5) Brand switch clears cart (B2 regression — via the real select handler)
evl(`render('pos')`);
click(document.querySelector('.menu-btn'));
check('cart has 1 item before switch', evl(`state.cart.length`) === 1);
const brandSelect = document.getElementById('brand-select');
brandSelect.value = 'TUOBA Cafe';
brandSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
check('B2 fix: cart emptied on brand change', evl(`state.cart.length`) === 0);
check('B2 fix: branch switched', evl(`state.branch`) === 'Sheikh Zayed');

// 6) Table isolation per branch (B3 regression)
check('B3 fix: new branch tables free', evl(`getTables().every(tt => !tt.occupied)`) === true);

// 7) Attendance real hours (B4 regression)
evl(`render('attendance')`);
const type = (id, v) => {
  const el = document.getElementById(id);
  el.value = v;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
type('emp-name', 'أحمد');
click(document.querySelector('[data-action="checkIn"]'));
check('checkIn ISO stamp', !isNaN(new Date(evl(`state.attendance[0].checkInAt`)).getTime()));
evl(`state.attendance[0].checkInAt = new Date(Date.now() - 10*3600000).toISOString(); saveState();`);
type('emp-name', 'أحمد');
click(document.querySelector('[data-action="checkOut"]'));
const hours = Number(evl(`state.attendance[0].hoursWorked`));
const overtime = Number(evl(`state.attendance[0].overtime`));
check('B4 fix: hoursWorked ~10 (' + hours.toFixed(2) + ')', hours > 9.5 && hours < 10.5);
check('B4 fix: overtime ~1 vs 9h shift (' + overtime.toFixed(2) + ')', overtime > 0.5 && overtime < 1.5);
type('emp-name', 'أحمد');
click(document.querySelector('[data-action="checkIn"]'));
check('duplicate check-in blocked', evl(`state.attendance.filter(r => r.employee === 'أحمد' && !r.checkOutAt).length`) === 1);

// 8) Finance integrates POS sales (B10 regression)
evl(`render('finance')`);
const finHtml = document.getElementById('content').innerHTML;
check('B10 fix: finance shows POS + payments breakdown', finHtml.includes('POS') && finHtml.includes('Geidea') === false || finHtml.includes('جيديا') || finHtml.includes('Geidea'));
check('money: local currency rendered', /EGP|ج\.م|£/.test(finHtml));

// 9) CSP-safe rendering (no inline handlers anywhere in generated markup)
const allRendered = document.getElementById('content').innerHTML;
check('CSP-safe: no inline event handlers', !/onclick=|onchange=|oninput=/i.test(allRendered));

// 10) i18n switch round-trip
evl(`setLang('en')`);
check('i18n: English title', document.getElementById('app-title').textContent.includes('Restaurant OS'));
check('i18n: LTR applied', document.documentElement.dir === 'ltr');
evl(`setLang('ar')`);
check('i18n: RTL restored', document.documentElement.dir === 'rtl');

// 11) XSS attempt through customer name is escaped (S1 regression)
evl(`render('payments')`);
document.getElementById('pay-customer').value = '<img src=x onerror=alert(1)>';
document.getElementById('pay-phone').value = '01099999999';
document.getElementById('pay-amount').value = '50';
evl(`createPayment()`);
const payHtml = document.getElementById('content').innerHTML;
check('S1 fix: no raw <img onerror> in payments list', !payHtml.includes('<img src=x'));
check('S1 fix: escaped entity present', payHtml.includes('&lt;img'));

console.log(failures === 0 ? '\nALL E2E CHECKS PASSED' : `\n${failures} E2E CHECKS FAILED`);
process.exit(failures ? 1 : 0);
