// ========================================================
// YAATHIRAI — AUTHENTICATION & RBAC MIDDLEWARE
// Node.js Built-in Crypto Authentication
// ========================================================

const crypto = require('crypto');
const db = require('./db');

const SECRET_KEY = process.env.SESSION_SECRET || 'yaathirai_secret_jwt_key_2026_local_tourism';

function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim().toLowerCase();
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  return r;
}

function normalizeStatus(status) {
  if (!status) return 'active';
  const s = String(status).trim().toLowerCase();
  return s;
}

function generateToken(user) {
  const normRole = normalizeRole(user.role);
  const normStatus = normalizeStatus(user.status);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: normRole,
    status: normStatus,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null; // Expired
    return data;
  } catch (e) {
    return null;
  }
}

// Extracts token from Authorization header or cookie
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check cookie: yaathirai_token=...
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/yaathirai_token=([^;]+)/);
    if (match) return match[1].trim();
  }

  return null;
}

// Authenticate request and attach req.user
async function authenticateRequest(req) {
  const token = extractToken(req);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // Re-check the account so deactivated or deleted users lose access immediately
  try {
    const found = await db.query('SELECT user_id, role, status FROM users WHERE user_id = ?', [decoded.user_id]);
    if (!found.length) return null;
    const currentStatus = normalizeStatus(found[0].status);
    if (currentStatus === 'blocked' || currentStatus === 'inactive') return null;
    decoded.role = normalizeRole(found[0].role);
    decoded.status = currentStatus;
  } catch (err) {
    // If the lookup itself fails, fall back to the data inside the token
    decoded.role = normalizeRole(decoded.role);
    decoded.status = normalizeStatus(decoded.status);
  }

  // Retrieve user fresh permissions
  let permissions = [];
  try {
    const rows = await db.query(
      'SELECT permission_name FROM admin_permissions WHERE admin_id = ?',
      [decoded.user_id]
    );
    permissions = rows.map((r) => r.permission_name);
  } catch (err) {
    permissions = [];
  }

  return {
    ...decoded,
    permissions
  };
}

// Role guard helper
function requireRole(allowedRoles) {
  const normAllowed = allowedRoles.map(normalizeRole);
  return (req, res, user) => {
    if (!user) {
      res.error(401, 'Authentication required. Please log in.');
      return false;
    }

    const userStatus = normalizeStatus(user.status);
    if (userStatus !== 'active' && userStatus !== 'approved') {
      res.error(403, 'Your account is suspended or pending approval.');
      return false;
    }

    const userRole = normalizeRole(user.role);
    // Super Admin has access to all admin functions
    if (userRole === 'super_admin') {
      return true;
    }

    if (!normAllowed.includes(userRole)) {
      res.error(403, `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`);
      return false;
    }

    return true;
  };
}

// Permission guard helper (enforced at API level!)
function requirePermission(permName) {
  return (req, res, user) => {
    if (!user) {
      res.error(401, 'Authentication required. Please log in.');
      return false;
    }

    // Super Admin automatically possesses all permissions
    if (user.role === 'super_admin') {
      return true;
    }

    if (user.role === 'admin' && user.permissions && user.permissions.includes(permName)) {
      return true;
    }

    res.error(403, `Permission denied: Missing '${permName}' permission.`);
    return false;
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateRequest,
  requireRole,
  requirePermission
};
