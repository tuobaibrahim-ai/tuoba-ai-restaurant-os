// ============================================================================
// TUOBA Restaurant OS — UI helpers: escaping, i18n access, money, toasts, icons
// ============================================================================

// HTML-escape every user/CSV-supplied string before it touches innerHTML (XSS).
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}

function tf(key, params) {
  let str = t(key);
  Object.keys(params || {}).forEach(k => { str = str.replace('{' + k + '}', params[k]); });
  return str;
}

const LOCALES = { ar: 'ar-EG-u-nu-latn', en: 'en-EG', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR' };
const _formatters = {};
function fmtMoney(value) {
  const lang = state.lang || 'en';
  if (!_formatters[lang]) {
    try {
      _formatters[lang] = new Intl.NumberFormat(LOCALES[lang] || 'en', { style: 'currency', currency: 'EGP' });
    } catch {
      _formatters[lang] = { format: n => String(n) };
    }
  }
  const n = Number(value);
  return _formatters[lang].format(Number.isFinite(n) ? n : 0);
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || '');
  try { return d.toLocaleString(LOCALES[state.lang] || undefined); } catch { return d.toLocaleString(); }
}

function menuName(item) {
  const k = 'name_' + state.lang;
  return item[k] || item.name_en || item.name_ar || '';
}

const STATUS_KEYS = {
  preparing: 'preparing', ready: 'ready', picked: 'picked',
  new: 'statusNew', assigned: 'statusAssigned', out: 'statusOut', delivered: 'statusDelivered'
};
function statusLabel(status) {
  const key = STATUS_KEYS[status];
  return key ? t(key) : String(status || '');
}

function minutesLeft(readyAt) {
  const diff = Math.ceil((new Date(readyAt).getTime() - Date.now()) / 60000);
  return diff > 0 ? diff : 0;
}

function kpi(label, value, delta = '') {
  return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value money">${value}</div><div class="kpi-delta">${delta}</div></div>`;
}

// --- Inline SVG icon set (font-independent — no emoji, no icon fonts) -------
function svgIcon(paths) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}
const ICONS = {
  overview: svgIcon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  pos: svgIcon('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/>'),
  orders: svgIcon('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
  kds: svgIcon('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/>'),
  pickup: svgIcon('<path d="M6 7h12l1 14H5z"/><path d="M9 10V7a3 3 0 016 0v3"/>'),
  more: svgIcon('<circle cx="5" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.7" fill="currentColor" stroke="none"/>'),
  export: svgIcon('<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>'),
  passkey: svgIcon('<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9"/><path d="M17 5l3 3"/><path d="M14 8l2 2"/>'),
  location: svgIcon('<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  reset: svgIcon('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/>'),
  apps: svgIcon('<path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5"/>'),
  printing: svgIcon('<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>'),
  expenses: svgIcon('<path d="M21 7H5a2 2 0 010-4h14v4z"/><path d="M3 5v14a2 2 0 002 2h16V7"/><path d="M16 13.5h.01"/>'),
  recipe: svgIcon('<path d="M4 19V5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19a2 2 0 002 2h13"/><path d="M8 7h7"/><path d="M8 11h7"/>'),
  geidea: svgIcon('<path d="M12 3v10"/><path d="M8 9l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>'),
  finance: svgIcon('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10h.01"/><path d="M18 14h.01"/>'),
  callcenter: svgIcon('<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c1 .3 2 .6 3 .7a2 2 0 011.6 2z"/>'),
  crm: svgIcon('<circle cx="10" cy="7" r="4"/><path d="M2 21v-2a5 5 0 015-5h6a5 5 0 015 5v2"/><path d="M17 11a3 3 0 100-6"/><path d="M21 21v-1.5a4 4 0 00-2.5-3.7"/>'),
  attendance: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
  payments: svgIcon('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'),
  security: svgIcon('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
  reports: svgIcon('<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>')
};

// --- Tab structure: 4 primary tabs + "More" drawer with the remaining 12 ----
const SHEET_TABS = ['apps', 'printing', 'expenses', 'recipe', 'geidea', 'finance', 'callcenter', 'crm', 'attendance', 'payments', 'security', 'reports'];

function renderTabLabels() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const tab = btn.dataset.tab;
    const lb = btn.querySelector('.lb');
    const ic = btn.querySelector('.ic');
    if (lb) lb.textContent = t(tab);
    if (ic) ic.innerHTML = ICONS[tab] || '';
  });
  const moreLb = document.querySelector('#more-btn .lb');
  const moreIc = document.querySelector('#more-btn .ic');
  if (moreLb) moreLb.textContent = t('more');
  if (moreIc) moreIc.innerHTML = ICONS.more;
}

function renderHeaderLabels() {
  document.getElementById('app-title').textContent = t('appTitle');
  document.getElementById('app-subtitle').textContent = t('appSubtitle');
  document.getElementById('brand-lb').textContent = t('brand');
  document.getElementById('branch-lb').textContent = t('branch');
  const setAct = (id, key, icon) => {
    const b = document.getElementById(id);
    if (!b) return;
    const lb = b.querySelector('.act-lb');
    const ic = b.querySelector('.act-ic');
    if (lb) lb.textContent = t(key);
    if (ic) ic.innerHTML = ICONS[icon] || '';
  };
  setAct('export-btn', 'export', 'export');
  setAct('passkey-btn', 'passkey', 'passkey');
  setAct('location-btn', 'location', 'location');
  setAct('reset-btn', 'resetData', 'reset');
  const sheetTitle = document.getElementById('sheet-title');
  if (sheetTitle) sheetTitle.textContent = t('more');
  document.title = t('appTitle');
}

// --- Toasts (replace blocking alert() calls) --------------------------------
function toast(message, kind = 'info') {
  let root = document.querySelector('.toast-root');
  if (!root) {
    root = document.createElement('div');
    root.className = 'toast-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'err' ? ' err' : kind === 'ok' ? ' ok' : '');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.remove(); }, 3000);
}

// Debounced persistence for high-frequency input events (keeps typing smooth).
let _saveTimer = null;
function saveStateDebounced() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; saveState(); }, 400);
}

// --- Language ---------------------------------------------------------------
function setLang(lang) {
  state.lang = I18N[lang] ? lang : 'en';
  const dir = I18N[state.lang]?.dir || 'ltr';
  document.documentElement.lang = state.lang;
  document.documentElement.dir = dir;
  saveState();
  renderHeaderLabels();
  renderTabLabels();
  render(currentTab);
}

if (typeof module !== 'undefined') {
  module.exports = { esc, t, tf, fmtMoney, fmtDateTime, menuName, statusLabel, minutesLeft, ICONS, SHEET_TABS };
}
