// ============================================================================
// TUOBA ERP — data store: JSON document DB with atomic writes + backups
// Zero external dependencies. Runtime data lives in data/ (git-ignored).
// ============================================================================
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 3;

function defaultSettings() {
  return {
    company: 'TUOBA',
    currency: 'EGP',
    taxRate: 14,
    demoMode: true,
    shifts: [
      { name: 'Morning', start: '09:00', end: '18:00' },
      { name: 'Evening', start: '14:00', end: '23:00' }
    ],
    printerCopies: { cashier: 1, kitchen: 1, pickup: 1 },
    brands: {
      'TUOBA Fried & Grill': ['Giza Main', 'Nasr City'],
      'TUOBA Cafe': ['Sheikh Zayed', 'New Cairo'],
      'TUOBA Express': ['Alexandria']
    }
  };
}

function seedMenu() {
  const items = [
    { name_ar: 'برجر دجاج', name_en: 'Chicken Burger', name_fr: 'Burger Poulet', name_es: 'Hamburguesa de pollo', name_tr: 'Tavuk Burger', price: 85, prep: 12 },
    { name_ar: 'برجر لحم', name_en: 'Beef Burger', name_fr: 'Burger Boeuf', name_es: 'Hamburguesa de carne', name_tr: 'Et Burger', price: 95, prep: 14 },
    { name_ar: 'وجبة استربس', name_en: 'Strips Meal', name_fr: 'Menu Strips', name_es: 'Combo Strips', name_tr: 'Strips Menü', price: 120, prep: 15 },
    { name_ar: 'فرايز', name_en: 'Fries', name_fr: 'Frites', name_es: 'Papas fritas', name_tr: 'Patates', price: 35, prep: 6 },
    { name_ar: 'كولا', name_en: 'Cola', name_fr: 'Cola', name_es: 'Cola', name_tr: 'Kola', price: 25, prep: 1 },
    { name_ar: 'قهوة', name_en: 'Coffee', name_fr: 'Café', name_es: 'Café', name_tr: 'Kahve', price: 45, prep: 4 }
  ];
  const out = [];
  let id = 0;
  Object.keys(defaultSettings().brands).forEach(brand => {
    items.forEach(it => out.push({ id: ++id, brand, ...it, active: true }));
  });
  return out;
}

function seedFinance() {
  const rows = [];
  Object.entries(defaultSettings().brands).forEach(([brand, branches]) => {
    branches.forEach((branch, i) => {
      rows.push({ brand, branch, foodCost: 168000 - i * 12000, payroll: 95000 - i * 9000, rent: 40000 - i * 2500, other: 32000 - i * 2800 });
    });
  });
  return rows;
}

function seedStock() {
  return [
    { id: 1, name: 'دجاج (كاركاس)', unit: 'kg', qty: 48, reorderLevel: 20, brand: null },
    { id: 2, name: 'لحم بقري مفروم', unit: 'kg', qty: 15, reorderLevel: 20, brand: null },
    { id: 3, name: 'خبز برجر', unit: 'pcs', qty: 320, reorderLevel: 100, brand: null },
    { id: 4, name: 'بطاطس مجمدة', unit: 'kg', qty: 75, reorderLevel: 30, brand: null },
    { id: 5, name: 'علب كولا', unit: 'pcs', qty: 180, reorderLevel: 96, brand: null }
  ];
}

function freshDb() {
  return {
    schemaVersion: SCHEMA_VERSION,
    seq: 0,
    settings: defaultSettings(),
    users: [],
    sessions: [],
    menu: seedMenu(),
    stock: seedStock(),
    stockSeq: 5,
    stockMoves: [],
    orders: [],
    calls: [],
    payments: [],
    expenses: [],
    recipes: [],
    geidea: [],
    imports: [],
    finance: seedFinance(),
    customers: [
      { brand: 'TUOBA Fried & Grill', branch: 'Giza Main', name: 'عميل 1', phone: '01000000001', lastPayment: 'NFC' }
    ],
    attendance: [],
    securityLogs: [],
    tables: {}
  };
}

class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'db.json');
    this.backupDir = path.join(dataDir, 'backups');
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.db = this.load();
    this.rotateBackups();
    if (this.db.users.length === 0) this.seedUsers();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const db = JSON.parse(raw);
      const base = freshDb();
      // Defensive merge: new collections always exist after an upgrade.
      for (const k of Object.keys(base)) {
        if (db[k] === undefined) db[k] = base[k];
      }
      db.settings = { ...defaultSettings(), ...db.settings };
      return db;
    } catch {
      return freshDb();
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 1));
    fs.renameSync(tmp, this.file);
  }

  rotateBackups() {
    try {
      if (fs.existsSync(this.file)) {
        const stamp = new Date().toISOString().slice(0, 10);
        const target = path.join(this.backupDir, 'db-' + stamp + '.json');
        if (!fs.existsSync(target)) fs.copyFileSync(this.file, target);
        const files = fs.readdirSync(this.backupDir).sort();
        while (files.length > 10) fs.unlinkSync(path.join(this.backupDir, files.shift()));
      }
    } catch { /* backups are best-effort */ }
  }

  // --- counters / ids --------------------------------------------------------
  nextSeq(prefix) {
    this.db.seq += 1;
    return prefix + '-' + String(this.db.seq).padStart(5, '0');
  }
  nextStockId() { this.db.stockSeq = (this.db.stockSeq || 0) + 1; return this.db.stockSeq; }
  nextMenuId() { return this.db.menu.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1; }

  // --- audit -----------------------------------------------------------------
  audit(entry) {
    this.db.securityLogs.unshift({
      brand: entry.brand || null, branch: entry.branch || null,
      user: entry.user || null, type: entry.type,
      detail: entry.detail, time: new Date().toISOString()
    });
    if (this.db.securityLogs.length > 500) this.db.securityLogs.length = 500;
  }

  // --- users -----------------------------------------------------------------
  seedUsers() {
    const { hashPassword } = require('./passwords');
    const mk = (username, name, role, password) => {
      const { salt, hash } = hashPassword(password);
      return { username, name, role, salt, hash, active: true, createdAt: new Date().toISOString() };
    };
    this.db.users = [
      mk('admin', 'مدير النظام', 'admin', 'admin123'),
      mk('manager', 'مدير التشغيل', 'manager', 'manager123'),
      mk('cashier', 'كاشير الفرع', 'cashier', 'cashier123')
    ];
    this.audit({ type: 'seed', detail: 'Default users created (demo credentials)' });
    this.save();
  }
}

module.exports = { Store, freshDb, defaultSettings, SCHEMA_VERSION };
