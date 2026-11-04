'use strict';
/* Provider module entry. Built-in Node `http` only (no Express, per the assignment).
 *   const { handleProviderRequest } = require('./src/modules/provider');
 *   ...inside the server's request handler, first line:
 *   if (await handleProviderRequest(req, res, { resolveUser: asyncFnReturningLoggedInUser })) return;
 *   (server.js does this with the real MySQL login; without resolveUser the insecure dev stub is used)
 * or, one line after the server is created and its request listener attached:
 *   require('./src/modules/provider').registerProviderRoutes(server);
 */
const routes = require('./routes/provider.routes');
const { requireProvider } = require('./middleware/auth');
const { HttpError } = require('./errors');

const PREFIX = '/api/provider';
const compiled = routes.map(([method, path, handler]) => ({
  method, handler, names: [...path.matchAll(/:(\w+)/g)].map((m) => m[1]),
  re: new RegExp('^' + path.replace(/:\w+/g, '([^/]+)') + '$')
}));

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) { reject(new HttpError(413, 'Request too large')); req.destroy(); } });
    req.on('end', () => { if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch (e) { reject(new HttpError(400, 'Invalid JSON body')); } });
    req.on('error', reject);
  });
}

async function handleProviderRequest(req, res, options = {}) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== PREFIX && !url.pathname.startsWith(PREFIX + '/')) return false;
  try {
    const sub = url.pathname.slice(PREFIX.length) || '/';
    let pathMatched = false;
    for (const r of compiled) {
      const m = r.re.exec(sub); if (!m) continue;
      pathMatched = true;
      if (r.method !== req.method) continue;
      const user = await requireProvider(req, options.resolveUser);
      const params = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      const out = r.handler({ user, params, query: Object.fromEntries(url.searchParams), body });
      send(res, out.status || 200, { ok: true, data: out.data });
      return true;
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed' : 'Endpoint not found');
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error('[provider]', err);
    send(res, status, { ok: false, error: { message: status === 500 ? 'Internal server error' : err.message, details: err.details } });
  }
  return true;
}

function registerProviderRoutes(server) {
  const previous = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', async (req, res) => {
    if (await handleProviderRequest(req, res)) return;
    previous.forEach((l) => l.call(server, req, res));
  });
}
module.exports = { handleProviderRequest, registerProviderRoutes };