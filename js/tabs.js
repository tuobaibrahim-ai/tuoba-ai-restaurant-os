// ============================================================================
// TUOBA ERP — operations screens: overview, POS, orders, KDS, pickup, apps,
// printing, expenses, recipes, Geidea, finance, call center, CRM, attendance,
// payments, security, reports. All mutations go through the API.
// ============================================================================

const content = document.getElementById('content');

// ---------------------------------------------------------------------------
// Domain math (client-side views over server data)
// ---------------------------------------------------------------------------
function branchFigures(brand, branch) {
  const fin = (state.finance || []).find(x => x.brand === brand && x.branch === branch) || { foodCost: 0, payroll: 0, rent: 0, other: 0 };
  const geideaRec = (state.geidea || []).find(x => x.brand === brand && x.branch === branch);
  const geideaSales = Number(geideaRec && geideaRec.total) || 0;
  const posSales = (state.orders || []).filter(o => o.brand === brand && o.branch === branch)
    .reduce((a, o) => a + (Number(o.subtotal) || 0), 0);
  const paySales = (state.payments || []).filter(x => x.brand === brand && x.branch === branch)
    .reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const expenses = (state.expenses || []).filter(x => x.brand === brand && x.branch === branch)
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
const isToday = iso => {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
// Daily cash view: today's sales minus today's expense receipts.
function todayFigures(brand, branch) {
  const inScope = x => x.brand === brand && x.branch === branch;
  const sales =
    (state.orders || []).filter(o => inScope(o) && isToday(o.createdAt)).reduce((a, o) => a + (Number(o.subtotal) || 0), 0) +
    (state.payments || []).filter(x => inScope(x) && isToday(x.at)).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const exp = (state.expenses || []).filter(x => inScope(x) && isToday(x.at)).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  return { sales, exp, profit: sales - exp };
}

function brandFigures(brand) {
  const acc = { sales: 0, costs: 0, profit: 0 };
  Object.keys(settings().brands).filter(b => b === brand).forEach(b => {
    (settings().brands[b] || []).forEach(branch => {
      const f = branchFigures(b, branch);
      acc.sales += f.sales; acc.costs += f.costs; acc.profit += f.profit;
    });
  });
  acc.margin = acc.sales > 0 ? Math.round((acc.profit / acc.sales) * 100) : 0;
  return acc;
}
function aiBrief() {
  const openOrders = scoped(state.orders).filter(o => o.status !== 'picked').length;
  const openCalls = scoped(state.calls).filter(o => o.status !== 'delivered').length;
  const lowStock = (state.stock || []).filter(s => Number(s.qty) <= Number(s.reorderLevel)).length;
  const p = branchFigures(state.brandSel, state.branchSel);
  const notes = [];
  if (openOrders) notes.push(`${openOrders} ${t('orders')}`);
  if (openCalls) notes.push(`${openCalls} ${t('callCenter')}`);
  if (lowStock) notes.push(`${lowStock} ${t('lowStock')}`);
  const day = todayFigures(state.brandSel, state.branchSel);
  if (day.sales > 0) notes.push(`${t('profitToday')}: ${fmtMoney(day.profit)}`);
  else notes.push(t('noSales'));
  return notes;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function renderOverview() {
  const orders = scoped(state.orders);
  const calls = scoped(state.calls);
  const payments = scoped(state.payments);
  const p = branchFigures(state.brandSel, state.branchSel);
  const dayF = todayFigures(state.brandSel, state.branchSel);
  content.innerHTML = `
    <div class="hero">
      <div class="section-title">${t('dashboard')}</div>
      <div class="small">${esc(state.brandSel)} · ${esc(state.branchSel)}</div>
    </div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi(t('crm'), scoped(state.customers).length, 'CRM')}
      ${kpi(t('sales'), fmtMoney(p.sales), t('finance'))}
      ${dayF.sales > 0 ? kpi(t('profitToday'), fmtMoney(dayF.profit), t('today')) : kpi(t('profitToday'), '—', t('noSales'))}
    </div>
    ${(me().role !== 'cashier' ? `
    <div class="card"><div class="section-title">${t('inventory')}</div>
      <div class="list">${(state.stock || []).filter(s => Number(s.qty) <= Number(s.reorderLevel)).slice(0, 4).map(s =>
        `<div class="list-item warn-item">⚠ ${esc(s.name)} — <span class="money">${s.qty} ${esc(s.unit)}</span> <span class="small">(${t('reorderLevel')}: ${s.reorderLevel})</span></div>`).join('') || `<div class="muted">${t('noData')}</div>`}</div>
    </div>` : '')}
    <div class="card">
      <div class="section-title">${t('aiBrief')}</div>
      <div class="list">${aiBrief().map(n => `<div class="list-item">${esc(n)}</div>`).join('')}</div>
    </div>`;
}
registerScreen('overview', renderOverview);

// ---------------------------------------------------------------------------
// POS
// ---------------------------------------------------------------------------
function cartTotal() { return ui.cart.reduce((a, b) => a + (Number(b.price) || 0) * (Number(b.qty) || 0), 0); }

function renderPOS() {
  const menu = brandScoped(state.menu).filter(m => m.active !== false);
  const subtotal = cartTotal();
  const taxRate = Number(settings().taxRate) || 0;
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + tax;
  const df = ui.deliveryForm;
  const modeBtn = (mode, label) => `<button class="btn ${ui.currentMode === mode ? 'primary' : 'soft'}" data-action="setOrderMode" data-arg="${mode}">${label}</button>`;
  content.innerHTML = `
    <div class="card">
      <div class="section-title">${t('orderType')}</div>
      <div class="btn-row">${modeBtn('table', t('table'))}${modeBtn('takeaway', t('takeaway'))}${modeBtn('delivery', t('delivery'))}</div>
    </div>
    ${ui.currentMode === 'table' ? `
    <div class="card">
      <div class="section-title">${t('tables')}</div>
      <div class="table-grid">${getTables().map(ti => `<button class="table-card ${ti.occupied ? 'occupied' : ''}" data-action="selectTable" data-arg="${esc(ti.id)}">${esc(ti.id)}</button>`).join('')}</div>
      <div class="note">${t('currentTable')}: ${esc(ui.currentTable)}</div>
    </div>` : ''}
    ${ui.currentMode === 'delivery' ? `
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
      <div class="menu-grid">${menu.map(m => `<button class="menu-btn" data-action="addToCart" data-arg="${m.id}"><strong>${esc(menuName(m))}</strong><div class="muted money">${fmtMoney(m.price)}</div><div class="small">${esc(tf('prepMin', { n: m.prep }))}</div></button>`).join('') || `<div class="muted">${t('noData')}</div>`}</div>
    </div>
    <div class="card">
      <div class="section-title">${t('cart')}</div>
      <div class="list">${ui.cart.length ? ui.cart.map((i, idx) => `
        <div class="cart-row">
          <div><strong>${esc(menuName(i))}</strong><div class="muted money">${i.qty} × ${fmtMoney(i.price)}</div></div>
          <div><button class="btn soft mini" data-action="changeQty" data-arg="${idx}" data-arg2="1">+</button><button class="btn soft mini" data-action="changeQty" data-arg="${idx}" data-arg2="-1">−</button></div>
        </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div>
      ${ui.cart.length ? `
      <div class="totals">
        <div class="note-row"><span class="muted">${t('subtotal')}</span><span class="money">${fmtMoney(subtotal)}</span></div>
        <div class="note-row"><span class="muted">${t('tax')} (${taxRate}%)</span><span class="money">${fmtMoney(tax)}</span></div>
        <div class="note-row grand"><span><strong>${t('total')}</strong></span><strong class="money">${fmtMoney(total)}</strong></div>
      </div>` : ''}
      <div class="btn-row">
        <button class="btn soft" data-action="clearCart">${t('clear')}</button>
        <button class="btn primary" data-action="placeOrder" data-arg="cash">${t('cash')}</button>
        <button class="btn primary" data-action="placeOrder" data-arg="card">${t('card')}</button>
      </div>
    </div>`;
}
registerScreen('pos', renderPOS);

function addToCart(id) {
  const item = (state.menu || []).find(m => m.id === Number(id));
  if (!item) return;
  const existing = ui.cart.find(x => x.id === item.id);
  if (existing) existing.qty += 1; else ui.cart.push({ id: item.id, qty: 1, price: item.price, item });
  render('pos');
}
function changeQty(idx, delta) {
  if (!ui.cart[idx]) return;
  ui.cart[idx].qty += delta;
  if (ui.cart[idx].qty <= 0) ui.cart.splice(idx, 1);
  render('pos');
}
function clearCart() { ui.cart = []; render('pos'); }
function setOrderMode(mode) { ui.currentMode = mode; render('pos'); }
function selectTable(id) { ui.currentTable = id; render('pos'); }

async function placeOrder(payment) {
  if (!ui.cart.length) { toast(t('emptyCart'), 'err'); return; }
  const payload = {
    ...currentScope(), mode: ui.currentMode, payment,
    items: ui.cart.map(i => ({ id: i.id, qty: i.qty }))
  };
  if (ui.currentMode === 'table') payload.table = ui.currentTable;
  if (ui.currentMode === 'delivery') payload.customer = { ...ui.deliveryForm };
  try {
    const { order } = await api('/api/orders', 'POST', payload);
    state.orders.unshift(order);
    ui.cart = [];
    ui.deliveryForm = { name: '', phone: '', app: '', address: '' };
    render('orders'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('setOrderMode', setOrderMode);
registerAction('selectTable', selectTable);
registerAction('addToCart', arg => addToCart(arg));
registerAction('changeQty', (a, b) => changeQty(Number(a), Number(b)));
registerAction('clearCart', clearCart);
registerAction('placeOrder', placeOrder);

// ---------------------------------------------------------------------------
// Orders / KDS / Pickup
// ---------------------------------------------------------------------------
function orderCard(o) {
  const left = minutesLeft(o.readyAt);
  return `
    <div class="list-item">
      <span class="badge ${o.status === 'preparing' ? 'preparing' : o.status === 'ready' ? 'ready' : 'picked'}">${esc(statusLabel(o.status))}</span>
      <div><strong>${esc(o.orderNo)}</strong> — ${esc(o.mode)} — <span class="money">${fmtMoney(o.total)}</span></div>
      <div class="muted">${o.table ? t('table') + ': ' + esc(o.table) + ' — ' : ''}${t('prepTime')}: ${o.prepMinutes} — ${t('timeLeft')}: ${left} ${t('minutes')}</div>
      ${o.customer && o.customer.name ? `<div class="small">${esc(o.customer.name)} · ${esc(o.customer.phone || '')}</div>` : ''}
      <div class="small">${t('createdBy')}: ${esc(o.createdBy || '—')}</div>
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
registerScreen('orders', renderOrders);

async function setPosOrderStatus(orderNo, status) {
  try {
    const { order } = await api('/api/orders/' + orderNo + '/status', 'POST', { status });
    const idx = state.orders.findIndex(o => o.orderNo === orderNo);
    if (idx >= 0) state.orders[idx] = order;
    render('orders');
  } catch (err) { toastErr(err); }
}
registerAction('setPosStatus', setPosOrderStatus);

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
registerScreen('kds', renderKDS);

function renderPickup() {
  const orders = scoped(state.orders).filter(o => o.status === 'ready');
  content.innerHTML = `<div class="card"><div class="section-title">${t('pickupScreen')}</div><div class="list">${orders.length ? orders.map(o => `
    <div class="list-item"><span class="badge ready">${t('ready')}</span><div><strong>${esc(o.orderNo)}</strong></div>
    <div class="muted">${esc(o.mode)}${o.customer && o.customer.name ? ' — ' + esc(o.customer.name) : ''}</div>
    <div class="small">${t('pickupCopies')}: ${o.copies ? o.copies.pickup : 1}</div></div>`).join('') : `<div class="muted">${t('noOrders')}</div>`}</div></div>`;
}
registerScreen('pickup', renderPickup);

// ---------------------------------------------------------------------------
// Apps / Printing
// ---------------------------------------------------------------------------
const DELIVERY_LINKS = [
  { name: 'Talabat', url: 'https://www.talabat.com/egypt' },
  { name: 'elmenus', url: 'https://elmenus.com/' },
  { name: 'Mrsool', url: 'https://mrsool.co/' },
  { name: 'Rabbit', url: 'https://rabbitmart.com/' },
  { name: 'HurryApp', url: 'https://play.google.com/store/apps/details?id=com.tawaf.hurryapp' }
];
function renderApps() {
  content.innerHTML = `<div class="card"><div class="section-title">${t('apps')}</div><div class="channel-grid">${DELIVERY_LINKS.map(x => `<a class="link-btn" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.name)}</strong><div class="muted">${t('openLink')}</div></a>`).join('')}</div></div>`;
}
registerScreen('apps', renderApps);

function renderPrinting() {
  const pc = settings().printerCopies || { cashier: 1, kitchen: 1, pickup: 1 };
  const editable = me().role !== 'cashier';
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('printingSettings')}</div><div class="form-grid">
      <input id="cashier-copies" class="input" type="number" min="1" max="9" value="${Number(pc.cashier) || 1}" ${editable ? '' : 'disabled'} />
      <input id="kitchen-copies" class="input" type="number" min="1" max="9" value="${Number(pc.kitchen) || 1}" ${editable ? '' : 'disabled'} />
      <input id="pickup-copies" class="input" type="number" min="1" max="9" value="${Number(pc.pickup) || 1}" ${editable ? '' : 'disabled'} />
      ${editable ? `<button class="btn primary" data-action="savePrinterSettings">${t('save')}</button>` : `<div class="note">${t('forbidden')}</div>`}
    </div></div>`;
}
registerScreen('printing', renderPrinting);

async function savePrinterSettings() {
  try {
    const payload = {
      cashier: Math.max(1, Number(document.getElementById('cashier-copies').value) || 1),
      kitchen: Math.max(1, Number(document.getElementById('kitchen-copies').value) || 1),
      pickup: Math.max(1, Number(document.getElementById('pickup-copies').value) || 1)
    };
    const { settings: s } = await api('/api/settings/printer-copies', 'POST', payload);
    state.settings = s;
    render('printing'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('savePrinterSettings', savePrinterSettings);

// ---------------------------------------------------------------------------
// Expenses (receipt image compressed client-side, capped server-side)
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
      <div class="small">${t('createdBy')}: ${esc(e.createdBy || '—')} · ${fmtDateTime(e.at)}</div>
      ${e.receiptData ? `<img class="receipt-thumb" src="${e.receiptData}" alt="receipt" />` : ''}
      </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
  document.getElementById('exp-receipt').addEventListener('change', handleReceiptPreview);
}
registerScreen('expenses', renderExpenses);

async function addExpense() {
  const title = document.getElementById('exp-title').value.trim();
  const amount = Number(document.getElementById('exp-amount').value);
  const note = document.getElementById('exp-note').value.trim();
  const file = document.getElementById('exp-receipt').files && document.getElementById('exp-receipt').files[0];
  if (!title || !Number.isFinite(amount) || amount <= 0) { toast(t('noData'), 'err'); return; }
  const receiptData = file ? await compressImage(await readImage(file)) : '';
  try {
    const { expense } = await api('/api/expenses', 'POST', { ...currentScope(), title, amount, note, receiptName: file ? file.name : '', receiptData });
    state.expenses.unshift(expense);
    render('expenses'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('addExpense', addExpense);

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------
function renderRecipe() {
  const items = scoped(state.recipes);
  const canAdd = me().role !== 'cashier';
  content.innerHTML = `
    ${canAdd ? `
    <div class="card"><div class="section-title">${t('addRecipe')}</div><div class="form-grid">
      <input id="r-name" class="input" placeholder="${t('title')}" />
      <input id="r-cost" class="input" type="number" min="0" step="0.01" placeholder="${t('cost')}" />
      <input id="r-price" class="input" type="number" min="0" step="0.01" placeholder="${t('price')}" />
      <textarea id="r-ing" class="textarea" placeholder="${t('ingredients')}"></textarea>
      <button class="btn primary" data-action="addRecipe">${t('save')}</button>
    </div></div>` : ''}
    <div class="card"><div class="section-title">${t('recipeIntelligence')}</div><div class="list">${items.length ? items.map(r => `
      <div class="list-item"><span class="badge ${Number(r.margin) >= 40 ? 'good' : 'pending'}">${r.margin}%</span>
      <div><strong>${esc(r.name)}</strong></div>
      <div class="muted">${t('cost')}: ${fmtMoney(r.cost)} — ${t('price')}: ${fmtMoney(r.price)}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
registerScreen('recipe', renderRecipe);

async function addRecipe() {
  const name = document.getElementById('r-name').value.trim();
  const cost = Number(document.getElementById('r-cost').value);
  const price = Number(document.getElementById('r-price').value);
  const ingredients = document.getElementById('r-ing').value.trim();
  if (!name || !Number.isFinite(cost) || cost <= 0 || !Number.isFinite(price) || price <= 0) { toast(t('noData'), 'err'); return; }
  try {
    const { recipe } = await api('/api/recipes', 'POST', { ...currentScope(), name, cost, price, ingredients });
    state.recipes.unshift(recipe);
    render('recipe'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('addRecipe', addRecipe);

// ---------------------------------------------------------------------------
// Geidea import (CSV parsing client-side, figures stored via API)
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
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join('.');
    else s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}
function normalizeHeader(s) { return String(s || '').toLowerCase().replace(/[_\-\s]+/g, ''); }

function renderGeidea() {
  const canImport = me().role !== 'cashier';
  content.innerHTML = `
    ${canImport ? `
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
    </div></div>` : ''}
    <div class="card"><div class="section-title">${t('importHistory')}</div><div id="results-box"></div></div>`;
  if (canImport) {
    document.getElementById('file-input').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const parsed = parseCSV(await file.text());
      geideaHeaders = parsed.headers; geideaRows = parsed.rows; geideaFileName = file.name;
      fillMapSelects(); renderHeaders(); autoMap();
    });
  }
  renderImportResults();
}
registerScreen('geidea', renderGeidea);

function fillMapSelects() {
  ['map-date', 'map-time', 'map-amount'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = '<option value="">--</option>' + geideaHeaders.map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('');
  });
}
function renderHeaders() {
  const box = document.getElementById('columns-box');
  if (box) box.innerHTML = geideaHeaders.length ? geideaHeaders.map(h => `<div class="list-item">${esc(h)}</div>`).join('') : '—';
}
function autoMap() {
  const guess = patterns => geideaHeaders.find(h => patterns.some(p => normalizeHeader(h).includes(p))) || '';
  const d = document.getElementById('map-date'); if (d) d.value = guess(['date', 'تاريخ']);
  const tm = document.getElementById('map-time'); if (tm) tm.value = guess(['time', 'وقت', 'saat']);
  const am = document.getElementById('map-amount'); if (am) am.value = guess(['amount', 'total', 'gross', 'net', 'مبلغ', 'قيمة', 'tutar']);
}
function renderImportResults() {
  const box = document.getElementById('results-box');
  if (!box) return;
  const rec = (state.geidea || []).find(x => x.brand === state.brandSel && x.branch === state.branchSel);
  const history = (state.imports || []).filter(h => h.brand === state.brandSel && h.branch === state.branchSel).slice(0, 5);
  box.innerHTML = `<div class="list">
    ${rec ? `<div class="list-item"><strong>${t('lastImport')}</strong><div class="money">${fmtMoney(rec.total)}</div>
      <div class="muted">${t('count')}: ${rec.count} · ${t('avg')}: ${fmtMoney(rec.avg)}</div>
      ${rec.period ? `<div class="small">${esc(rec.period)}</div>` : ''}
      ${rec.fileName ? `<div class="small">${esc(rec.fileName)}</div>` : ''}</div>` : `<div class="muted">${t('noData')}</div>`}
    ${history.length > 1 ? `<div class="section-title">${t('importHistory')}</div>` + history.slice(1).map(h => `
      <div class="list-item"><div class="note-row"><span class="money">${fmtMoney(h.total)}</span><span class="small">${fmtDateTime(h.at)}</span></div>
      ${h.fileName ? `<div class="small">${esc(h.fileName)}</div>` : ''}</div>`).join('') : ''}
  </div>`;
}
async function runImport() {
  const amountColEl = document.getElementById('map-amount');
  if (!amountColEl || !amountColEl.value) { toast(t('noData'), 'err'); return; }
  const dateCol = document.getElementById('map-date').value;
  const timeCol = document.getElementById('map-time').value;
  const total = geideaRows.reduce((a, r) => a + parseAmount(r[amountColEl.value]), 0);
  const count = geideaRows.length;
  const period = (dateCol || timeCol) && geideaRows.length
    ? [dateCol ? geideaRows[0][dateCol] : '', timeCol ? geideaRows[0][timeCol] : ''].filter(Boolean).join(' ')
    : '';
  try {
    const { record } = await api('/api/geidea/import', 'POST', { ...currentScope(), total, count, period, fileName: geideaFileName });
    const idx = state.geidea.findIndex(x => x.brand === state.brandSel && x.branch === state.branchSel);
    if (idx >= 0) state.geidea[idx] = record; else state.geidea.unshift(record);
    state.imports.unshift(record);
    renderImportResults(); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('autoMap', autoMap);
registerAction('runImport', runImport);

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------
function renderFinance() {
  const p = branchFigures(state.brandSel, state.branchSel);
  const b = brandFigures(state.brandSel);
  const hasSales = p.sales > 0;
  const bHasSales = b.sales > 0;
  const canEdit = me().role !== 'cashier';
  const fin = p.fin;
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('branchPL')} — ${esc(state.branchSel)}</div>
      <div class="section-title">${t('orderBreakdown')}</div><div class="list">
        <div class="list-item">${t('geidea')}: <span class="money">${fmtMoney(p.geideaSales)}</span></div>
        <div class="list-item">${t('pos')}: <span class="money">${fmtMoney(p.posSales)}</span></div>
        <div class="list-item">${t('payments')}: <span class="money">${fmtMoney(p.paySales)}</span></div>
      </div>
      <div class="section-title">${t('costBreakdown')}</div><div class="list">
        <div class="list-item">${t('cost')}: <span class="money">${fmtMoney(fin.foodCost)}</span></div>
        <div class="list-item">${t('payroll')}: <span class="money">${fmtMoney(fin.payroll)}</span></div>
        <div class="list-item">${t('rent')}: <span class="money">${fmtMoney(fin.rent)}</span></div>
        <div class="list-item">${t('otherCosts')}: <span class="money">${fmtMoney(fin.other)}</span></div>
        <div class="list-item">${t('expenses')}: <span class="money">${fmtMoney(p.expenses)}</span></div>
      </div>
      <div class="list">
        <div class="list-item">${t('sales')}: <strong class="money">${fmtMoney(p.sales)}</strong></div>
        <div class="list-item">${t('totalCost')}: <span class="money">${fmtMoney(p.costs)}</span></div>
        <div class="list-item"><strong>${t('profit')}: <span class="money">${hasSales ? fmtMoney(p.profit) : '—'}</span></strong></div>
        <div class="list-item"><strong>${t('margin')}: ${hasSales ? p.margin + '%' : '—'}</strong></div>
      </div>
      ${hasSales ? '' : `<div class="note">${t('noSales')}</div>`}
      ${canEdit ? `
      <div class="section-title">${t('fixedCosts')}</div>
      <div class="form-grid">
        <input id="fin-food" class="input" type="number" min="0" placeholder="${t('cost')}" value="${Number(fin.foodCost) || 0}" />
        <input id="fin-payroll" class="input" type="number" min="0" placeholder="${t('payroll')}" value="${Number(fin.payroll) || 0}" />
        <input id="fin-rent" class="input" type="number" min="0" placeholder="${t('rent')}" value="${Number(fin.rent) || 0}" />
        <input id="fin-other" class="input" type="number" min="0" placeholder="${t('otherCosts')}" value="${Number(fin.other) || 0}" />
        <button class="btn primary" data-action="saveFinance">${t('save')}</button>
      </div>` : ''}
    </div>
    <div class="card"><div class="section-title">${t('brandPL')} — ${esc(state.brandSel)}</div><div class="list">
      <div class="list-item">${t('sales')}: <span class="money">${fmtMoney(b.sales)}</span></div>
      <div class="list-item">${t('totalCost')}: <span class="money">${fmtMoney(b.costs)}</span></div>
      <div class="list-item"><strong>${t('profit')}: <span class="money">${bHasSales ? fmtMoney(b.profit) : '—'}</span></strong></div>
      <div class="list-item"><strong>${t('margin')}: ${bHasSales ? b.margin + '%' : '—'}</strong></div>
    </div></div>
    <div class="card"><div class="section-title">${t('cashFlow')}</div><div class="list">
      <div class="list-item">${t('cashIn')}: <span class="money">${fmtMoney(p.sales)}</span></div>
      <div class="list-item">${t('cashOut')}: <span class="money">${fmtMoney(p.costs)}</span></div>
      <div class="list-item"><strong>${t('balance')}: <span class="money">${hasSales ? fmtMoney(p.sales - p.costs) : '—'}</span></strong></div>
    </div>
    <div class="note">${t('financeNote')}</div></div>`;
}
registerScreen('finance', renderFinance);

async function saveFinance() {
  try {
    const body = {
      ...currentScope(),
      foodCost: Number(document.getElementById('fin-food').value) || 0,
      payroll: Number(document.getElementById('fin-payroll').value) || 0,
      rent: Number(document.getElementById('fin-rent').value) || 0,
      other: Number(document.getElementById('fin-other').value) || 0
    };
    await api('/api/finance', 'POST', body);
    const row = (state.finance || []).find(x => x.brand === state.brandSel && x.branch === state.branchSel);
    if (row) Object.assign(row, body);
    else (state.finance = state.finance || []).unshift(body);
    render('finance'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('saveFinance', saveFinance);

// ---------------------------------------------------------------------------
// Call center
// ---------------------------------------------------------------------------
function renderCallCenter() {
  const calls = scoped(state.calls);
  const DRIVERS = ['مندوب 1', 'مندوب 2', 'مندوب 3'];
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
registerScreen('callcenter', renderCallCenter);

async function createCallOrder() {
  const phone = document.getElementById('cc-phone').value.trim();
  const customerName = document.getElementById('cc-name').value.trim();
  const type = document.getElementById('cc-type').value;
  const zone = document.getElementById('cc-zone').value.trim();
  const orderText = document.getElementById('cc-order').value.trim();
  const prep = Number(document.getElementById('cc-prep').value) || 20;
  if (!phone || !customerName || !orderText) { toast(t('noData'), 'err'); return; }
  try {
    const { call } = await api('/api/calls', 'POST', { ...currentScope(), phone, customerName, type, zone, orderText, prep });
    state.calls.unshift(call);
    render('callcenter'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function assignDriver(id) {
  const call = state.calls.find(c => c.id === id);
  if (!call) return;
  const sel = content.querySelector('select[data-driver-select="' + id + '"]');
  try {
    const { call: updated } = await api('/api/calls/' + id + '/assign', 'POST', { driver: sel && sel.value });
    Object.assign(call, updated);
    render('callcenter');
  } catch (err) { toastErr(err); }
}
async function setCallStatus(id, status) {
  try {
    const { call: updated } = await api('/api/calls/' + id + '/status', 'POST', { status });
    const call = state.calls.find(c => c.id === id);
    if (call) Object.assign(call, updated);
    render('callcenter');
  } catch (err) { toastErr(err); }
}
registerAction('createCallOrder', createCallOrder);
registerAction('assignDriver', assignDriver);
registerAction('setCallStatus', setCallStatus);

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------
function renderCRM() {
  const customers = scoped(state.customers);
  content.innerHTML = `<div class="card"><div class="section-title">${t('crmCustomers')}</div><div class="list">${customers.length ? customers.map(c => `
    <div class="list-item"><div><strong>${esc(c.name)}</strong> — ${esc(c.phone)}</div>
    <div class="muted">${t('payments')}: ${esc(c.lastPayment || '-')}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
registerScreen('crm', renderCRM);

// ---------------------------------------------------------------------------
// Attendance (server computes hours/overtime)
// ---------------------------------------------------------------------------
function renderAttendance() {
  const rows = scoped(state.attendance);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('attendanceByLocation')}</div>
      <div class="muted">${t('currentLocation')}: ${esc(state.locationLabel || t('noData'))}</div>
      <div class="form-grid">
        <input id="emp-name" class="input" data-uifield="hrForm.name" value="${esc(ui.hrForm.name)}" placeholder="${t('employee')}" />
        <select id="emp-shift" class="select">${shiftList().map(s => `<option value="${esc(s.name)}">${esc(s.name)} (${esc(s.start)}-${esc(s.end)})</option>`).join('')}</select>
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
registerScreen('attendance', renderAttendance);

function getCurrentLocation() {
  const apply = label => { state.locationLabel = label; if (currentTab === 'attendance') render('attendance'); };
  if (!navigator.geolocation) return apply('Geolocation unsupported');
  navigator.geolocation.getCurrentPosition(
    pos => apply(pos.coords.latitude.toFixed(5) + ', ' + pos.coords.longitude.toFixed(5)),
    () => apply('Location unavailable')
  );
}
registerAction('getLocation', getCurrentLocation);

async function checkIn() {
  const employee = document.getElementById('emp-name').value.trim();
  const shift = document.getElementById('emp-shift') ? document.getElementById('emp-shift').value : '';
  if (!employee) { toast(t('noData'), 'err'); return; }
  try {
    const { row } = await api('/api/attendance/checkin', 'POST', { ...currentScope(), employee, shift });
    state.attendance.unshift(row);
    render('attendance'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function checkOut() {
  const employee = document.getElementById('emp-name').value.trim();
  if (!employee) { toast(t('noData'), 'err'); return; }
  try {
    const { row } = await api('/api/attendance/checkout', 'POST', { ...currentScope(), employee });
    const idx = state.attendance.findIndex(x => x.employee === employee && !x.checkOutAt && x.brand === state.brandSel && x.branch === state.branchSel);
    if (idx >= 0) state.attendance[idx] = row;
    render('attendance'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('checkIn', checkIn);
registerAction('checkOut', checkOut);

// ---------------------------------------------------------------------------
// Payments
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
registerScreen('payments', renderPayments);

async function createPayment() {
  const customer = document.getElementById('pay-customer').value.trim();
  const phone = document.getElementById('pay-phone').value.trim();
  const amount = Number(document.getElementById('pay-amount').value);
  const method = document.getElementById('pay-method').value;
  if (!customer || !phone || !Number.isFinite(amount) || amount <= 0) { toast(t('noData'), 'err'); return; }
  try {
    const { payment } = await api('/api/payments', 'POST', { ...currentScope(), customer, phone, amount, method });
    state.payments.unshift(payment);
    render('payments'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('createPayment', createPayment);

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
function renderSecurity() {
  const logs = scoped(state.securityLogs).length ? scoped(state.securityLogs) : (state.securityLogs || []).slice(0, 30);
  content.innerHTML = `
    <div class="card"><div class="section-title">${t('securityLayers')}</div><div class="list">
      <div class="list-item"><span class="badge sec">${t('authN')}</span> ${t('secPasskey')}</div>
      <div class="list-item"><span class="badge sec">RBAC</span> ${t('secRbac')}</div>
      <div class="list-item"><span class="badge sec">${t('secServer')}</span> ${t('secServerBody')}</div>
      <div class="list-item"><span class="badge sec">Audit log</span> ${t('secAudit')}</div>
      <div class="list-item"><span class="badge warn">MVP</span> ${t('secMvp')}</div>
    </div></div>
    <div class="card"><div class="section-title">${t('securityLogs')}</div><div class="list">${logs.length ? logs.map(l => `
      <div class="list-item"><div><strong>${esc(l.type)}</strong>${l.user ? ` · <span class="small">${esc(l.user)}</span>` : ''}</div>
      <div class="muted">${esc(l.detail)}</div><div class="small">${fmtDateTime(l.time)}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
registerScreen('security', renderSecurity);

async function simulateBiometric() {
  // Local device demo only — real passkeys require WebAuthn server registration.
  toast(t('passkey') + ' (demo)', 'ok');
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
function renderReports() {
  const orders = scoped(state.orders);
  const calls = scoped(state.calls);
  const payments = scoped(state.payments);
  const b = brandFigures(state.brandSel);
  const byStatus = ['preparing', 'ready', 'picked'].map(s =>
    `${statusLabel(s)}: ${orders.filter(o => o.status === s).length}`).join(' · ');
  const byPayment = ['cash', 'card'].map(m =>
    `${m === 'cash' ? t('cash') : t('card')}: ${orders.filter(o => o.payment === m).length}`).join(' · ');
  const itemCount = {};
  orders.forEach(o => (o.items || []).forEach(i => { itemCount[i.name_en] = (itemCount[i.name_en] || 0) + i.qty; }));
  const topItems = Object.entries(itemCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  content.innerHTML = `
    <div class="hero"><div class="section-title">${t('reports')}</div><div class="small">${esc(state.brandSel)}</div></div>
    <div class="grid-2">
      ${kpi(t('orders'), orders.length, 'POS')}
      ${kpi(t('callcenter'), calls.length, 'CC')}
      ${kpi(t('payments'), payments.length, 'Pay')}
      ${kpi(t('brandMargin'), b.sales > 0 ? b.margin + '%' : '—', b.sales > 0 ? t('brand') : t('noSales'))}
    </div>
    <div class="card"><div class="section-title">${t('orders')}</div>
      <div class="list-item small">${esc(byStatus)}</div>
      <div class="list-item small">${esc(byPayment)}</div>
    </div>
    ${topItems.length ? `
    <div class="card"><div class="section-title">${t('topItems')}</div><div class="list">
      ${topItems.map(([name, qty], i) => `<div class="list-item note-row"><span>${i + 1}. ${esc(name)}</span><strong>${qty}</strong></div>`).join('')}
    </div></div>` : ''}
    <div class="card"><div class="section-title">${t('aiBrief')}</div><div class="list">${aiBrief().map(n => `<div class="list-item">${esc(n)}</div>`).join('')}</div></div>`;
}
registerScreen('reports', renderReports);

// ---------------------------------------------------------------------------
// Render helper used by app.js
// ---------------------------------------------------------------------------
let currentTab = 'overview';
let tickHandle = null;
function setActive(tab) {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const moreBtn = document.getElementById('more-btn');
  if (moreBtn) moreBtn.classList.toggle('active', SHEET_TABS_ALL.includes(tab));
}
function render(tab) {
  currentTab = tab;
  setActive(tab);
  try { history.replaceState(null, '', '#' + tab); } catch { /* ignore */ }
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  if (tab === 'kds' || tab === 'orders' || tab === 'pickup') {
    tickHandle = setInterval(() => { if (currentTab === tab && SCREENS[tab]) render(tab); }, 30000);
  }
  if (SCREENS[tab]) SCREENS[tab]();
}
