// ============================================================================
// TUOBA ERP — management modules: Inventory, Menu management, Users, Settings
// ============================================================================

const contentM = document.getElementById('content');

// ---------------------------------------------------------------------------
// Inventory — items, levels, movement ledger (purchase / waste / adjust)
// ---------------------------------------------------------------------------
function renderInventory() {
  const items = state.stock || [];
  const moves = (state.stockMoves || []).slice(0, 12);
  const canEdit = me().role !== 'cashier';
  contentM.innerHTML = `
    ${canEdit ? `
    <div class="card"><div class="section-title">${t('addStockItem')}</div><div class="form-grid">
      <input id="stk-name" class="input" placeholder="${t('stockItem')}" />
      <div class="note-row">
        <input id="stk-qty" class="input compact" type="number" min="0" step="0.01" placeholder="${t('qty')}" />
        <select id="stk-unit" class="select compact">
          <option value="kg">kg</option><option value="g">g</option><option value="L">L</option>
          <option value="pcs">pcs</option><option value="box">box</option>
        </select>
      </div>
      <input id="stk-reorder" class="input compact" type="number" min="0" placeholder="${t('reorderLevel')}" />
      <button class="btn primary" data-action="addStockItem">${t('save')}</button>
    </div></div>` : ''}
    <div class="card"><div class="section-title">${t('inventory')}</div><div class="list">${items.length ? items.map(it => {
      const low = Number(it.qty) <= Number(it.reorderLevel);
      return `
      <div class="list-item ${low ? 'warn-item' : ''}">
        <div><strong>${esc(it.name)}</strong> ${low ? `<span class="badge warn">${t('lowStock')}</span>` : `<span class="badge good">OK</span>`}</div>
        <div class="money">${it.qty} ${esc(it.unit)}</div>
        <div class="small">${t('reorderLevel')}: ${it.reorderLevel}</div>
        ${canEdit ? `
        <div class="note-row">
          <select class="select compact" data-stk-type="${it.id}">
            <option value="purchase">${t('purchase')}</option>
            <option value="waste">${t('waste')}</option>
            <option value="adjust">${t('adjust')}</option>
          </select>
          <input class="input compact w90" type="number" min="0" step="0.01" data-stk-qty="${it.id}" placeholder="${t('qty')}" />
          <button class="btn soft mini" data-action="stockMove" data-arg="${it.id}">↩</button>
        </div>` : ''}
      </div>`;
    }).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>
    <div class="card"><div class="section-title">${t('stockMoves')}</div><div class="list">${moves.length ? moves.map(m => `
      <div class="list-item"><div class="note-row">
        <span class="badge ${m.type === 'purchase' ? 'good' : m.type === 'waste' ? 'warn' : 'sec'}">${t(m.type === 'purchase' ? 'purchase' : m.type === 'waste' ? 'waste' : 'adjust')}</span>
        <span class="small">${fmtDateTime(m.at)}</span>
      </div>
      <div class="small">${esc(m.name)}: ${m.type === 'adjust' ? '= ' : ''}${m.qty} ${esc(m.unit)} ${m.note ? '· ' + esc(m.note) : ''}</div></div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
registerScreen('inventory', renderInventory);

async function addStockItem() {
  const name = document.getElementById('stk-name').value.trim();
  const qty = Number(document.getElementById('stk-qty').value);
  const reorderLevel = Number(document.getElementById('stk-reorder').value);
  const unit = document.getElementById('stk-unit').value;
  if (!name || !Number.isFinite(qty) || qty < 0 || !Number.isFinite(reorderLevel) || reorderLevel < 0) { toast(t('noData'), 'err'); return; }
  try {
    const { item } = await api('/api/stock/items', 'POST', { name, qty, reorderLevel, unit });
    state.stock.push(item);
    render('inventory'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function stockMove(id) {
  const typeSel = contentM.querySelector('select[data-stk-type="' + id + '"]');
  const qtyEl = contentM.querySelector('input[data-stk-qty="' + id + '"]');
  const type = typeSel ? typeSel.value : 'purchase';
  const qty = qtyEl ? Number(qtyEl.value) : NaN;
  if (!Number.isFinite(qty) || qty <= 0) { toast(t('noData'), 'err'); return; }
  try {
    const { item } = await api('/api/stock/moves', 'POST', { id: Number(id), type, qty });
    const idx = state.stock.findIndex(x => x.id === Number(id));
    if (idx >= 0) state.stock[idx] = item;
    render('inventory'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('addStockItem', addStockItem);
registerAction('stockMove', arg => stockMove(arg));

// ---------------------------------------------------------------------------
// Menu management — CRUD per brand
// ---------------------------------------------------------------------------
function renderMenuMgmt() {
  const items = brandScoped(state.menu);
  contentM.innerHTML = `
    <div class="card"><div class="section-title">${t('addItem')}</div><div class="form-grid">
      <input id="mi-ar" class="input" placeholder="${t('newItemAr')}" />
      <input id="mi-en" class="input" placeholder="${t('newItemEn')}" />
      <div class="note-row">
        <input id="mi-price" class="input compact" type="number" min="0.5" step="0.5" placeholder="${t('price')}" />
        <input id="mi-prep" class="input compact" type="number" min="1" placeholder="${t('prepTime')}" value="10" />
      </div>
      <button class="btn primary" data-action="addMenuItem">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('menuManagement')} — ${esc(state.brandSel)}</div><div class="list">${items.length ? items.map(m => `
      <div class="list-item">
        <div><strong>${esc(m.name_ar)}</strong> · ${esc(m.name_en)} ${m.active === false ? `<span class="badge warn">${t('deactivated')}</span>` : ''}</div>
        <div class="note-row">
          <input class="input compact" type="number" min="0.5" step="0.5" value="${m.price}" data-mi-price="${m.id}" />
          <input class="input compact w80" type="number" min="1" value="${m.prep}" data-mi-prep="${m.id}" />
        </div>
        <div class="btn-row">
          <button class="btn soft mini" data-action="updateMenuItem" data-arg="${m.id}">${t('save')}</button>
          <button class="btn soft mini" data-action="toggleMenuItem" data-arg="${m.id}" data-arg2="${m.active === false ? '1' : '0'}">${m.active === false ? t('activate') : t('deactivate')}</button>
          <button class="btn mini danger-ghost" data-action="deleteMenuItem" data-arg="${m.id}">${t('deleteItem')}</button>
        </div>
      </div>`).join('') : `<div class="muted">${t('noData')}</div>`}</div></div>`;
}
registerScreen('menu', renderMenuMgmt);

async function addMenuItem() {
  const name_ar = document.getElementById('mi-ar').value.trim();
  const name_en = document.getElementById('mi-en').value.trim();
  const price = Number(document.getElementById('mi-price').value);
  const prep = Number(document.getElementById('mi-prep').value) || 10;
  if (!name_ar || !name_en || !Number.isFinite(price) || price <= 0) { toast(t('noData'), 'err'); return; }
  try {
    const { item } = await api('/api/menu/items', 'POST', { ...currentScope(), name_ar, name_en, price, prep });
    state.menu.push(item);
    render('menu'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function updateMenuItem(id) {
  const price = Number(contentM.querySelector('input[data-mi-price="' + id + '"]').value);
  const prep = Number(contentM.querySelector('input[data-mi-prep="' + id + '"]').value);
  try {
    const { item } = await api('/api/menu/items/' + id, 'POST', { price, prep });
    const idx = state.menu.findIndex(m => m.id === Number(id));
    if (idx >= 0) state.menu[idx] = item;
    render('menu'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function toggleMenuItem(id, activeFlag) {
  try {
    const { item } = await api('/api/menu/items/' + id, 'POST', { active: activeFlag === '1' });
    const idx = state.menu.findIndex(m => m.id === Number(id));
    if (idx >= 0) state.menu[idx] = item;
    render('menu');
  } catch (err) { toastErr(err); }
}
async function deleteMenuItem(id) {
  try {
    await api('/api/menu/items/' + id, 'POST', { _delete: true });
    state.menu = state.menu.filter(m => m.id !== Number(id));
    render('menu'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('addMenuItem', addMenuItem);
registerAction('updateMenuItem', arg => updateMenuItem(arg));
registerAction('toggleMenuItem', (a, b) => toggleMenuItem(a, b));
registerAction('deleteMenuItem', arg => deleteMenuItem(arg));

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------
function renderUsers() {
  const users = state.users || [];
  contentM.innerHTML = `
    <div class="card"><div class="section-title">${t('addUser')}</div><div class="form-grid">
      <input id="u-username" class="input" placeholder="${t('username')} (a-z, 3+)" />
      <input id="u-name" class="input" placeholder="${t('title')}" />
      <select id="u-role" class="select">
        <option value="cashier">${t('roleCashier')}</option>
        <option value="manager">${t('roleManager')}</option>
        <option value="admin">${t('roleAdmin')}</option>
      </select>
      <input id="u-password" class="input" type="password" placeholder="${t('newPassword')}" />
      <button class="btn primary" data-action="createUser">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('users')}</div><div class="list">${users.map(u => `
      <div class="list-item">
        <div><strong>${esc(u.name)}</strong> · ${esc(u.username)}</div>
        <div class="muted">${esc(roleLabel(u.role))} · ${u.active ? t('active') : t('disabledUser')}</div>
        ${u.username === me().username ? `<div class="small">${t('account')}</div>` : `
        <div class="btn-row">
          <select class="select compact" data-u-role="${esc(u.username)}">
            <option value="cashier" ${u.role === 'cashier' ? 'selected' : ''}>${t('roleCashier')}</option>
            <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>${t('roleManager')}</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${t('roleAdmin')}</option>
          </select>
          <button class="btn soft mini" data-action="setUserRole" data-arg="${esc(u.username)}">${t('save')}</button>
          <button class="btn mini ${u.active ? 'danger-ghost' : 'soft'}" data-action="toggleUser" data-arg="${esc(u.username)}" data-arg2="${u.active ? '0' : '1'}">${u.active ? t('disabledUser') : t('activate')}</button>
        </div>
        <div class="note-row">
          <input class="input compact" type="password" data-u-pwd="${esc(u.username)}" placeholder="${t('resetPwd')}" />
          <button class="btn soft mini" data-action="resetUserPwd" data-arg="${esc(u.username)}">${t('save')}</button>
        </div>`}
      </div>`).join('')}</div></div>`;
}
registerScreen('users', renderUsers);

async function createUser() {
  const username = document.getElementById('u-username').value.trim();
  const name = document.getElementById('u-name').value.trim();
  const role = document.getElementById('u-role').value;
  const password = document.getElementById('u-password').value;
  if (!username || !name || !password) { toast(t('noData'), 'err'); return; }
  try {
    const { user } = await api('/api/users', 'POST', { username, name, role, password });
    (state.users = state.users || []).push(user);
    render('users'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function setUserRole(username) {
  const role = contentM.querySelector('select[data-u-role="' + username + '"]').value;
  try {
    const { user } = await api('/api/users/' + username + '/update', 'POST', { role });
    const u = state.users.find(x => x.username === username); if (u) Object.assign(u, user);
    render('users'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function toggleUser(username, activeFlag) {
  try {
    const { user } = await api('/api/users/' + username + '/update', 'POST', { active: activeFlag === '1' });
    const u = state.users.find(x => x.username === username); if (u) Object.assign(u, user);
    render('users');
  } catch (err) { toastErr(err); }
}
async function resetUserPwd(username) {
  const newPassword = contentM.querySelector('input[data-u-pwd="' + username + '"]').value;
  try {
    await api('/api/users/' + username + '/password', 'POST', { newPassword });
    toast(t('passwordChanged'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('createUser', createUser);
registerAction('setUserRole', arg => setUserRole(arg));
registerAction('toggleUser', (a, b) => toggleUser(a, b));
registerAction('resetUserPwd', arg => resetUserPwd(arg));

// ---------------------------------------------------------------------------
// Settings (admin) + self-service change password (all roles)
// ---------------------------------------------------------------------------
function renderSettings() {
  const s = settings();
  const isAdmin = me().role === 'admin';
  contentM.innerHTML = `
    <div class="card"><div class="section-title">${t('account')}</div><div class="form-grid">
      <input id="p-old" class="input" type="password" placeholder="${t('oldPassword')}" />
      <input id="p-new" class="input" type="password" placeholder="${t('newPassword')}" />
      <button class="btn primary" data-action="changeMyPassword">${t('changePassword')}</button>
    </div></div>
    ${isAdmin ? `
    <div class="card"><div class="section-title">${t('settings')}</div><div class="form-grid">
      <input id="s-company" class="input" placeholder="${t('company')}" value="${esc(s.company)}" />
      <select id="s-currency" class="select">
        ${['EGP', 'USD', 'EUR', 'SAR', 'AED', 'TRY'].map(c => `<option value="${c}" ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <input id="s-tax" class="input" type="number" min="0" max="50" step="0.5" placeholder="${t('taxRate')}" value="${Number(s.taxRate) || 0}" />
      <button class="btn primary" data-action="saveSettings">${t('save')}</button>
    </div></div>
    <div class="card"><div class="section-title">${t('addBranch')}</div><div class="form-grid">
      <input id="b-brand" class="input" list="brand-list" placeholder="${t('brandName')}" />
      <datalist id="brand-list">${Object.keys(s.brands).map(b => `<option value="${esc(b)}"></option>`).join('')}</datalist>
      <input id="b-branch" class="input" placeholder="${t('branchName')}" />
      <button class="btn primary" data-action="addBranch">${t('save')}</button>
      <div class="list">${Object.entries(s.brands).map(([b, arr]) => `
        <div class="list-item"><strong>${esc(b)}</strong><div class="small">${arr.map(esc).join(' · ') || '—'}</div></div>`).join('')}
      </div>
    </div></div>` : ''}`;
}
registerScreen('settings', renderSettings);

async function changeMyPassword() {
  const oldPassword = document.getElementById('p-old').value;
  const newPassword = document.getElementById('p-new').value;
  try {
    await api('/api/auth/change-password', 'POST', { oldPassword, newPassword });
    document.getElementById('p-old').value = '';
    document.getElementById('p-new').value = '';
    toast(t('passwordChanged'), 'ok');
  } catch (err) { toastErr(err); }
}
async function saveSettings() {
  try {
    const company = document.getElementById('s-company').value.trim();
    const currency = document.getElementById('s-currency').value;
    const taxRate = Number(document.getElementById('s-tax').value);
    const { settings: s } = await api('/api/settings', 'POST', { company, currency, taxRate });
    state.settings = s;
    renderHeaderLabels(); render('settings'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
async function addBranch() {
  const brand = document.getElementById('b-brand').value.trim();
  const branch = document.getElementById('b-branch').value.trim();
  if (!brand || !branch) { toast(t('noData'), 'err'); return; }
  try {
    const { settings: s } = await api('/api/settings/branches', 'POST', { brand, branch });
    state.settings = s;
    buildScopeSelectors();
    render('settings'); toast(t('saved'), 'ok');
  } catch (err) { toastErr(err); }
}
registerAction('changeMyPassword', changeMyPassword);
registerAction('saveSettings', saveSettings);
registerAction('addBranch', addBranch);
