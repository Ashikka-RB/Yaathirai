// ========================================================
// YAATHIRAI — AUTHENTICATION ROUTES
// Native Node.js endpoints for Login, Logout, Profile
// ========================================================

const db = require('../db');
const { generateToken, authenticateRequest } = require('../auth');

function registerAuthRoutes(router) {
  // POST /api/auth/login
  router.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.error(400, 'Please enter both email and password.');
    }

    try {
      const users = await db.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
      if (users.length === 0) {
        return res.error(401, 'Invalid email or password.');
      }

      const user = users[0];
      const isValidPass = db.verifyPassword ? db.verifyPassword(password, user.password) : (user.password === db.hashPassword(password) || user.password === password);

      if (!isValidPass) {
        return res.error(401, 'Invalid email or password.');
      }

      const statusNorm = String(user.status || '').toLowerCase();
      if (statusNorm === 'blocked') {
        return res.error(403, 'Your account has been blocked by an administrator.');
      }

      if (statusNorm === 'pending') {
        return res.error(403, 'Your account is pending administrator approval.');
      }

      const normRole = String(user.role || '').toLowerCase();
      // Fetch user permissions if admin
      let permissions = [];
      if (normRole === 'admin') {
        const perms = await db.query(
          'SELECT permission_name FROM admin_permissions WHERE admin_id = ?',
          [user.user_id]
        );
        permissions = perms.map((p) => p.permission_name);
      } else if (normRole === 'super_admin' || normRole === 'superadmin') {
        // Super admin has all permissions
        permissions = [
          'manage_customers',
          'manage_providers',
          'manage_destinations',
          'manage_categories',
          'manage_packages',
          'manage_bookings',
          'view_reports',
          'manage_admins',
          'manage_permissions',
          'system_logs',
          'system_settings'
        ];
      }

      const token = generateToken(user);

      // Log system login activity
      await db.logSystemActivity(
        user.user_id,
        'USER_LOGIN',
        `${user.role.toUpperCase()} '${user.name}' logged in successfully.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      // Set HTTP cookie for seamless browser navigation
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `yaathirai_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      });

      res.end(JSON.stringify({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.user_id,
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: normRole,
          status: statusNorm,
          token,
          permissions
        }
      }));
    } catch (err) {
      console.error('[Login Error]', err);
      res.error(500, 'Server error during login.');
    }
  });

  // POST /api/auth/logout
  router.post('/api/auth/logout', async (req, res) => {
    const user = await authenticateRequest(req);
    if (user) {
      await db.logSystemActivity(
        user.user_id,
        'USER_LOGOUT',
        `User '${user.name}' logged out.`,
        req.socket.remoteAddress || '127.0.0.1'
      );
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'yaathirai_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    });
    res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
  });

  // GET /api/auth/me
  router.get('/api/auth/me', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.error(401, 'Not authenticated');
    }

    res.json(200, {
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions: user.permissions || []
      }
    });
  });
}

module.exports = registerAuthRoutes;
