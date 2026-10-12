// ============================================================================
// TUOBA Restaurant OS — smoke & regression tests (node --test, zero deps)
// Boots the whole app in a VM sandbox with DOM stubs, then asserts the
// critical behaviors fixed in the v2 refactor.
// ============================================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/i18n.js', 'js/state.js', 'js/ui.js', 'js/tabs.js', 'js/app.js'];

function makeSandbox() {
  const elementStub = () => ({
    innerHTML: '', textContent: '', value: '', dataset: {}, style: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, removeAttribute() {},
    closest() { return null; }, querySelector() { return null; }, remove() {},
    appendChild() {}, click() {}, href: '', download: ''
  });
  const els = {};
  const localStorage = {
    store: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; }
  };
  const sandbox = {
    document: {
      getElementById: id => (els[id] = els[id] || elementStub()),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: () => elementStub(),
      body: { appendChild() {} },
      documentElement: { lang: '', dir: '' },
      title: '',
      addEventListener() {}
    },
    navigator: {},
    location: { hash: '' },
    history: { replaceState() {} },
    localStorage,
    alert() {}, confirm() { return true; }, prompt() { return ''; },
    setTimeout, clearTimeout, setInterval, clearInterval,
    structuredClone, console, URL, Blob: class {},
    setTimeout,
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  }
  // Expose lexical (const/let) bindings to the test via a follow-up script.
  vm.runInContext(`
    globalThis.__app = { I18N, state, parseCSV, parseAmount, esc, t, migrateState,
      branchFigures, nextSeq, STATUS_KEYS, fmtMoney, getTables, MENU };
  `, sandbox);
  return sandbox;
}

let app;

test('app boots without throwing and loads schema v2', () => {
  app = makeSandbox();
  assert.strictEqual(app.__app.state.schemaVersion, 2);
});

test('i18n parity: every ar key exists in en/fr/es/tr', () => {
  const { I18N } = app.__app;
  const base = Object.keys(I18N.ar);
  assert.ok(base.length > 80, 'ar dictionary should be substantial');
  for (const lang of ['en', 'fr', 'es', 'tr']) {
    for (const key of base) {
      assert.notStrictEqual(I18N[lang][key], undefined, `${lang}.${key} missing`);
    }
  }
});

test('esc() neutralizes XSS payloads', () => {
  const { esc } = app.__app;
  const out = esc('<img src=x onerror=alert(1)>');
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
});

test('CSV parser handles newlines inside quoted fields (v1 regression)', () => {
  const { parseCSV } = app.__app;
  const parsed = parseCSV('Date,Note,Amount\n2026-01-01,"multi\nline, note",50\n');
  assert.strictEqual(parsed.rows.length, 1);
  assert.strictEqual(parsed.rows[0]['Note'], 'multi\nline, note');
  assert.strictEqual(parsed.rows[0]['Amount'], '50');
});

test('CSV parser handles escaped quotes and BOM', () => {
  const { parseCSV } = app.__app;
  const parsed = parseCSV('\uFEFFName,Quote\n"He said ""hi""",x\n');
  assert.strictEqual(parsed.rows[0]['Name'], 'He said "hi"');
});

test('parseAmount supports US, EU, accounting and decorated formats', () => {
  const { parseAmount } = app.__app;
  assert.strictEqual(parseAmount('1,234.56'), 1234.56);
  assert.strictEqual(parseAmount('1.234,56'), 1234.56);
  assert.strictEqual(parseAmount('EGP 1,000'), 1000);
  assert.strictEqual(parseAmount('(50)'), -50);
  assert.strictEqual(parseAmount('1234,56'), 1234.56);
  assert.strictEqual(parseAmount('1,234'), 1234);
  assert.strictEqual(parseAmount(''), 0);
  assert.strictEqual(parseAmount('garbage'), 0);
});

test('migrateState upgrades v1 payload (global tables → per-branch)', () => {
  const { migrateState } = app.__app;
  const v1 = {
    lang: 'en', brand: 'TUOBA Cafe', branch: 'New Cairo',
    tables: [{ id: 'T1', occupied: true }, { id: 'T2', occupied: false }],
    cart: [{ name_en: 'Cola', price: 25, qty: 2 }]
  };
  const migrated = migrateState(v1);
  assert.strictEqual(migrated.schemaVersion, 2);
  const key = 'TUOBA Cafe|New Cairo';
  assert.ok(Array.isArray(migrated.tablesByBranch[key]));
  assert.strictEqual(migrated.tablesByBranch[key][0].occupied, true);
  assert.strictEqual(migrated.orders.length, 0, 'missing arrays are filled in');
  assert.strictEqual(migrated.printer.cashierCopies, 1);
});

test('finance integrates POS orders and expenses into P&L', () => {
  const sandbox = makeSandbox();
  const { state, branchFigures } = sandbox.__app;
  state.orders.unshift({
    brand: state.brand, branch: state.branch, orderNo: 'ORD-1', total: 500,
    items: [], status: 'preparing', createdAt: new Date().toISOString(), readyAt: new Date().toISOString()
  });
  state.expenses.unshift({ brand: state.brand, branch: state.branch, title: 'fuel', amount: 100, note: '' });
  const f = branchFigures(state.brand, state.branch);
  assert.strictEqual(f.posSales, 500);
  assert.strictEqual(f.expenses, 100);
  assert.strictEqual(f.sales, 500); // geidea 0 + pos 500 + payments 0
  assert.strictEqual(f.costs, f.fixed + 100);
});

test('nextSeq produces unique, sortable order ids', () => {
  const sandbox = makeSandbox();
  const { nextSeq } = sandbox.__app;
  const a = nextSeq('ORD');
  const b = nextSeq('ORD');
  assert.notStrictEqual(a, b);
  assert.ok(a.startsWith('ORD-') && b.startsWith('ORD-'));
  assert.ok(b > a);
});

test('tables are isolated per branch (v1 regression)', () => {
  const sandbox = makeSandbox();
  const { state, getTables } = sandbox.__app;
  getTables()[0].occupied = true;
  state.branch = 'Nasr City';
  assert.strictEqual(getTables()[0].occupied, false, 'other branch must not see occupation');
});

test('fmtMoney produces a currency string', () => {
  const { fmtMoney } = app.__app;
  assert.ok(fmtMoney(85).length > 1);
  assert.ok(/85/.test(fmtMoney(85)));
});
