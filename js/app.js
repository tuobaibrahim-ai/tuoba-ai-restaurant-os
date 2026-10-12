// ============================================================================
// TUOBA Restaurant OS — bootstrap: selectors, header actions, SW, deep links
// ============================================================================

const $ = id => document.getElementById(id);

function initSelectors() {
  const brandSelect = $('brand-select');
  const branchSelect = $('branch-select');
  const langSelect = $('lang-select');

  if (!BRANDS[state.brand]) state.brand = Object.keys(BRANDS)[0] || '';
  brandSelect.innerHTML = Object.keys(BRANDS).map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  brandSelect.value = state.brand;
  updateBranches();

  langSelect.innerHTML = `
    <option value="ar">العربية</option>
    <option value="en">English</option>
    <option value="fr">Français</option>
    <option value="es">Español</option>
    <option value="tr">Türkçe</option>`;
  langSelect.value = state.lang;

  brandSelect.onchange = () => {
    state.brand = brandSelect.value;
    state.branch = (BRANDS[state.brand] || [])[0] || '';
    // Cart, mode and selected table belong to a single branch — reset on switch.
    state.cart = [];
    state.deliveryForm = { name: '', phone: '', app: '', address: '' };
    state.currentTable = 'T1';
    saveState(); updateBranches(); render(currentTab);
  };
  branchSelect.onchange = () => {
    state.branch = branchSelect.value;
    state.cart = [];
    state.deliveryForm = { name: '', phone: '', app: '', address: '' };
    state.currentTable = 'T1';
    saveState(); render(currentTab);
  };
  langSelect.onchange = () => setLang(langSelect.value);

  setLang(state.lang);
}

function updateBranches() {
  const branchSelect = $('branch-select');
  const arr = BRANDS[state.brand] || [];
  branchSelect.innerHTML = arr.map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
  if (!arr.includes(state.branch)) state.branch = arr[0] || '';
  branchSelect.value = state.branch;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tuoba-restaurant-os-data.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(t('exported'), 'ok');
}

// Two-step reset (no native confirm(): it is blocked inside sandboxed iframes)
let resetTimer = null;
function armReset(btn) {
  if (btn.dataset.armed === '1') {
    clearTimeout(resetTimer);
    btn.dataset.armed = '0';
    doReset(btn);
    return;
  }
  btn.dataset.armed = '1';
  btn.textContent = t('clickAgain');
  btn.classList.add('danger');
  resetTimer = setTimeout(() => {
    btn.dataset.armed = '0';
    btn.textContent = t('resetData');
    btn.classList.remove('danger');
  }, 3000);
}

function doReset(btn) {
  const keepLang = state.lang;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
  state = deepClone(initialState);
  state.lang = keepLang;
  saveState();
  btn.textContent = t('resetData');
  btn.classList.remove('danger');
  initSelectors();
  render('overview');
  toast(t('cleared'), 'ok');
}

function wireHeader() {
  $('export-btn').addEventListener('click', exportData);
  $('passkey-btn').addEventListener('click', simulateBiometric);
  $('location-btn').addEventListener('click', getCurrentLocation);
  $('reset-btn').addEventListener('click', function () { armReset(this); });
}

// Bottom-nav "More" drawer
function openSheet() {
  const s = document.getElementById('more-sheet');
  if (s) { s.hidden = false; document.body.classList.add('sheet-open'); }
}
function closeSheet() {
  const s = document.getElementById('more-sheet');
  if (s) { s.hidden = true; document.body.classList.remove('sheet-open'); }
}

function wireNav() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => { closeSheet(); render(btn.dataset.tab); });
  });
  const moreBtn = document.getElementById('more-btn');
  if (moreBtn) moreBtn.addEventListener('click', () => {
    const s = document.getElementById('more-sheet');
    if (s && s.hidden) openSheet(); else closeSheet();
  });
  const closeBtn = document.getElementById('sheet-close');
  if (closeBtn) closeBtn.addEventListener('click', closeSheet);
  const sheet = document.getElementById('more-sheet');
  if (sheet) sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
}

function boot() {
  wireNav();
  initSelectors();
  wireHeader();
  render('overview');
  // Deep link: index.html#pos / #kds … (also used by manifest shortcuts)
  const hash = String(location.hash || '').replace('#', '');
  if (hash && TABS.includes(hash)) render(hash);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-first is optional */ });
  }
}

boot();
