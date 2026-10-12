// ============================================================================
// TUOBA Restaurant OS — UI helpers: escaping, i18n access, money, toasts
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
  renderNavLabels();
  render(currentTab);
}

function renderHeaderLabels() {
  document.getElementById('app-title').textContent = t('appTitle');
  document.getElementById('app-subtitle').textContent = t('appSubtitle');
  document.getElementById('export-btn').textContent = t('export');
  document.getElementById('passkey-btn').textContent = t('passkey');
  document.getElementById('location-btn').textContent = t('location');
  document.getElementById('reset-btn').textContent = t('resetData');
  document.title = t('appTitle');
}

const NAV_KEYS = ['overview', 'pos', 'orders', 'kds', 'pickup', 'apps', 'printing', 'expenses', 'recipe', 'geidea', 'finance', 'callcenter', 'crm', 'attendance', 'payments', 'security', 'reports'];
const NAV_ICONS = { overview: '📊', pos: '🧾', orders: '📦', kds: '👨‍🍳', pickup: '🛍️', apps: '🔗', printing: '🖨️', expenses: '💸', recipe: '📖', geidea: '📥', finance: '💰', callcenter: '☎️', crm: '👥', attendance: '🕒', payments: '💳', security: '🔐', reports: '📈' };

function renderNavLabels() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const tab = btn.dataset.tab;
    const label = btn.querySelector('.lb');
    const icon = btn.querySelector('.ic');
    if (label) label.textContent = t(tab);
    if (icon) icon.textContent = NAV_ICONS[tab] || '•';
  });
}

if (typeof module !== 'undefined') {
  module.exports = { esc, t, tf, fmtMoney, fmtDateTime, menuName, statusLabel, minutesLeft };
}
