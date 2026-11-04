// ========================================================
// YAATHIRAI — LOCAL TOURISM PACKAGE BOOKING SYSTEM
// Main Application Server (Node.js Native HTTP)
// ========================================================

const http = require('http');
const path = require('path');
const db = require('./server/db');
const Router = require('./server/router');

const registerAuthRoutes = require('./server/routes/auth-routes');
const registerAdminRoutes = require('./server/routes/admin-routes');
const registerSuperAdminRoutes = require('./server/routes/superadmin-routes');

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

const router = new Router(PUBLIC_DIR);

// Register API Routes
registerAuthRoutes(router);
registerAdminRoutes(router);
registerSuperAdminRoutes(router);

// Native HTTP Server
const server = http.createServer(async (req, res) => {
  try {
    await router.handle(req, res);
  } catch (err) {
    console.error('[Unhandled Request Error]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

// Initialize database & start server
async function start() {
  console.log('--------------------------------------------------');
  console.log('   YAATHIRAI Local Tourism Package Booking System');
  console.log('--------------------------------------------------');
  
  await db.initDB();

  server.listen(PORT, () => {
    console.log(`[Server] Yaathirai server running on http://localhost:${PORT}`);
    console.log(`[Public] Landing Page: http://localhost:${PORT}/index.html`);
    console.log(`[Admin]  Admin Dashboard: http://localhost:${PORT}/admin/admin-dashboard.html`);
    console.log(`[Login]  Authentication: http://localhost:${PORT}/login.html`);
    console.log('--------------------------------------------------');
  });
}

start();

module.exports = server;
