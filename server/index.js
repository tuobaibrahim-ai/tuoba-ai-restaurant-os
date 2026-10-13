// ============================================================================
// TUOBA ERP — HTTP server: static files + JSON API, security headers.
// Zero external dependencies. Run: node server/index.js   (PORT env optional)
// ============================================================================
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Store } = require('./store');
const { handle, resolveUser } = require('./api');

const ROOT = path.join(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors *"
  // frame-ancestors * is required by the sandboxed preview iframe. In real
  // production deployments behind your own domain, set it to 'self'.
};

const MAX_BODY = 1024 * 1024; // 1MB

function send(res, code, headers, body) {
  res.writeHead(code, headers);
  res.end(body);
}
function sendJson(res, code, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  send(res, code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extraHeaders
  }, body);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.normalize(path.join(ROOT, rel));
  if (!abs.startsWith(ROOT)) return sendJson(res, 403, { error: 'forbidden' });
  let stat;
  try { stat = fs.statSync(abs); } catch { return sendJson(res, 404, { error: 'notFound' }); }
  if (!stat.isFile()) return sendJson(res, 404, { error: 'notFound' });
  const ext = path.extname(abs).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const cache = (rel.startsWith('/icons/') || rel.startsWith('/js/') || rel === '/style.css')
    ? 'public, max-age=120'
    : 'no-cache';
  send(res, 200, { 'Content-Type': type, 'Cache-Control': cache, ...SECURITY_HEADERS }, fs.readFileSync(abs));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('tooLarge'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('badJson'), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

// Simple per-IP throttle for /api (140 req/min) — login has its own stricter one.
const apiHits = new Map();
function apiAllowed(ip) {
  const now = Date.now();
  const arr = (apiHits.get(ip) || []).filter(ts => now - ts < 60000);
  apiHits.set(ip, arr);
  if (arr.length >= 140) return false;
  arr.push(now);
  return true;
}

function createServer(opts = {}) {
  const store = opts.store || new Store(opts.dataDir || path.join(ROOT, 'data'));
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const pathname = url.pathname;
    const ip = (req.socket.remoteAddress || '0.0.0.0').replace('::ffff:', '');

    try {
      if (pathname.startsWith('/api/')) {
        if (!apiAllowed(ip)) return sendJson(res, 429, { error: 'tooManyRequests' });
        if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'methodNotAllowed' });

        let body = {};
        if (req.method === 'POST') {
          try { body = await readBody(req); }
          catch (e) { return sendJson(res, e.code || 400, { error: e.code === 413 ? 'tooLarge' : 'badRequest' }); }
          if (typeof body !== 'object' || body === null || Array.isArray(body)) {
            return sendJson(res, 400, { error: 'badRequest' });
          }
        }

        const auth = req.headers['authorization'] || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        const user = resolveUser(store, token);
        const result = handle(store, { method: req.method, path: pathname, body, user, token, ip });
        if (!result) return sendJson(res, 404, { error: 'notFound' });
        const headers = result.download ? { 'Content-Disposition': 'attachment; filename="' + result.download + '"' } : {};
        return sendJson(res, result.code, result.json, headers);
      }

      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);
      return sendJson(res, 405, { error: 'methodNotAllowed' });
    } catch (err) {
      console.error('[tuoba-erp]', req.method, pathname, err);
      try { sendJson(res, 500, { error: 'serverError' }); } catch { /* already sent */ }
    }
  });
  server.store = store;
  return server;
}

function start(opts = {}) {
  return new Promise(resolve => {
    const server = createServer(opts);
    const port = opts.port !== undefined ? opts.port : (Number(process.env.PORT) || 8080);
    server.listen(port, '0.0.0.0', () => resolve({ server, port: server.address().port }));
  });
}

if (require.main === module) {
  start({ port: undefined }).then(({ port }) => {
    console.log(`TUOBA ERP server running on http://0.0.0.0:${port}`);
  });
}

module.exports = { createServer, start };
