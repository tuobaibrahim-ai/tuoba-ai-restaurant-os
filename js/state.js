// ============================================================================
// TUOBA ERP — client state: server snapshot + session-local UI state
// The server is the single source of truth; `state` mirrors /api/bootstrap.
// ============================================================================

let state = null; // bootstrap payload (null until login)

// Session-local UI state — never persisted, resets per login (per-user cart).
const ui = {
  cart: [],
  deliveryForm: { name: '', phone: '', app: '', address: '' },
  hrForm: { name: '' },
  currentMode: 'table',
  currentTable: 'T1'
};

function setState(data) {
  state = data;
  // Language preference lives client-side; server bootstrap doesn't carry it.
  if (!state.lang) state.lang = (typeof getSavedLang === 'function' && getSavedLang()) || 'ar';
  if (!I18N[state.lang]) state.lang = 'ar';
  if (!state.tables) state.tables = {};
  if (!state.brandSel) state.brandSel = Object.keys(state.settings.brands)[0] || '';
  if (!state.branchSel) state.branchSel = (state.settings.brands[state.brandSel] || [])[0] || '';
}

function me() { return state ? state.me : { role: 'cashier' }; }
function settings() { return state ? state.settings : { currency: 'EGP', taxRate: 14, shifts: [] }; }

function currentScope() {
  return { brand: state ? state.brandSel : '', branch: state ? state.branchSel : '' };
}

// Switching brand/branch clears the composing cart (per-branch carts).
function selectBrand(brand) {
  if (!state) return;
  state.brandSel = brand;
  state.branchSel = (state.settings.brands[brand] || [])[0] || '';
  resetComposer();
}
function selectBranch(branch) {
  if (!state) return;
  state.branchSel = branch;
  resetComposer();
}
function resetComposer() {
  ui.cart = [];
  ui.deliveryForm = { name: '', phone: '', app: '', address: '' };
  ui.currentTable = 'T1';
}

function scoped(arr) {
  return (Array.isArray(arr) ? arr : []).filter(x => x && x.brand === state.brandSel && x.branch === state.branchSel);
}
function brandScoped(arr) {
  return (Array.isArray(arr) ? arr : []).filter(x => x && x.brand === state.brandSel);
}

function getTables() {
  const key = state.brandSel + '|' + state.branchSel;
  if (!Array.isArray(state.tables[key])) state.tables[key] = Array.from({ length: 6 }, (_, i) => ({ id: 'T' + (i + 1), occupied: false }));
  return state.tables[key];
}

function shiftList() { return settings().shifts || []; }

// --- role access -------------------------------------------------------------
const ALL_TABS = ['overview', 'pos', 'orders', 'kds', 'pickup', 'apps', 'printing', 'expenses', 'recipe', 'geidea', 'inventory', 'menu', 'finance', 'callcenter', 'crm', 'attendance', 'payments', 'security', 'reports', 'users', 'settings'];
const PRIMARY_TABS = ['overview', 'pos', 'orders', 'kds', 'pickup'];
const ROLE_TABS = {
  admin: ALL_TABS,
  manager: ALL_TABS.filter(tb => tb !== 'users'),
  cashier: ['overview', 'pos', 'orders', 'kds', 'pickup', 'apps', 'printing', 'expenses', 'callcenter', 'attendance', 'payments', 'security']
};
function canSee(tab) {
  const list = ROLE_TABS[me().role] || [];
  return list.includes(tab);
}

// --- registries (screens + actions spread across tab/module files) -----------
const SCREENS = {};
const ACTIONS = {};
function registerScreen(tab, fn) { SCREENS[tab] = fn; }
function registerAction(name, fn) { ACTIONS[name] = fn; }

if (typeof module !== 'undefined') {
  module.exports = { setState, scoped, getTables, ALL_TABS, ROLE_TABS };
}
