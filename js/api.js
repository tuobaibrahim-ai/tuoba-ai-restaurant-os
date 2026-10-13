// ============================================================================
// TUOBA ERP — API client: bearer-token fetch wrapper + error translation
// ============================================================================
const TOKEN_KEY = 'tuoba-erp-token';
const LANG_KEY = 'tuoba-erp-lang';

function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }
function setToken(token) {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
function getSavedLang() { try { return localStorage.getItem(LANG_KEY) || ''; } catch { return ''; } }
function saveLang(lang) { try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ } }

let _onUnauthorized = null;
function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

async function api(path, method = 'GET', body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(getToken() ? { authorization: 'Bearer ' + getToken() } : {})
      },
      body: method !== 'GET' && body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (res.status === 401) {
    if (_onUnauthorized) _onUnauthorized();
    throw new ApiError('unauthorized', 401);
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(data.error || 'serverError', res.status);
  return data;
}

// Map server error codes to localized toast messages.
function apiErrorText(err) {
  const map = {
    wrongCreds: 'wrongCreds', forbidden: 'forbidden', passwordTooShort: 'passwordTooShort',
    tooManyAttempts: 'tooManyAttempts', disabled: 'disabledAccount', alreadyCheckedIn: 'alreadyCheckedIn',
    tooLarge: 'tooLarge', duplicate: 'duplicate', network: 'offlineMode', unauthorized: 'sessionExpired',
    notFound: 'serverError', badRequest: 'serverError', serverError: 'serverError'
  };
  const key = map[err && err.code];
  return key ? t(key) : t('serverError');
}
function toastErr(err) { toast(apiErrorText(err), 'err'); }

// Offline fallback: last successful bootstrap snapshot (read-only mode).
const CACHE_KEY = 'tuoba-erp-last-bootstrap';
function cacheBootstrap(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ } }
function readCachedBootstrap() {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

if (typeof module !== 'undefined') {
  module.exports = { api, ApiError, getToken, setToken };
}
