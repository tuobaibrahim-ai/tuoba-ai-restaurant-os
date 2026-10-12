// ============================================================================
// TUOBA Restaurant OS — screens, actions, render dispatcher
// All dynamic values are escaped with esc() before touching innerHTML (XSS).
// All user-facing strings go through t()/tf() (5 languages).
// ============================================================================

const content = document.getElementById('content');

// ---------------------------------------------------------------------------
// Domain math — P&L integrates Geidea imports + POS orders + manual payments,
// and fixed finance records + expense receipts.
// ---------------------------------------------------------------------------
function branchFigures(brand, branch) {
  const fin = state.finance.find(x => x.brand === brand && x.branch === branch) || { foodCost: 0, payroll: 0, rent: 0, other: 0 };
  const geideaRec = state.geidea.find(x => x.brand === brand && x.branch === branch);
  const geideaSales = Number(geideaRec && geideaRec.total) || 0;
  const posSales = state.orders.filter(o => o.brand === brand && o.branch === branch)
    .reduce((a, o) => a + (Number(o.total) || 0), 0);
  const paySales = state.payments.filter(x => x.brand === brand && x.branch === branch)
    .reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const expenses = state.expenses.filter(x => x.brand === brand && x.branch === branch)
    .reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const fixed = ['foodCost', 'payroll', 'rent', 'other'].reduce((a, k) => a + (Number(fin[k]) || 0), 0);
  const sales = geideaSales + posSales + paySales;
  const costs = fixed + expenses;
  return {
    sales, costs, fixed, expenses, posSales, paySales, geideaSales, fin,
    profit: sales - costs,
    margin: sales > 0 ? Math.round(((sales - costs) / sales) * 100) : 0
  };
}

function brandFigures(brand) {
  const acc = { sales: 0, costs: 0, fixed: 0, expenses: 0, posSales: 0, paySales: 0, geideaSales: 0, profit: 0 };
  (BRANDS[brand] || []).forEach(branch => {
    const f = branchFigures(brand, branch);
    Object.keys(acc).forEach(k => { acc[k] += f[k] || 0; });
  });
  acc.margin = acc.sales > 0 ? Math.round((acc.profit / acc.sales) * 100) : 0;
  return acc;
}

function aiBrief() {
  const openOrders = scoped(state.orders).filter(o => o.status !== 'picked').length;
  const openCalls = scoped(state.customerCalls).filter(o => o.status !== 'delivered').length;
  const p = branchFigures(state.brand, state.branch);
  const notes = [];
  if (openOrders) notes.push(`${openOrders} ${t('orders')}`);
  if (openCalls) notes.push(`${openCalls} ${t('callCenter')}`);
  if (p.sales > 0) notes.push(`${t('profit')}: ${fmtMoney(p.profit)}`);
  if (!notes.length) notes.push(t('activeSituation'));
  return notes;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function renderOverview() {
  const orders = scoped(state.orders);
  const calls = scoped(state.customerCalls);
  const payments = scoped(state.payments);
  const p = branchFigures(state.brand, state.branch);
  content.innerHTML = `
    <div class="hero">
      <div class="section-title">${t('dashboard')}</div>
      <div class="small">${esc(state.brand)} · ${esc(state.branch)}</div>
    </div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi(t('crm'), scoped(state.customers).length, 'CRM')}
      ${kpi(t('sales'), fmtMoney(p.sales), t('finance'))}
      ${kpi(t('profit'), fmtMoney(p.profit), 'P&L')}
    </div>
    <div class="card">
      <div class="section-title">${t('aiBrief')}</div>
      <div class="list">${aiBrief().map(n => `<div class="list-item">${esc(n)}</div>`).join('')}</div>
    </div>`;
}

function renderPOS() {
  const cartTotal = state.cart.reduce((a, b) => a + (Number(b.price) || 0) * (Number(b.qty) || 0), 0);
  const df = state.deliveryForm || { name: '', phone: '', app: '', address: '' };
  const modeBtn = (mode, label) => `<button class="btn ${state.currentMode === mode ? 'primary' : 'soft'}" data-action="setOrderMode" data-arg="${mode}">${label}</button>`;
  content.innerHTML = `
    <div class="card">
      <div class="section-title">${t('orderType')}</div>
      <div class="btn-row">${modeBtn('table', t('table'))}${modeBtn('takeaway', t('takeaway'))}${modeBtn('delivery', t('delivery'))}</div>
    </div>
    ${state.currentMode === 'table' ? `
    <div class="card">
      <div class="section-title">${t('tables')}</div>
      <div class="table-grid">${getTables().map(ti => `<button class="table-card ${ti.occupied ? 'occupied' : ''}" data-action="selectTable" data-arg="${esc(ti.id)}">${esc(ti.id)}</button>`).join('')}</div>
      <div class="note">${t('currentTable')}: ${esc(state.currentTable)}</div>
    </div>` : ''}
    ${state.currentMode === 'delivery' ? `
    <div class="card">
      <div class="section-title">${t('deliveryInfo')}</div>
      <div class="form-grid">
        <input class="input" data-dfield="name" value="${esc(df.name)}" placeholder="${t('customerName')}" />
        <input class="input" data-dfield="phone" value="${esc(df.phone)}" placeholder="${t('phone')}" />
        <input class="input" data-dfield="app" value="${esc(df.app)}" placeholder="${t('appChannel')}" />
        <textarea class="textarea" data-dfield="address" placeholder="${t('address')}">${esc(df.address)}</textarea>
      </div>
    </div>` : ''}
    <div class="card">
      <div class="section-title">${t('menu')}</div>
      <div class="menu-grid">${MENU.map((m, idx) => `<button class="menu-btn" data-action="addToCart" data-arg="${idx}"><strong>${esc(menuName(m))}</strong><div class="muted money">${fmtMoney(m.price)}</div><div class="small">${esc(tf('prepMin', { n: m.prep }))}</div></button>`).join('')}</div>
    </div>
    <div class="card">
      <div class="section-title">${t('cart')}</div>
      <div class="list">${state.cart.length ? state.cart.map((i, idx) => `
        <div class="cart-row">
          <div><strong>${esc(menuName(i))}</strong><div class="muted money">${i.qty} × ${fmtMoney(i.price)}</div></div>
          <div><button class="btn soft mini" data-action="changeQty" data-arg="${idx}" data-arg2="1">+</button><button class="btn soft mini" data-action="changeQty" data-arg="${idx}" data-arg2="-1">−</button></div>
        </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div>
      <div class="section-title money">${t('total')}: ${fmtMoney(cartTotal)}</div>
      <div class="btn-row">
        <button class="btn soft" data-action="clearCart">${t('clear')}</button>
        <button class="btn primary" data-action="placeOrder" data-arg="cash">${t('cash')}</button>
        <button class="btn primary" data-action="placeOrder" data-arg="card">${t('card')}</button>
      </div>
    </div>`;
}

function addToCart(idx) {
  const item = MENU[idx];
  if (!item) return;
  const existing = state.cart.find(x => x.name_en === item.name_en);
  if (existing) existing.qty += 1; else state.cart.push({ ...item, qty: 1 });
  saveState(); render('pos');
}
function changeQty(idx, delta) {
  if (!state.cart[idx]) return;
  state.cart[idx].qty += delta;
  if (state.cart[idx].qty <= 0) state.cart.splice(idx, 1);
  saveState(); render('pos');
}
function clearCart() { state.cart = []; saveState(); render('pos'); }
function setOrderMode(mode) { state.currentMode = mode; saveState(); render('pos'); }
function selectTable(id) { state.currentTable = id; saveState(); render('pos'); }

function placeOrder(paymentMethod) {
  if (!state.cart.length) { toast(t('emptyCart'), 'err'); return; }
  let customer = {};
  if (state.currentMode === 'delivery') {
    const df = state.deliveryForm || {};
    customer = {
      name: String(df.name || '').trim(),
      phone: String(df.phone || '').trim(),
      app: String(df.app || '').trim(),
      address: String(df.address || '').trim()
    };
    if (customer.phone) upsertCustomer(customer.name || 'Customer', customer.phone, paymentMethod);
  }
  const prepMinutes = Math.max(1, ...state.cart.map(i => Number(i.prep) || 5), 5);
  const total = state.cart.reduce((a, b) => a + (Number(b.price) || 0) * (Number(b.qty) || 0), 0);
  state.orders.unshift({
    brand: state.brand, branch: state.branch, orderNo: nextSeq('ORD'),
    mode: state.currentMode, table: state.currentMode === 'table' ? state.currentTable : '',
    customer, payment: paymentMethod,
    items: JSON.parse(JSON.stringify(state.cart)), total, prepMinutes,
    createdAt: new Date().toISOString(),
    readyAt: new Date(Date.now() + prepMinutes * 60000).toISOString(),
    status: 'preparing',
    cashierCopies: Number(state.printer.cashierCopies || 1),
    kitchenCopies: Number(state.printer.kitchenCopies || 1),
    pickupCopies: Number(state.printer.pickupCopies || 1)
  });
  if (state.currentMode === 'table') {
    const ti = getTables().find(x => x.id === state.currentTable);
    if (ti) ti.occupied = true;
  }
  state.cart = [];
  state.deliveryForm = { name: '', phone: '', app: '', address: '' };
  saveState(); render('orders'); toast(t('saved'), 'ok');
}

function orderCard(o) {
  const left = minutesLeft(o.readyAt);
  return `
    <div class="list-item">
      <span class="badge ${o.status === 'preparing' ? 'preparing' : o.status === 'ready' ? 'ready' : 'picked'}">${esc(statusLabel(o.status))}</span>
      <div><strong>${esc(o.orderNo)}</strong> — ${esc(o.mode)} — <span class="money">${fmtMoney(o.total)}</span></div>
      <div class="muted">${o.table ? t('table') + ': ' + esc(o.table) + ' — ' : ''}${t('prepTime')}: ${o.prepMinutes} — ${t('timeLeft')}: ${left} ${t('minutes')}</div>
      ${o.customer && o.customer.name ? `<div class="small">${esc(o.customer.name)} · ${esc(o.customer.phone || '')}</div>` : ''}
      <div class="small">${t('cashierCopies')}: ${o.cashierCopies} · ${t('kitchenCopies')}: ${o.kitchenCopies} · ${t('pickupCopies')}: ${o.pickupCopies}</div>
      <div class="btn-row">
        <button class="btn soft mini" data-action="setPosStatus" data-arg="${esc(o.orderNo)}" data-arg2="preparing">${t('preparing')}</button>
        <button class="btn soft mini" data-action="setPosStatus" data-arg="${esc(o.orderNo)}" data-arg2="ready">${t('ready')}</button>
        <button class="btn soft mini" data-action="setPosStatus" data-arg="${esc(o.orderNo)}" data-arg2="picked">${t('picked')}</button>
      </div>
    </div>`;
}

function renderOrders() {
  const orders = scoped(state.orders);
  content.innerHTML = `<div class="card"><div class="section-title">${t('allOrders')}</div><div class="list">${orders.length ? orders.map(orderCard).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}

function setPosOrderStatus(orderNo, status) {
  const target = state.orders.find(x => x.orderNo === orderNo);
  if (!target) return;
  target.status = status;
  if (status === 'picked' && target.mode === 'table' && target.table) {
    const ti = getTables().find(x => x.id === target.table);
    if (ti) ti.occupied = false;
  }
  saveState(); render('orders');
}

function renderKDS() {
  const orders = scoped(state.orders).filter(o => o.status === 'preparing');
  content.innerHTML = `<div class="card"><div class="section-title">${t('kitchenDisplay')}</div><div class="list">${orders.length ? orders.map(o => {
    const left = minutesLeft(o.readyAt);
    return `
    <div class="list-item">
      <span class="badge ${left === 0 ? 'late' : 'preparing'}">${left === 0 ? t('overdue') : t('preparing')}</span>
      <div><strong>${esc(o.orderNo)}</strong> — ${esc(o.mode)}</div>
      <div class="muted">${t('prepTime')}: ${o.prepMinutes} — ${t('timeLeft')}: ${left} ${t('minutes')}</div>
      <div class="list">${o.items.map(i => `<div class="small">${i.qty} × ${esc(menuName(i))}</div>`).join('')}</div>
    </div>`;
  }).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}

function renderPickup() {
  const orders = scoped(state.orders).filter(o => o.status === 'ready');
  content.innerHTML = `<div class="card"><div class="section-title">${t('pickupScreen')}</div><div class="list">${orders.length ? orders.map(o => `
    <div class="list-item"><span class="badge ready">${t('ready')}</span><div><strong>${esc(o.orderNo)}</strong></div>
    <div class="muted">${esc(o.mode)}${o.customer && o.customer.name ? ' — ' + esc(o.customer.name) : ''}</div>
    <div class="small">${t('pickupCopies')}: ${o.pickupCopies}</div></div>`).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}

function renderApps() {
  content.innerHTML = `<div class="card"><div class="section-title">${t('apps')}</div><div class="channel-grid">${DELIVERY_LINKS.map(x => `<a class="link-btn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.name)}</strong><div class="muted">${t('openLink')}</div></a>`).join('')}</div></div>`;
}

function renderPrinting() {
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('printingSettings')}</div><div class="form-grid">
      <input id="cashier-copies" class="input" type="number" min="1" value="${Number(state.printer.cashierCopies) || 1}" />
      <input id="kitchen-copies" class="input" type="number" min="1" value="${Number(state.printer.kitchenCopies) || 1}" />
      <input id="pickup-copies" class="input" type="number" min="1" value="${Number(state.printer.pickupCopies) || 1}" />
      <button class="btn primary" data-action="savePrinterSettings">${t('save')}</button>
    </div></div>`;
}
function savePrinterSettings() {
  state.printer.cashierCopies = Math.max(1, Number(document.getElementById('cashier-copies').value) || 1);
  state.printer.kitchenCopies = Math.max(1, Number(document.getElementById('kitchen-copies').value) || 1);
  state.printer.pickupCopies = Math.max(1, Number(document.getElementById('pickup-copies').value) || 1);
  saveState(); render('printing'); toast(t('saved'), 'ok');
}

// ---------------------------------------------------------------------------
// Expenses — receipt image is compressed (max 900px, JPEG q≈0.65) and stored.
// ---------------------------------------------------------------------------
function readImage(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });
}
async function compressImage(dataUrl, maxDim = 900, quality = 0.65) {
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch { return dataUrl; }
}
async function handleReceiptPreview(e) {
  const file = e.target.files && e.target.files[0];
  const box = document.getElementById('receipt-preview-wrap');
  if (!file || !box) return;
  const src = await compressImage(await readImage(file));
  box.innerHTML = `<div class="small">${esc(file.name)}</div><img class="preview-image" src="${src}" alt="receipt" />`;
}
function renderExpenses() {
  const items = scoped(state.expenses);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('addExpense')}</div><div class="form-grid">
      <input id="exp-title" class="input" placeholder="${t('title')}" />
      <input id="exp-amount" class="input" type="number" min="0" step="0.01" placeholder="${t('amount')}" />
      <input id="exp-receipt" class="input" type="file" accept="image/*" capture="environment" />
      <div class="note">${t('uploadReceipt')}</div>
      <div id="receipt-preview-wrap"></div>
      <textarea id="exp-note" class="textarea" placeholder="${t('notes')}"></textarea>
      <button class="btn primary" data-action="addExpense">${t('saveRecord')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('expenseLog')}</div><div class="list">${items.length ? items.map(e => `
      <div class="list-item"><strong>${esc(e.title)}</strong> — <span class="money">${fmtMoney(e.amount)}</span>
      <div class="muted">${esc(e.note || '')}</div>
      ${e.receiptName ? `<div class="small">${esc(e.receiptName)}</div>` : ''}
      ${e.receiptData ? `<img class="receipt-thumb" src="${e.receiptData}" alt="receipt" />` : ''}
      </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
  document.getElementById('exp-receipt').addEventListener('change', handleReceiptPreview);
}
async function addExpense() {
  const title = document.getElementById('exp-title').value.trim();
  const amount = Number(document.getElementById('exp-amount').value);
  const note = document.getElementById('exp-note').value.trim();
  const file = document.getElementById('exp-receipt').files && document.getElementById('exp-receipt').files[0];
  if (!title || !Number.isFinite(amount) || amount <= 0) { toast(t('noData'), 'err'); return; }
  const receiptData = file ? await compressImage(await readImage(file)) : '';
  state.expenses.unshift({
    brand: state.brand, branch: state.branch, title, amount, note,
    receiptName: file ? file.name : '', receiptData, at: new Date().toISOString()
  });
  saveState(); render('expenses'); toast(t('saved'), 'ok');
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------
function renderRecipe() {
  const items = scoped(state.recipes);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('addRecipe')}</div><div class="form-grid">
      <input id="r-name" class="input" placeholder="${t('title')}" />
      <input id="r-cost" class="input" type="number" min="0" step="0.01" placeholder="${t('cost')}" />
      <input id="r-price" class="input" type="number" min="0" step="0.01" placeholder="${t('price')}" />
      <textarea id="r-ing" class="textarea" placeholder="${t('ingredients')}"></textarea>
      <button class="btn primary" data-action="addRecipe">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('recipeIntelligence')}</div><div class="list">${items.length ? items.map(r => `
      <div class="list-item"><span class="badge ${Number(r.margin) >= 40 ? 'good' : 'pending'}">${r.margin}%</span>
      <div><strong>${esc(r.name)}</strong></div>
      <div class="muted">${t('cost')}: ${fmtMoney(r.cost)} — ${t('price')}: ${fmtMoney(r.price)}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function addRecipe() {
  const name = document.getElementById('r-name').value.trim();
  const cost = Number(document.getElementById('r-cost').value);
  const price = Number(document.getElementById('r-price').value);
  const ingredients = document.getElementById('r-ing').value.trim();
  if (!name || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(price) || price <= 0) { toast(t('noData'), 'err'); return; }
  const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
  state.recipes.unshift({ brand: state.brand, branch: state.branch, name, cost, price, ingredients, margin });
  saveState(); render('recipe'); toast(t('saved'), 'ok');
}

// ---------------------------------------------------------------------------
// Geidea CSV import — RFC-style CSV parser (quoted newlines/commas supported)
// and locale-aware amount parsing ("1,234.56" / "1.234,56" / "(50)").
// ---------------------------------------------------------------------------
let geideaHeaders = [], geideaRows = [], geideaFileName = '';

function parseCSV(text) {
  const src = String(text == null ? '' : text).replace(/^\uFEFF/, '');
  const rows = []; let row = []; let cur = ''; let inQuotes = false; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cur += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(cur); cur = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map(h => h.trim());
  const out = rows.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ''))
    .map(r => { const obj = {}; headers.forEach((h, j) => { obj[h] = String(r[j] == null ? '' : r[j]).trim(); }); return obj; });
  return { headers, rows: out };
}

function parseAmount(raw) {
  let s = String(raw == null ? '' : raw).trim();
  if (!s) return 0;
  let negative = /^\(.*\)$/.test(s);
  if (negative) s = s.slice(1, -1);
  s = s.replace(/[^\d.,\-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(/,/g, '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    // A single comma followed by 1–2 digits is a decimal separator; otherwise thousands.
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join('.');
    else s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

function normalizeHeader(s) { return String(s || '').toLowerCase().replace(/[_\-\s]+/g, ''); }

function renderGeidea() {
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('geideaUpload')}</div>
      <input id="file-input" class="input" type="file" accept=".csv,text/csv" />
    </div>
    <div class="card"><div class="section-title">${t('columns')}</div><div id="columns-box" class="muted">${t('noData')}</div></div>
    <div class="card"><div class="section-title">${t('autoMap')}</div><div class="form-grid">
      <label>${t('date')} <select id="map-date" class="select"></select></label>
      <label>${t('time')} <select id="map-time" class="select"></select></label>
      <label>${t('amount')} <select id="map-amount" class="select"></select></label>
    </div>
    <div class="btn-row">
      <button class="btn soft" data-action="autoMap">${t('autoMap')}</button>
      <button class="btn primary" data-action="runImport">${t('import')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('reports')}</div><div id="results-box" class="muted">${t('noData')}</div></div>`;
  document.getElementById('file-input').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const parsed = parseCSV(await file.text());
    geideaHeaders = parsed.headers; geideaRows = parsed.rows; geideaFileName = file.name;
    fillMapSelects(); renderHeaders(); autoMap(); renderImportResults();
  });
  renderImportResults();
}
function fillMapSelects() {
  ['map-date', 'map-time', 'map-amount'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">--</option>' + geideaHeaders.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('');
  });
}
function renderHeaders() {
  document.getElementById('columns-box').innerHTML = geideaHeaders.length
    ? geideaHeaders.map(h => `<div class="list-item">${esc(h)}</div>`).join('')
    : '—';
}
function autoMap() {
  const guess = patterns => geideaHeaders.find(h => patterns.some(p => normalizeHeader(h).includes(p))) || '';
  document.getElementById('map-date').value = guess(['date', 'تاريخ']);
  document.getElementById('map-time').value = guess(['time', 'وقت', 'saat']);
  document.getElementById('map-amount').value = guess(['amount', 'total', 'gross', 'net', 'مبلغ', 'قيمة', 'tutar']);
}
function renderImportResults() {
  const box = document.getElementById('results-box');
  if (!box) return;
  const history = (state.imports || []).slice(0, 5);
  const rec = state.geidea.find(x => x.brand === state.brand && x.branch === state.branch);
  box.innerHTML = `
    <div class="list">
      ${rec ? `<div class="list-item"><strong>${t('lastImport')}</strong><div class="money">${fmtMoney(rec.total)}</div>
        <div class="muted">${t('count')}: ${rec.count} · ${t('avg')}: ${fmtMoney(rec.avg)}</div>
        ${rec.period ? `<div class="small">${esc(rec.period)}</div>` : ''}
        ${rec.fileName ? `<div class="small">${esc(rec.fileName)}</div>` : ''}</div>` : ''}
      ${history.length ? `<div class="section-title">${t('importHistory')}</div>` + history.map(h => `
        <div class="list-item"><div class="note-row"><span class="money">${fmtMoney(h.total)}</span><span class="small">${fmtDateTime(h.at)}</span></div>
        ${h.period ? `<div class="small">${esc(h.period)}</div>` : ''}${h.fileName ? `<div class="small">${esc(h.fileName)}</div>` : ''}</div>`).join('') : ''}
    </div>`;
}
function runImport() {
  const amountCol = document.getElementById('map-amount').value;
  if (!amountCol) { toast(t('noData'), 'err'); return; }
  const dateCol = document.getElementById('map-date').value;
  const timeCol = document.getElementById('map-time').value;
  const cleaned = geideaRows.map(r => ({ amount: parseAmount(r[amountCol]) }));
  const total = cleaned.reduce((a, b) => a + b.amount, 0);
  const count = cleaned.length;
  const avg = count ? total / count : 0;
  const period = (dateCol || timeCol) && geideaRows.length
    ? [dateCol ? geideaRows[0][dateCol] : '', timeCol ? geideaRows[0][timeCol] : ''].filter(Boolean).join(' ')
    : '';
  const at = new Date().toISOString();
  const idx = state.geidea.findIndex(x => x.brand === state.brand && x.branch === state.branch);
  const rec = { brand: state.brand, branch: state.branch, total, count, avg, period, fileName: geideaFileName, importedAt: at };
  if (idx >= 0) state.geidea[idx] = rec; else state.geidea.unshift(rec);
  state.imports = state.imports || [];
  state.imports.unshift({ at, total, count, period, fileName: geideaFileName });
  state.securityLogs.unshift({
    brand: state.brand, branch: state.branch, type: 'import',
    detail: `Geidea ${geideaFileName || ''} — ${count} rows, total ${total.toFixed(2)}`, time: at
  });
  saveState(); renderImportResults(); toast(t('saved'), 'ok');
}

// ---------------------------------------------------------------------------
// Finance — integrated P&L, cash flow, per-branch / per-brand views
// ---------------------------------------------------------------------------
function renderFinance() {
  const p = branchFigures(state.brand, state.branch);
  const b = brandFigures(state.brand);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('branchPL')} — ${esc(state.branch)}</div>
      <div class="section-title">${t('orderBreakdown')}</div><div class="list">
        <div class="list-item">${t('geidea')}: <span class="money">${fmtMoney(p.geideaSales)}</span></div>
        <div class="list-item">${t('pos')}: <span class="money">${fmtMoney(p.posSales)}</span></div>
        <div class="list-item">${t('payments')}: <span class="money">${fmtMoney(p.paySales)}</span></div>
      </div>
      <div class="section-title">${t('costBreakdown')}</div><div class="list">
        <div class="list-item">${t('cost')}: <span class="money">${fmtMoney(p.fin.foodCost)}</span></div>
        <div class="list-item">${t('payroll')}: <span class="money">${fmtMoney(p.fin.payroll)}</span></div>
        <div class="list-item">${t('rent')}: <span class="money">${fmtMoney(p.fin.rent)}</span></div>
        <div class="list-item">${t('otherCosts')}: <span class="money">${fmtMoney(p.fin.other)}</span></div>
        <div class="list-item">${t('expenses')}: <span class="money">${fmtMoney(p.expenses)}</span></div>
      </div>
      <div class="list">
        <div class="list-item">${t('sales')}: <strong class="money">${fmtMoney(p.sales)}</strong></div>
        <div class="list-item">${t('totalCost')}: <span class="money">${fmtMoney(p.costs)}</span></div>
        <div class="list-item"><strong>${t('profit')}: <span class="money">${fmtMoney(p.profit)}</span></strong></div>
        <div class="list-item"><strong>${t('margin')}: ${p.margin}%</strong></div>
      </div>
    </div>
    <div class="card"><div class="section-title">${t('brandPL')} — ${esc(state.brand)}</div><div class="list">
      <div class="list-item">${t('sales')}: <span class="money">${fmtMoney(b.sales)}</span></div>
      <div class="list-item">${t('totalCost')}: <span class="money">${fmtMoney(b.costs)}</span></div>
      <div class="list-item"><strong>${t('profit')}: <span class="money">${fmtMoney(b.profit)}</span></strong></div>
      <div class="list-item"><strong>${t('margin')}: ${b.margin}%</strong></div>
    </div></div>
    <div class="card"><div class="section-title">${t('cashFlow')}</div><div class="list">
      <div class="list-item">${t('cashIn')}: <span class="money">${fmtMoney(p.sales)}</span></div>
      <div class="list-item">${t('cashOut')}: <span class="money">${fmtMoney(p.costs)}</span></div>
      <div class="list-item"><strong>${t('balance')}: <span class="money">${fmtMoney(p.sales - p.costs)}</span></strong></div>
    </div>
    <div class="note">${t('financeNote')}</div></div>`;
}

// ---------------------------------------------------------------------------
// Call center — statuses translated, driver assignment without prompt()
// ---------------------------------------------------------------------------
function renderCallCenter() {
  const calls = scoped(state.customerCalls);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('callCenter')}</div><div class="form-grid">
      <input id="cc-phone" class="input" placeholder="${t('phone')}" />
      <input id="cc-name" class="input" placeholder="${t('customerName')}" />
      <select id="cc-type" class="select">
        <option value="delivery">${t('delivery')}</option>
        <option value="takeaway">${t('takeaway')}</option>
        <option value="table">${t('table')}</option>
      </select>
      <input id="cc-zone" class="input" placeholder="${t('zone')}" />
      <textarea id="cc-order" class="textarea" placeholder="${t('orderDetails')}"></textarea>
      <input id="cc-prep" class="input" type="number" min="1" placeholder="${t('prepTime')}" value="20" />
      <button class="btn primary" data-action="createCallOrder">${t('createOrder')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('orders')}</div><div class="list">${calls.length ? calls.map(o => `
      <div class="list-item">
        <span class="badge ${o.status === 'delivered' ? 'good' : o.status === 'out' ? 'preparing' : 'pending'}">${esc(statusLabel(o.status))}</span>
        <div><strong>${esc(o.customerName)}</strong> — ${esc(o.phone)}</div>
        <div class="muted">${esc(o.orderText)}</div>
        <div class="small">${t('driver')}: ${esc(o.driver || '-')} · ${t('timeLeft')}: ${minutesLeft(o.readyAt)} ${t('minutes')}</div>
        <div class="note-row">
          <select class="select compact" data-driver-select="${esc(o.id)}">${DRIVERS.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select>
          <button class="btn soft mini" data-action="assignDriver" data-arg="${esc(o.id)}">${t('assign')}</button>
        </div>
        <div class="btn-row">
          <button class="btn soft mini" data-action="setCallStatus" data-arg="${esc(o.id)}" data-arg2="out">${t('out')}</button>
          <button class="btn soft mini" data-action="setCallStatus" data-arg="${esc(o.id)}" data-arg2="delivered">${t('done')}</button>
        </div>
      </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function createCallOrder() {
  const phone = document.getElementById('cc-phone').value.trim();
  const customerName = document.getElementById('cc-name').value.trim();
  const type = document.getElementById('cc-type').value;
  const zone = document.getElementById('cc-zone').value.trim();
  const orderText = document.getElementById('cc-order').value.trim();
  const prep = Math.max(1, Number(document.getElementById('cc-prep').value) || 20);
  if (!phone || !customerName || !orderText) { toast(t('noData'), 'err'); return; }
  const id = nextSeq('CC');
  state.customerCalls.unshift({
    brand: state.brand, branch: state.branch, id, phone, customerName, type, zone, orderText,
    status: 'new', driver: '', createdAt: new Date().toISOString(),
    readyAt: new Date(Date.now() + prep * 60000).toISOString()
  });
  upsertCustomer(customerName, phone, 'CC');
  saveState(); render('callcenter'); toast(t('saved'), 'ok');
}
function assignDriver(id) {
  const call = state.customerCalls.find(c => c.id === id);
  if (!call) return;
  const sel = content.querySelector('select[data-driver-select="' + id + '"]');
  if (sel && sel.value) call.driver = sel.value;
  call.status = 'assigned';
  saveState(); render('callcenter'); toast(t('saved'), 'ok');
}
function setCallStatus(id, status) {
  const call = state.customerCalls.find(c => c.id === id);
  if (!call) return;
  call.status = status;
  saveState(); render('callcenter');
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
function renderCRM() {
  const customers = scoped(state.customers);
  content.innerHTML = `<div class="card"><div class="section-title">${t('crmCustomers')}</div><div class="list">${customers.length ? customers.map(c => `
    <div class="list-item"><div><strong>${esc(c.name)}</strong> — ${esc(c.phone)}</div>
    <div class="muted">${t('payments')}: ${esc(c.lastPayment || '-')}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function upsertCustomer(name, phone, lastPayment) {
  const idx = state.customers.findIndex(x => x.brand === state.brand && x.branch === state.branch && x.phone === phone);
  if (idx >= 0) {
    state.customers[idx].name = name;
    state.customers[idx].lastPayment = lastPayment;
  } else {
    state.customers.push({ brand: state.brand, branch: state.branch, name, phone, lastPayment });
  }
}

// ---------------------------------------------------------------------------
// Attendance — real hours from ISO timestamps, overtime vs. shift length
// ---------------------------------------------------------------------------
function shiftHours(shiftName) {
  const s = (state.shifts || []).find(x => x.name === shiftName);
  if (!s) return 0;
  const [sh, sm] = String(s.start).split(':').map(Number);
  const [eh, em] = String(s.end).split(':').map(Number);
  const startH = (sh || 0) + (sm || 0) / 60;
  let endH = (eh || 0) + (em || 0) / 60;
  if (endH <= startH) endH += 24;
  return endH - startH;
}
function renderAttendance() {
  const rows = scoped(state.attendance);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('attendanceByLocation')}</div>
      <div class="muted">${t('currentLocation')}: ${esc(state.location.label || t('noData'))}</div>
      <div class="form-grid">
        <input id="emp-name" class="input" placeholder="${t('employee')}" />
        <select id="emp-shift" class="select">${(state.shifts || []).map(s => `<option value="${esc(s.name)}">${esc(s.name)} (${esc(s.start)}-${esc(s.end)})</option>`).join('')}</select>
        <div class="btn-row">
          <button class="btn primary" data-action="checkIn">${t('checkIn')}</button>
          <button class="btn soft" data-action="checkOut">${t('checkOut')}</button>
          <button class="btn soft" data-action="getLocation">${t('location')}</button>
        </div>
      </div></div>
    <div class="card"><div class="section-title">${t('attendance')}</div><div class="list">${rows.length ? rows.map(r => `
      <div class="list-item"><div><strong>${esc(r.employee)}</strong> — ${esc(r.shift)}</div>
      <div class="muted">${t('checkIn')}: ${fmtDateTime(r.checkInAt)} · ${t('checkOut')}: ${r.checkOutAt ? fmtDateTime(r.checkOutAt) : '-'}</div>
      <div class="small">${t('hoursWorked')}: ${r.hoursWorked || 0} · ${t('overtime')}: ${r.overtime || 0}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function getCurrentLocation() {
  if (!navigator.geolocation) {
    state.location = { lat: null, lng: null, label: 'Geolocation unsupported' };
    saveState(); render(currentTab); return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    state.location = {
      lat: pos.coords.latitude, lng: pos.coords.longitude,
      label: pos.coords.latitude.toFixed(5) + ', ' + pos.coords.longitude.toFixed(5)
    };
    saveState(); render(currentTab);
  }, () => {
    state.location = { lat: null, lng: null, label: 'Location unavailable' };
    saveState(); render(currentTab);
  });
}
function checkIn() {
  const employee = document.getElementById('emp-name').value.trim();
  if (!employee) { toast(t('noData'), 'err'); return; }
  const open = state.attendance.find(x => x.brand === state.brand && x.branch === state.branch && x.employee === employee && !x.checkOutAt);
  if (open) { toast(t('alreadyCheckedIn'), 'err'); return; }
  const shift = document.getElementById('emp-shift').value;
  state.attendance.unshift({
    brand: state.brand, branch: state.branch, employee, shift,
    checkInAt: new Date().toISOString(), checkOutAt: '',
    location: state.location.label, hoursWorked: 0, overtime: 0
  });
  saveState(); render('attendance'); toast(t('saved'), 'ok');
}
function checkOut() {
  const employee = document.getElementById('emp-name').value.trim();
  if (!employee) { toast(t('noData'), 'err'); return; }
  const rec = state.attendance.find(x => x.brand === state.brand && x.branch === state.branch && x.employee === employee && !x.checkOutAt);
  if (!rec) { toast(t('noData'), 'err'); return; }
  rec.checkOutAt = new Date().toISOString();
  const hours = Math.max(0, (new Date(rec.checkOutAt).getTime() - new Date(rec.checkInAt).getTime()) / 3600000);
  rec.hoursWorked = Math.round(hours * 100) / 100;
  rec.overtime = Math.round(Math.max(0, hours - shiftHours(rec.shift)) * 100) / 100;
  saveState(); render('attendance'); toast(t('saved'), 'ok');
}

// ---------------------------------------------------------------------------
// Payments & Security
// ---------------------------------------------------------------------------
function renderPayments() {
  const payments = scoped(state.payments);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('paymentCreate')}</div><div class="form-grid">
      <input id="pay-customer" class="input" placeholder="${t('customerName')}" />
      <input id="pay-phone" class="input" placeholder="${t('phone')}" />
      <input id="pay-amount" class="input" type="number" min="0" step="0.01" placeholder="${t('amount')}" />
      <select id="pay-method" class="select">
        <option value="NFC">${t('nfc')}</option>
        <option value="Card">${t('card')}</option>
        <option value="QR">${t('qr')}</option>
        <option value="Cash">${t('cash')}</option>
        <option value="Wallet">${t('wallet')}</option>
        <option value="Split">${t('split')}</option>
      </select>
      <button class="btn primary" data-action="createPayment">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('payments')}</div><div class="list">${payments.length ? payments.map(p => `
      <div class="list-item"><span class="badge good">${esc(p.method)}</span>
      <div><strong>${esc(p.customer)}</strong> — <span class="money">${fmtMoney(p.amount)}</span></div>
      <div class="muted">${esc(p.phone)} · ${esc(p.txId)}</div>
      <div class="small">${fmtDateTime(p.at)}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function createPayment() {
  const customer = document.getElementById('pay-customer').value.trim();
  const phone = document.getElementById('pay-phone').value.trim();
  const amount = Number(document.getElementById('pay-amount').value);
  const method = document.getElementById('pay-method').value;
  if (!customer || !phone || !Number.isFinite(amount) || amount <= 0) { toast(t('noData'), 'err'); return; }
  const txId = nextSeq('TX');
  const at = new Date().toISOString();
  state.payments.unshift({ brand: state.brand, branch: state.branch, customer, phone, amount, method, txId, at });
  upsertCustomer(customer, phone, method);
  state.securityLogs.unshift({ brand: state.brand, branch: state.branch, type: 'payment', detail: `${method} ${txId} — ${amount.toFixed(2)}`, time: at });
  saveState(); render('payments'); toast(t('saved'), 'ok');
}

function renderSecurity() {
  const logs = scoped(state.securityLogs);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('securityLayers')}</div><div class="list">
      <div class="list-item"><span class="badge sec">Passkey / Biometric</span> ${t('secPasskey')}</div>
      <div class="list-item"><span class="badge sec">Brand / Branch isolation</span> ${t('secIsolation')}</div>
      <div class="list-item"><span class="badge sec">Audit logs</span> ${t('secAudit')}</div>
      <div class="list-item"><span class="badge warn">MVP</span> ${t('secMvp')}</div>
    </div></div>
    <div class="card"><div class="section-title">${t('securityLogs')}</div><div class="list">${logs.length ? logs.map(l => `
      <div class="list-item"><div><strong>${esc(l.type)}</strong></div>
      <div class="muted">${esc(l.detail)}</div><div class="small">${fmtDateTime(l.time)}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
function simulateBiometric() {
  state.securityLogs.unshift({
    brand: state.brand, branch: state.branch, type: 'login',
    detail: 'Passkey/biometric simulated', time: new Date().toISOString()
  });
  saveState(); toast(t('saved'), 'ok'); render('security');
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
function renderReports() {
  const orders = scoped(state.orders);
  const calls = scoped(state.customerCalls);
  const payments = scoped(state.payments);
  const b = brandFigures(state.brand);
  const byStatus = ['preparing', 'ready', 'picked'].map(s =>
    `${statusLabel(s)}: ${orders.filter(o => o.status === s).length}`).join(' · ');
  content.innerHTML = `
    <div class="hero"><div class="section-title">${t('reports')}</div><div class="small">${esc(state.brand)}</div></div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi(t('brandMargin'), b.margin + '%', t('brand'))}
    </div>
    <div class="card"><div class="section-title">${t('orders')}</div><div class="list-item small">${esc(byStatus)}</div></div>
    <div class="card"><div class="section-title">${t('aiBrief')}</div><div class="list">${aiBrief().map(n => `<div class="list-item">${esc(n)}</div>`).join('')}</div></div>`;
}

// ---------------------------------------------------------------------------
// Render dispatcher + action delegation (CSP-safe: no inline handlers)
// ---------------------------------------------------------------------------
const TABS = ['overview', 'pos', 'orders', 'kds', 'pickup', 'apps', 'printing', 'expenses', 'recipe', 'geidea', 'finance', 'callcenter', 'crm', 'attendance', 'payments', 'security', 'reports'];

let currentTab = 'overview';
let tickHandle = null;

function setActive(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}

function render(tab) {
  currentTab = tab;
  setActive(tab);
  try { history.replaceState(null, '', '#' + tab); } catch { /* ignore */ }
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  if (tab === 'kds' || tab === 'orders' || tab === 'pickup') {
    tickHandle = setInterval(() => { if (currentTab === tab) render(tab); }, 30000);
  }
  switch (tab) {
    case 'overview': renderOverview(); break;
    case 'pos': renderPOS(); break;
    case 'orders': renderOrders(); break;
    case 'kds': renderKDS(); break;
    case 'pickup': renderPickup(); break;
    case 'apps': renderApps(); break;
    case 'printing': renderPrinting(); break;
    case 'expenses': renderExpenses(); break;
    case 'recipe': renderRecipe(); break;
    case 'geidea': renderGeidea(); break;
    case 'finance': renderFinance(); break;
    case 'callcenter': renderCallCenter(); break;
    case 'crm': renderCRM(); break;
    case 'attendance': renderAttendance(); break;
    case 'payments': renderPayments(); break;
    case 'security': renderSecurity(); break;
    case 'reports': renderReports(); break;
  }
}

const ACTIONS = {
  setOrderMode: arg => setOrderMode(arg),
  selectTable: arg => selectTable(arg),
  addToCart: arg => addToCart(Number(arg)),
  changeQty: (arg, arg2) => changeQty(Number(arg), Number(arg2)),
  clearCart: () => clearCart(),
  placeOrder: arg => placeOrder(arg),
  setPosStatus: (arg, arg2) => setPosOrderStatus(arg, arg2),
  savePrinterSettings: () => savePrinterSettings(),
  addExpense: () => addExpense(),
  addRecipe: () => addRecipe(),
  autoMap: () => autoMap(),
  runImport: () => runImport(),
  createCallOrder: () => createCallOrder(),
  assignDriver: arg => assignDriver(arg),
  setCallStatus: (arg, arg2) => setCallStatus(arg, arg2),
  checkIn: () => checkIn(),
  checkOut: () => checkOut(),
  getLocation: () => getCurrentLocation(),
  createPayment: () => createPayment()
};

content.addEventListener('click', e => {
  const target = e.target instanceof Element ? e.target : null;
  const btn = target && target.closest('[data-action]');
  if (!btn) return;
  const fn = ACTIONS[btn.dataset.action];
  if (fn) fn(btn.dataset.arg, btn.dataset.arg2, btn);
});

// Text inputs with data-store/data-dfield persist on every keystroke
// (values survive full re-renders — no more lost form data).
content.addEventListener('input', e => {
  const target = e.target instanceof Element ? e.target : null;
  const field = target && target.dataset ? target.dataset.dfield : null;
  if (!field) return;
  const store = target.dataset.store || 'deliveryForm';
  if (!state[store] || typeof state[store] !== 'object') state[store] = {};
  state[store][field] = target.value;
  saveStateDebounced();
});

if (typeof module !== 'undefined') {
  module.exports = { parseCSV, parseAmount, branchFigures, brandFigures, TABS };
}
