// ============================================================================
// TUOBA ERP — pure-logic tests: i18n parity, XSS escaping, CSV/amount parsing.
// The app files are loaded inside a VM sandbox with browser stubs.
// ============================================================================
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const FILES = ['js/i18n.js', 'js/state.js', 'js/api.js', 'js/ui.js', 'js/tabs.js', 'js/modules.js', 'js/app.js'];

function makeSandbox() {
  const elementStub = () => ({
    innerHTML: '', textContent: '', value: '', dataset: {}, style: {}, hidden: true,
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, setAttribute() {}, removeAttribute() {},
    closest() { return null; }, querySelector() { return null; }, remove() {},
    appendChild() {}, click() {}, href: '', download: '', disabled: false, focus() {},
    onchange: null, onclick: null, onkeydown: null
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
      addEventListener() {}, removeEventListener() {},
      body: { appendChild() {}, addEventListener() {}, removeEventListener() {}, classList: { add() {}, remove() {} } },
      documentElement: { lang: '', dir: '' },
      title: ''
    },
    navigator: {},
    location: { hash: '' },
    history: { replaceState() {} },
    localStorage,
    fetch: () => new Promise(() => {}), // never resolves — boot must handle it
    setTimeout, clearTimeout, setInterval, clearInterval,
    structuredClone, console, URL, Blob: class {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  }
  vm.runInContext(`
    globalThis.__app = { I18N, esc, parseCSV, parseAmount, STATUS_KEYS, roleLabel };
  `, sandbox);
  return sandbox;
}

const app = makeSandbox().__app;

test('i18n parity: every ar key exists in en/fr/es/tr', () => {
  const base = Object.keys(app.I18N.ar);
  assert.ok(base.length > 180, 'ar dictionary should be substantial');
  for (const lang of ['en', 'fr', 'es', 'tr']) {
    for (const key of base) {
      assert.notStrictEqual(app.I18N[lang][key], undefined, `${lang}.${key} missing`);
    }
  }
});

test('esc() neutralizes XSS payloads', () => {
  const out = app.esc('<img src=x onerror=alert(1)>');
  assert.ok(!out.includes('<img'));
  assert.ok(out.includes('&lt;img'));
});

test('CSV parser handles newlines inside quoted fields (v1 regression)', () => {
  const parsed = app.parseCSV('Date,Note,Amount\n2026-01-01,"multi\nline, note",50\n');
  assert.strictEqual(parsed.rows.length, 1);
  assert.strictEqual(parsed.rows[0]['Note'], 'multi\nline, note');
  assert.strictEqual(parsed.rows[0]['Amount'], '50');
});

test('CSV parser handles escaped quotes and BOM', () => {
  const parsed = app.parseCSV('\uFEFFName,Quote\n"He said ""hi""",x\n');
  assert.strictEqual(parsed.rows[0]['Name'], 'He said "hi"');
});

test('parseAmount supports US, EU, accounting and decorated formats', () => {
  assert.strictEqual(app.parseAmount('1,234.56'), 1234.56);
  assert.strictEqual(app.parseAmount('1.234,56'), 1234.56);
  assert.strictEqual(app.parseAmount('EGP 1,000'), 1000);
  assert.strictEqual(app.parseAmount('(50)'), -50);
  assert.strictEqual(app.parseAmount('1234,56'), 1234.56);
  assert.strictEqual(app.parseAmount(''), 0);
  assert.strictEqual(app.parseAmount('garbage'), 0);
});

test('role labels exist for all roles in every language', () => {
  for (const lang of ['ar', 'en', 'fr', 'es', 'tr']) {
    for (const role of ['Admin', 'Manager', 'Cashier']) {
      assert.ok(app.I18N[lang]['role' + role], `${lang}.role${role} missing`);
    }
  }
});
