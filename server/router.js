// ========================================================
// YAATHIRAI — LIGHTWEIGHT NATIVE HTTP ROUTER & STATIC SERVER
// Built exclusively using Node.js built-in modules
// ========================================================

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

class Router {
  constructor(publicDir) {
    this.publicDir = publicDir;
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
      PATCH: []
    };
  }

  _normalizePattern(pattern) {
    if (typeof pattern === 'string' && pattern.includes(':')) {
      const regexStr = '^' + pattern.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$';
      return new RegExp(regexStr);
    }
    return pattern;
  }

  get(pattern, handler) {
    this.routes.GET.push({ pattern: this._normalizePattern(pattern), handler });
  }

  post(pattern, handler) {
    this.routes.POST.push({ pattern: this._normalizePattern(pattern), handler });
  }

  put(pattern, handler) {
    this.routes.PUT.push({ pattern: this._normalizePattern(pattern), handler });
  }

  delete(pattern, handler) {
    this.routes.DELETE.push({ pattern: this._normalizePattern(pattern), handler });
  }

  patch(pattern, handler) {
    this.routes.PATCH.push({ pattern: this._normalizePattern(pattern), handler });
  }

  match(method, pathname) {
    const methodRoutes = this.routes[method] || [];
    for (const route of methodRoutes) {
      if (typeof route.pattern === 'string' && route.pattern === pathname) {
        return { handler: route.handler, params: {} };
      }
      if (route.pattern instanceof RegExp) {
        const match = pathname.match(route.pattern);
        if (match) {
          return { handler: route.handler, params: match.groups || {} };
        }
      }
    }
    return null;
  }

  async handle(req, res) {
    // Attach helper methods to res
    res.json = (statusCode, data) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(data));
    };

    res.error = (statusCode, message) => {
      res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify({ success: false, error: message }));
    };

    // Parse URL and Query parameters
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.pathname = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    // API Route Handling
    if (req.pathname.startsWith('/api/')) {
      const matched = this.match(req.method, req.pathname);
      if (matched) {
        req.params = matched.params;
        try {
          // Parse request body for POST / PUT / PATCH
          if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            req.body = await this.parseBody(req);
          } else {
            req.body = {};
          }
          return await matched.handler(req, res);
        } catch (err) {
          console.error('[Route Error]', err);
          return res.error(500, err.message || 'Internal Server Error');
        }
      }
      return res.error(404, `API route not found: ${req.method} ${req.pathname}`);
    }

    // Static File Serving
    return this.serveStatic(req, res);
  }

  parseBody(req) {
    return new Promise((resolve, reject) => {
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk.toString();
        // Guard against massive payloads (> 10MB)
        if (bodyData.length > 10 * 1024 * 1024) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if (!bodyData) return resolve({});
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            resolve(JSON.parse(bodyData));
          } catch (e) {
            reject(new Error('Invalid JSON format'));
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(bodyData);
          resolve(Object.fromEntries(params.entries()));
        } else {
          resolve({ raw: bodyData });
        }
      });
      req.on('error', reject);
    });
  }

  serveStatic(req, res) {
    let filePath = req.pathname;
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(this.publicDir, safePath);

    // Ensure within public directory
    if (!fullPath.startsWith(this.publicDir)) {
      res.writeHead(403);
      return res.end('Access denied');
    }

    fs.stat(fullPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>404 Not Found</h1><p>The requested Yaathirai page does not exist.</p>');
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
      });

      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
    });
  }
}

module.exports = Router;
