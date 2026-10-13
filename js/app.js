// ============================================================================
// TUOBA ERP — bootstrap: auth gate, login view, role-aware nav, delegation
// ============================================================================

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
let publicCfg = { company: 'TUOBA', demoMode: false };

async function loadPublicConfig() {
  // Route through api(): it races a hard fetch timeout and falls back to the
  // local engine, so a hanging server can never stall the gate forever.
  try {
    const cfg = await api('/api/public/config');
    publicCfg.company = (cfg && cfg.company) || 'TUOBA';
    publicCfg.demoMode = !!(cfg && cfg.demoMode);
  } catch {
    publicCfg.offline = true; // shown on the login card
  }
}

function showLogin(message) {
  $('app-shell').hidden = true;
  const root = $('login-root');
  root.hidden = false;
  const lang = getSavedLang() || 'ar';
  applyLangOnly(lang);
  root.innerHTML = `
    <div class="login-card">
      <img class="login-logo" src="icons/icon-192.png" alt="" />
      <h1>${esc(publicCfg.company || 'TUOBA')} ERP</h1>
      <p class="muted">${t('appSubtitle')}</p>
      ${window.__TUOBA_LOCAL ? `<div class="local-badge">${t('localBadge')}</div>` : ''}
      <div class="form-grid login-form">
        <input id="login-user" class="input" autocomplete="username" placeholder="${t('username')}" />
        <input id="login-pass" class="input" type="password" autocomplete="current-password" placeholder="${t('password')}" />
        <button id="login-btn" class="btn primary">${t('signIn')}</button>
        <div id="login-err" class="login-err" ${message ? '' : 'hidden'}>${esc(message || '')}</div>
        ${publicCfg.demoMode ? `<div class="note">${t('demoHint')}: admin / admin123 · manager / manager123 · cashier / cashier123</div>` : ''}
      </div>
      <select id="login-lang" class="select compact login-lang">
        <option value="ar">العربية</option><option value="en">English</option>
        <option value="fr">Français</option><option value="es">Español</option><option value="tr">Türkçe</option>
      </select>
    </div>`;
  $('login-lang').value = lang;
  $('login-lang').addEventListener('change', e => { applyLangOnly(e.target.value); showLogin(message); });
  const submit = async () => {
    const btn = $('login-btn');
    if (btn.disabled) return; // guard double submit (click + Enter)
    btn.disabled = true;
    btn.textContent = t('signingIn');
    try {
      const { token } = await api('/api/auth/login', 'POST', {
        username: $('login-user').value.trim(),
        password: $('login-pass').value
      });
      setToken(token);
      await enterApp();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t('signIn');
      const el = $('login-err');
      el.textContent = apiErrorText(err);
      el.hidden = false;
    }
  };
  $('login-btn').addEventListener('click', submit);
  $('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  $('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  $('login-user').focus();
}

function applyLangOnly(lang) {
  const l = I18N[lang] ? lang : 'ar';
  document.documentElement.lang = l;
  document.documentElement.dir = I18N[l].dir || 'ltr';
  setUiLang(l);
}
function setLangRaw(lang) {
  if (state) state.lang = lang;
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------
async function enterApp() {
  let data;
  try {
    data = await api('/api/bootstrap');
    cacheBootstrap(data);
  } catch (err) {
    if (err.code === 'network') {
      const cached = readCachedBootstrap();
      if (cached) {
        data = cached;
        data.me = data.me || { name: 'offline', role: 'manager', username: 'offline' };
        toast(t('offlineMode'), 'err');
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }
  const preLang = getSavedLang();
  if (preLang) data.lang = preLang;
  setState(data);
  $('login-root').hidden = true;
  $('app-shell').hidden = false;
  const dir = I18N[state.lang]?.dir || 'ltr';
  document.documentElement.lang = state.lang;
  document.documentElement.dir = dir;
  buildScopeSelectors();
  renderHeaderLabels();
  renderTabLabels();
  buildRoleNav();
  wireHeader();
  render('overview');
  const hash = String(location.hash || '').replace('#', '');
  if (hash && canSee(hash)) render(hash);
  if (publicCfg.offline) toast(t('localMode'), 'info');
  maybeOfferLegacyImport();
}

function buildScopeSelectors() {
  const brandSelect = $('brand-select');
  const branchSelect = $('branch-select');
  brandSelect.innerHTML = Object.keys(settings().brands).map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  brandSelect.value = state.brandSel;
  const branches = settings().brands[state.brandSel] || [];
  branchSelect.innerHTML = branches.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  branchSelect.value = state.branchSel;
  brandSelect.onchange = () => { selectBrand(brandSelect.value); branchSelect.innerHTML = (settings().brands[state.brandSel] || []).map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join(''); branchSelect.value = state.branchSel; render(currentTab); };
  branchSelect.onchange = () => { selectBranch(branchSelect.value); render(currentTab); };
}

function langSelectEl() { return $('lang-select'); }
function buildLangSelect() {
  const sel = langSelectEl();
  sel.innerHTML = `
    <option value="ar">العربية</option><option value="en">English</option>
    <option value="fr">Français</option><option value="es">Español</option><option value="tr">Türkçe</option>`;
  sel.value = (state && state.lang) || getSavedLang() || 'ar';
  sel.onchange = () => { if (state) setLang(sel.value); };
}

// ---------------------------------------------------------------------------
// Role-aware navigation (drawer contents depend on the user's role)
// ---------------------------------------------------------------------------
function buildRoleNav() {
  const grid = $('sheet-grid');
  grid.innerHTML = SHEET_TABS_ALL.filter(canSee).map(tab => `
    <button class="tab-btn sheet-btn" data-tab="${tab}"><span class="ic">${ICONS[tab] || ''}</span><span class="lb">${t(tab)}</span></button>`).join('');
  const moreBtn = $('more-btn');
  const sheetCount = SHEET_TABS_ALL.filter(canSee).length;
  moreBtn.style.display = sheetCount > 0 ? '' : 'none';
  document.querySelectorAll('.sheet-btn').forEach(btn => {
    btn.addEventListener('click', () => { closeSheet(); render(btn.dataset.tab); });
  });
}

// ---------------------------------------------------------------------------
// Header actions
// ---------------------------------------------------------------------------
async function exportData() {
  try {
    const data = await api('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tuoba-erp-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(t('exported'), 'ok');
  } catch (err) { toastErr(err); }
}

async function logout() {
  try { await api('/api/auth/logout', 'POST', {}); } catch { /* best effort */ }
  setToken(null);
  location.hash = '';
  showLogin();
}

function wireHeader() {
  $('export-btn').onclick = exportData;
  $('passkey-btn').onclick = simulateBiometric;
  $('location-btn').onclick = () => { if (currentTab === 'attendance') getCurrentLocation(); else { render('attendance'); getCurrentLocation(); } };
  $('logout-btn').onclick = logout;
  buildLangSelect();
}

// ---------------------------------------------------------------------------
// "More" drawer
// ---------------------------------------------------------------------------
function openSheet() {
  const s = $('more-sheet');
  if (s) { s.hidden = false; document.body.classList.add('sheet-open'); }
}
function closeSheet() {
  const s = $('more-sheet');
  if (s) { s.hidden = true; document.body.classList.remove('sheet-open'); }
}
function wireNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => { if (state) render(btn.dataset.tab); });
  });
  const moreBtn = $('more-btn');
  if (moreBtn) moreBtn.addEventListener('click', () => {
    const s = $('more-sheet');
    if (s && s.hidden) openSheet(); else closeSheet();
  });
  const closeBtn = $('sheet-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSheet);
  const sheet = $('more-sheet');
  if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
}

// ---------------------------------------------------------------------------
// Global event delegation (CSP-safe — no inline handlers anywhere)
// ---------------------------------------------------------------------------
function wireDelegation() {
  content.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    const btn = target && target.closest('[data-action]');
    if (!btn) return;
    const fn = ACTIONS[btn.dataset.action];
    if (fn) fn(btn.dataset.arg, btn.dataset.arg2, btn);
  });
  content.addEventListener('input', e => {
    const target = e.target instanceof Element ? e.target : null;
    const binding = target && target.dataset ? target.dataset.uifield : null;
    if (!binding) return;
    const [obj, field] = binding.split('.');
    if (obj === 'hrForm' && field) ui.hrForm[field] = target.value;
    if (obj === 'deliveryForm' && field) ui.deliveryForm[field] = target.value;
  });
}

// ---------------------------------------------------------------------------
// Legacy localStorage import (one-time, admin only)
// ---------------------------------------------------------------------------
function maybeOfferLegacyImport() {
  if (me().role !== 'admin') return;
  let legacy = null;
  try { legacy = JSON.parse(localStorage.getItem('tuoba-os-v2') || 'null'); } catch { legacy = null; }
  if (!legacy || !Array.isArray(legacy.orders) || legacy.orders.length === 0) return;
  if (window.__legacyOffered) return;
  window.__legacyOffered = true;
  toast(t('migrateOffer'), 'info');
  const doImport = async () => {
    try {
      const { count } = await api('/api/migrate-legacy', 'POST', { legacy });
      try { localStorage.removeItem('tuoba-os-v2'); } catch { /* ignore */ }
      toast(t('imported') + ' (' + count + ')', 'ok');
      const fresh = await api('/api/bootstrap');
      setState(fresh);
      render(currentTab);
    } catch (err) { toastErr(err); }
  };
  // Two-tap confirm via toast actions is complex; use a simple double-click guard:
  setTimeout(() => { window.__legacyReady = true; }, 500);
  const handler = async () => {
    if (!window.__legacyReady) return;
    document.body.removeEventListener('click', handler, true);
    await doImport();
  };
  document.body.addEventListener('click', handler, { capture: true, once: true });
  // The next tap anywhere confirms the import.
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  wireNav();
  wireDelegation();
  await loadPublicConfig();
  if (publicCfg.offline) {
    // No server reachable: run the full ERP locally (same creds & screens).
    window.__TUOBA_LOCAL = true;
    try { localLoad(); } catch { /* local.js guarantees init */ }
  }
  applyLangOnly(getSavedLang() || 'ar');
  renderTabLabels();
  if (!probeStorage()) {
    // Blocked storage (private mode / sandboxed iframe): the session lives in
    // memory only — warn once so a reload requiring re-login is understood.
    publicCfg.storageBlocked = true;
  }
  if (getToken()) {
    try {
      await enterApp();
      if (publicCfg.storageBlocked) toast(t('storageBlocked'), 'info');
      return;
    } catch {
      setToken(null); // dead token — fall through to the gate
    }
  }
  showLogin();
  if (publicCfg.storageBlocked) toast(t('storageBlocked'), 'info');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* optional */ });
  }
}

setUnauthorizedHandler(() => {
  setToken(null);
  const root = document.getElementById('login-root');
  if (!root || root.hidden) showLogin(t('sessionExpired'));
});

boot();
