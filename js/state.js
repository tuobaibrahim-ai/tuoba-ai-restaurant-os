// ============================================================================
// TUOBA Restaurant OS — state management, schema migration, domain data
// ============================================================================

const STORAGE_KEY = 'tuoba-os-v2';
// Legacy keys from previous releases — read for migration, never written.
const LEGACY_KEYS = ['tuoba-ultimate-all-in-one-i18n-v1', 'tuoba-ultimate-all-in-one-v1'];
const STATE_VERSION = 2;

const BRANDS = {
  'TUOBA Fried & Grill': ['Giza Main', 'Nasr City'],
  'TUOBA Cafe': ['Sheikh Zayed', 'New Cairo'],
  'TUOBA Express': ['Alexandria']
};

const MENU = [
  { name_ar: 'برجر دجاج', name_en: 'Chicken Burger', name_fr: 'Burger Poulet', name_es: 'Hamburguesa de pollo', name_tr: 'Tavuk Burger', price: 85, prep: 12 },
  { name_ar: 'برجر لحم', name_en: 'Beef Burger', name_fr: 'Burger Boeuf', name_es: 'Hamburguesa de carne', name_tr: 'Et Burger', price: 95, prep: 14 },
  { name_ar: 'وجبة استربس', name_en: 'Strips Meal', name_fr: 'Menu Strips', name_es: 'Combo Strips', name_tr: 'Strips Menü', price: 120, prep: 15 },
  { name_ar: 'فرايز', name_en: 'Fries', name_fr: 'Frites', name_es: 'Papas fritas', name_tr: 'Patates', price: 35, prep: 6 },
  { name_ar: 'كولا', name_en: 'Cola', name_fr: 'Cola', name_es: 'Cola', name_tr: 'Kola', price: 25, prep: 1 },
  { name_ar: 'قهوة', name_en: 'Coffee', name_fr: 'Café', name_es: 'Café', name_tr: 'Kahve', price: 45, prep: 4 }
];

const DELIVERY_LINKS = [
  { name: 'Talabat', url: 'https://www.talabat.com/egypt' },
  { name: 'elmenus', url: 'https://elmenus.com/' },
  { name: 'Mrsool', url: 'https://mrsool.co/' },
  { name: 'Rabbit', url: 'https://rabbitmart.com/' },
  { name: 'HurryApp', url: 'https://play.google.com/store/apps/details?id=com.tawaf.hurryapp' }
];

const DRIVERS = ['مندوب 1', 'مندوب 2', 'مندوب 3'];

// structuredClone is missing in some older WebViews — our state is JSON-safe.
const deepClone = typeof structuredClone === 'function'
  ? structuredClone
  : (value => JSON.parse(JSON.stringify(value)));

const DEFAULT_TABLES = () => Array.from({ length: 6 }, (_, i) => ({ id: 'T' + (i + 1), occupied: false }));

function buildTablesByBranch() {
  const map = {};
  Object.keys(BRANDS).forEach(brand => {
    BRANDS[brand].forEach(branch => { map[brand + '|' + branch] = DEFAULT_TABLES(); });
  });
  return map;
}

const initialState = {
  schemaVersion: STATE_VERSION,
  lang: 'ar',
  brand: 'TUOBA Fried & Grill',
  branch: 'Giza Main',
  seq: 0,
  cart: [],
  deliveryForm: { name: '', phone: '', app: '', address: '' },
  hrForm: { name: '' },
  currentMode: 'table',
  currentTable: 'T1',
  tablesByBranch: buildTablesByBranch(),
  printer: { cashierCopies: 1, kitchenCopies: 1, pickupCopies: 1 },
  orders: [],
  expenses: [],
  recipes: [],
  geidea: [],
  imports: [],
  finance: [
    { brand: 'TUOBA Fried & Grill', branch: 'Giza Main', foodCost: 168000, payroll: 95000, rent: 40000, other: 32000 },
    { brand: 'TUOBA Fried & Grill', branch: 'Nasr City', foodCost: 120000, payroll: 70000, rent: 35000, other: 25000 },
    { brand: 'TUOBA Cafe', branch: 'Sheikh Zayed', foodCost: 90000, payroll: 65000, rent: 42000, other: 22000 },
    { brand: 'TUOBA Cafe', branch: 'New Cairo', foodCost: 85000, payroll: 60000, rent: 40000, other: 21000 },
    { brand: 'TUOBA Express', branch: 'Alexandria', foodCost: 70000, payroll: 50000, rent: 30000, other: 18000 }
  ],
  customerCalls: [],
  customers: [
    { brand: 'TUOBA Fried & Grill', branch: 'Giza Main', name: 'عميل 1', phone: '01000000001', lastPayment: 'NFC' }
  ],
  attendance: [],
  location: { lat: null, lng: null, label: 'غير متاح' },
  shifts: [
    { name: 'Morning', start: '09:00', end: '18:00' },
    { name: 'Evening', start: '14:00', end: '23:00' }
  ],
  payments: [],
  securityLogs: []
};

// ---------------------------------------------------------------------------
// Migration: defensively merge any stored/persisted shape into the current
// schema so that upgrading the app never crashes or loses data.
// ---------------------------------------------------------------------------
function migrateState(raw) {
  const base = deepClone(initialState);
  if (!raw || typeof raw !== 'object') return base;

  const merged = { ...base };
  Object.keys(base).forEach(key => {
    const baseVal = base[key];
    const rawVal = raw[key];
    if (Array.isArray(baseVal)) {
      merged[key] = Array.isArray(rawVal) ? rawVal : deepClone(baseVal);
    } else if (baseVal && typeof baseVal === 'object') {
      merged[key] = (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal))
        ? { ...deepClone(baseVal), ...rawVal }
        : deepClone(baseVal);
    } else if (rawVal !== undefined && typeof rawVal === typeof baseVal) {
      merged[key] = rawVal;
    }
  });

  // v1 → v2: old global `tables` array becomes per-branch tablesByBranch.
  if (Array.isArray(raw.tables) && !raw.tablesByBranch) {
    merged.tablesByBranch = buildTablesByBranch();
    const key = (raw.brand || merged.brand) + '|' + (raw.branch || merged.branch);
    merged.tablesByBranch[key] = raw.tables.filter(t => t && t.id).map(t => ({ id: String(t.id), occupied: !!t.occupied }));
  }
  if (!merged.tablesByBranch || typeof merged.tablesByBranch !== 'object') {
    merged.tablesByBranch = buildTablesByBranch();
  }

  // Sanitize printer settings.
  ['cashierCopies', 'kitchenCopies', 'pickupCopies'].forEach(k => {
    const n = Number(merged.printer[k]);
    merged.printer[k] = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  });
  if (!merged.deliveryForm || typeof merged.deliveryForm !== 'object') {
    merged.deliveryForm = { name: '', phone: '', app: '', address: '' };
  }
  merged.seq = Number.isFinite(Number(merged.seq)) ? Number(merged.seq) : 0;
  merged.schemaVersion = STATE_VERSION;
  return merged;
}

function loadState() {
  const candidates = [STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return migrateState(JSON.parse(raw));
    } catch { /* corrupted entry — try next key */ }
  }
  return deepClone(initialState);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // QuotaExceeded: drop the heaviest payload (receipt images) oldest-first, retry once.
    const withReceipts = state.expenses.filter(e => e.receiptData);
    if (withReceipts.length) {
      withReceipts[withReceipts.length - 1].receiptData = '';
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* give up silently */ }
    }
  }
}

let state = loadState();

function tablesKey() { return state.brand + '|' + state.branch; }

function getTables() {
  if (!state.tablesByBranch || typeof state.tablesByBranch !== 'object') state.tablesByBranch = {};
  if (!Array.isArray(state.tablesByBranch[tablesKey()])) {
    state.tablesByBranch[tablesKey()] = DEFAULT_TABLES();
  }
  return state.tablesByBranch[tablesKey()];
}

function nextSeq(prefix) {
  state.seq = (Number(state.seq) || 0) + 1;
  saveState();
  return prefix + '-' + String(state.seq).padStart(5, '0');
}

function scoped(arr) {
  return (Array.isArray(arr) ? arr : []).filter(x => x && x.brand === state.brand && x.branch === state.branch);
}

if (typeof module !== 'undefined') {
  module.exports = { STORAGE_KEY, LEGACY_KEYS, STATE_VERSION, BRANDS, MENU, DELIVERY_LINKS, DRIVERS, initialState, migrateState, loadState, saveState, getTables, nextSeq, scoped };
}
