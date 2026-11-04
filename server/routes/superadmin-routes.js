// ========================================================
// YAATHIRAI — SUPER ADMIN REST API ROUTES
// Admin account management, permissions, system logs, settings
// All routes are restricted to the 'super_admin' role on the server.
//
// Data access works in BOTH modes of server/db.js:
//   • MySQL connected      -> real SQL through db.query()
//   • MySQL not connected  -> the in-memory repository (db.memStore)
// ========================================================

const db = require('../db');
const { authenticateRequest, requireRole } = require('../auth');

// Permissions a Super Admin may grant to an Admin account.
// (manage_admins / manage_permissions / system_logs / system_settings stay Super Admin-only.)
const ASSIGNABLE_PERMISSIONS = [
  'manage_customers',
  'manage_providers',
  'manage_destinations',
  'manage_categories',
  'manage_packages',
  'manage_bookings',
  'view_reports'
];

// System setting definitions
const SETTING_DEFS = {
  site_name: { type: 'string', default: 'Yaathirai', max: 80 },
  contact_email: { type: 'email', default: 'support@yaathirai.com' },
  platform_fee_percent: { type: 'number', default: 5, min: 0, max: 100 },
  allow_new_registrations: { type: 'boolean', default: true },
  maintenance_mode: { type: 'boolean', default: false }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clientIp(req) {
  return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function likeEscape(s) {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m);
}

function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseId(raw) {
  if (!/^\d+$/.test(String(raw || ''))) return null;
  const n = parseInt(raw, 10);
  return n > 0 ? n : null;
}

// ── input validation ──
function validateAdminInput(body, { requirePassword }) {
  const errors = [];
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const mobile = String(body.mobile || '').trim();
  const password = body.password === undefined || body.password === null ? '' : String(body.password);

  if (name.length < 2 || name.length > 100) errors.push('Name must be between 2 and 100 characters.');
  if (!EMAIL_RE.test(email) || email.length > 150) errors.push('Enter a valid email address.');
  if (mobile && !/^[0-9+\-\s]{7,20}$/.test(mobile)) errors.push('Enter a valid mobile number.');
  if (requirePassword || password) {
    if (password.length < 8) errors.push('Password must be at least 8 characters.');
    else if (password.length > 100) errors.push('Password is too long.');
  }
  return { errors, value: { name, email, mobile: mobile || null, password } };
}

function validatePermissions(list) {
  if (list === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(list)) return { ok: false, error: 'permissions must be an array.' };
  const clean = [...new Set(list.map((p) => String(p)))];
  const bad = clean.filter((p) => !ASSIGNABLE_PERMISSIONS.includes(p));
  if (bad.length) return { ok: false, error: `Unknown permission(s): ${bad.join(', ')}` };
  return { ok: true, value: clean };
}

function validateSetting(key, value) {
  const def = SETTING_DEFS[key];
  if (!def) return { error: `Unknown setting: ${key}` };
  if (def.type === 'boolean') {
    if (typeof value !== 'boolean') return { error: `${key} must be true or false.` };
    return { value, stored: String(value) };
  }
  if (def.type === 'number') {
    const n = typeof value === 'number' ? value : (typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);
    if (!Number.isFinite(n) || n < def.min || n > def.max) {
      return { error: `${key} must be a number between ${def.min} and ${def.max}.` };
    }
    return { value: n, stored: String(n) };
  }
  const s = typeof value === 'string' ? value.trim() : '';
  if (def.type === 'email') {
    if (!EMAIL_RE.test(s) || s.length > 150) return { error: `${key} must be a valid email address.` };
    return { value: s.toLowerCase(), stored: s.toLowerCase() };
  }
  if (!s || s.length > def.max) return { error: `${key} must be 1-${def.max} characters.` };
  return { value: s, stored: s };
}

function validDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
}

// ========================================================
// DATA LAYER 1 — MySQL
// ========================================================
const sqlStore = {
  async permissionsFor(adminIds) {
    const map = {};
    adminIds.forEach((id) => { map[id] = []; });
    if (!adminIds.length) return map;
    const rows = await db.query(
      `SELECT admin_id, permission_name FROM admin_permissions
       WHERE admin_id IN (${adminIds.map(() => '?').join(',')})
       ORDER BY permission_name`,
      adminIds
    );
    rows.forEach((r) => { (map[r.admin_id] = map[r.admin_id] || []).push(r.permission_name); });
    return map;
  },

  async dashboard() {
    const statRows = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active') AS active_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'blocked') AS inactive_admins,
        (SELECT COUNT(*) FROM users WHERE role = 'super_admin') AS super_admins,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM system_logs) AS total_logs,
        (SELECT COUNT(*) FROM system_logs WHERE created_at >= CURDATE()) AS logs_today,
        (SELECT COUNT(*) FROM system_logs WHERE action = 'USER_LOGIN' AND created_at >= CURDATE()) AS logins_today
    `);
    const recentLogs = await db.query(`
      SELECT l.log_id, l.user_id, u.name AS user_name, u.role AS user_role,
             l.action, l.description, l.created_at
      FROM system_logs l LEFT JOIN users u ON l.user_id = u.user_id
      ORDER BY l.created_at DESC, l.log_id DESC LIMIT 8`);
    const recentAdmins = await db.query(`
      SELECT user_id, name, email, status, created_at
      FROM users WHERE role = 'admin'
      ORDER BY created_at DESC, user_id DESC LIMIT 5`);
    return { stats: statRows[0] || {}, recentLogs, recentAdmins };
  },

  async listAdmins({ search, status, order }) {
    const where = ["role = 'admin'"];
    const params = [];
    if (search) {
      where.push('(name LIKE ? OR email LIKE ?)');
      const like = `%${likeEscape(search)}%`;
      params.push(like, like);
    }
    if (status) { where.push('status = ?'); params.push(status); }
    const orderSql = order === 'name' ? 'name' : 'created_at DESC, user_id DESC';
    const admins = await db.query(
      `SELECT user_id, name, email, mobile, status, created_at
       FROM users WHERE ${where.join(' AND ')} ORDER BY ${orderSql}`,
      params
    );
    const permMap = await this.permissionsFor(admins.map((a) => a.user_id));
    return admins.map((a) => ({ ...a, permissions: permMap[a.user_id] || [] }));
  },

  async getAdmin(id) {
    const rows = await db.query(
      `SELECT user_id, name, email, mobile, role, status, created_at
       FROM users WHERE user_id = ? AND role = 'admin'`, [id]);
    return rows[0] || null;
  },

  async emailTaken(email, exceptId) {
    const rows = exceptId
      ? await db.query('SELECT user_id FROM users WHERE email = ? AND user_id <> ?', [email, exceptId])
      : await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  },

  async setPermissions(adminId, perms) {
    await db.query('DELETE FROM admin_permissions WHERE admin_id = ?', [adminId]);
    for (const p of perms) {
      await db.query('INSERT INTO admin_permissions (admin_id, permission_name) VALUES (?, ?)', [adminId, p]);
    }
  },

  async createAdmin({ name, email, mobile, passwordHash, permissions }) {
    const result = await db.query(
      `INSERT INTO users (name, email, password, mobile, role, status) VALUES (?, ?, ?, ?, 'admin', 'active')`,
      [name, email, passwordHash, mobile]
    );
    const id = result && result.insertId;
    if (!id) throw new Error('Insert did not return an id.');
    await this.setPermissions(id, permissions || []);
    return id;
  },

  async updateAdmin(id, { name, email, mobile, passwordHash }) {
    if (passwordHash) {
      await db.query('UPDATE users SET name = ?, email = ?, mobile = ?, password = ? WHERE user_id = ? AND role = ?',
        [name, email, mobile, passwordHash, id, 'admin']);
    } else {
      await db.query('UPDATE users SET name = ?, email = ?, mobile = ? WHERE user_id = ? AND role = ?',
        [name, email, mobile, id, 'admin']);
    }
  },

  async setStatus(id, status) {
    await db.query('UPDATE users SET status = ? WHERE user_id = ? AND role = ?', [status, id, 'admin']);
  },

  async deleteAdmin(id) {
    await db.query('DELETE FROM admin_permissions WHERE admin_id = ?', [id]);
    await db.query('DELETE FROM users WHERE user_id = ? AND role = ?', [id, 'admin']);
  },

  async queryLogs({ action, search, userId, from, to, page, limit }) {
    const where = ['1=1'];
    const params = [];
    if (action) { where.push('l.action = ?'); params.push(action); }
    if (userId) { where.push('l.user_id = ?'); params.push(userId); }
    if (search) {
      where.push('(l.description LIKE ? OR u.name LIKE ?)');
      const like = `%${likeEscape(search)}%`;
      params.push(like, like);
    }
    if (from) { where.push('l.created_at >= ?'); params.push(from + ' 00:00:00'); }
    if (to) { where.push('l.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to + ' 00:00:00'); }
    const whereSql = where.join(' AND ');

    const countRows = await db.query(
      `SELECT COUNT(*) AS total FROM system_logs l LEFT JOIN users u ON l.user_id = u.user_id WHERE ${whereSql}`, params);
    const total = Number((countRows[0] || {}).total) || 0;
    const logs = await db.query(
      `SELECT l.log_id, l.user_id, u.name AS user_name, u.role AS user_role,
              l.action, l.description, l.ip_address, l.created_at
       FROM system_logs l LEFT JOIN users u ON l.user_id = u.user_id
       WHERE ${whereSql}
       ORDER BY l.created_at DESC, l.log_id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    const actionRows = await db.query('SELECT DISTINCT action FROM system_logs ORDER BY action');
    return { logs, total, actions: actionRows.map((r) => r.action) };
  },

  async ensureSettingsTable() {
    if (!this._ready) {
      this._ready = (async () => {
        await db.query(`
          CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value VARCHAR(500) NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB`);
        for (const [key, def] of Object.entries(SETTING_DEFS)) {
          await db.query('INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
            [key, String(def.default)]);
        }
      })().catch((err) => { this._ready = null; throw err; });
    }
    return this._ready;
  },

  async loadSettings() {
    await this.ensureSettingsTable();
    const rows = await db.query('SELECT setting_key, setting_value, updated_at FROM system_settings');
    const settings = {};
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      const row = rows.find((r) => r.setting_key === key);
      const raw = row ? row.setting_value : String(def.default);
      settings[key] = def.type === 'boolean' ? raw === 'true' : def.type === 'number' ? Number(raw) : raw;
    }
    const updated = rows.map((r) => r.updated_at).filter(Boolean).sort().pop() || null;
    return { settings, updated_at: updated };
  },

  async saveSettings(entries, userId) {
    await this.ensureSettingsTable();
    for (const { key, stored } of entries) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [key, stored, userId]
      );
    }
  }
};

// ========================================================
// DATA LAYER 2 — in-memory repository (db.memStore)
// ========================================================
let memSettingsUpdatedAt = null;

const memStoreImpl = {
  s() { return db.memStore; },

  permsOf(adminId) {
    return this.s().admin_permissions
      .filter((p) => p.admin_id === adminId)
      .map((p) => p.permission_name)
      .sort();
  },

  publicAdmin(u) {
    return { user_id: u.user_id, name: u.name, email: u.email, mobile: u.mobile || null, status: u.status, created_at: u.created_at };
  },

  async dashboard() {
    const st = this.s();
    const users = st.users;
    const today = new Date().toISOString().slice(0, 10);
    const logsToday = st.system_logs.filter((l) => String(l.created_at).startsWith(today));
    const admins = users.filter((u) => u.role === 'admin');
    const byNewest = (a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)) || (b.log_id || b.user_id) - (a.log_id || a.user_id);

    return {
      stats: {
        total_admins: admins.length,
        active_admins: admins.filter((u) => u.status === 'active').length,
        inactive_admins: admins.filter((u) => u.status === 'blocked').length,
        super_admins: users.filter((u) => u.role === 'super_admin').length,
        total_users: users.length,
        total_logs: st.system_logs.length,
        logs_today: logsToday.length,
        logins_today: logsToday.filter((l) => l.action === 'USER_LOGIN').length
      },
      recentLogs: this.joinLogs(st.system_logs).sort(byNewest).slice(0, 8).map((l) => ({
        log_id: l.log_id, user_id: l.user_id, user_name: l.user_name, user_role: l.user_role,
        action: l.action, description: l.description, created_at: l.created_at
      })),
      recentAdmins: admins.slice().sort(byNewest).slice(0, 5).map((u) => ({
        user_id: u.user_id, name: u.name, email: u.email, status: u.status, created_at: u.created_at
      }))
    };
  },

  joinLogs(logs) {
    return logs.map((l) => {
      const u = this.s().users.find((x) => x.user_id === l.user_id);
      return { ...l, user_name: u ? u.name : null, user_role: u ? u.role : null };
    });
  },

  async listAdmins({ search, status, order }) {
    let list = this.s().users.filter((u) => u.role === 'admin');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (status) list = list.filter((u) => u.status === status);
    list = list.slice().sort(order === 'name'
      ? (a, b) => a.name.localeCompare(b.name)
      : (a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.user_id - a.user_id);
    return list.map((u) => ({ ...this.publicAdmin(u), permissions: this.permsOf(u.user_id) }));
  },

  async getAdmin(id) {
    const u = this.s().users.find((x) => x.user_id === id && x.role === 'admin');
    return u ? { ...this.publicAdmin(u), role: u.role } : null;
  },

  async emailTaken(email, exceptId) {
    return this.s().users.some((u) => u.email.toLowerCase() === email && u.user_id !== exceptId);
  },

  async setPermissions(adminId, perms) {
    const st = this.s();
    st.admin_permissions = st.admin_permissions.filter((p) => p.admin_id !== adminId);
    let nextId = st.admin_permissions.reduce((m, p) => Math.max(m, p.permission_id || 0), 0) + 1;
    for (const p of perms) {
      st.admin_permissions.push({ permission_id: nextId++, admin_id: adminId, permission_name: p });
    }
  },

  async createAdmin({ name, email, mobile, passwordHash, permissions }) {
    const st = this.s();
    const id = st.users.reduce((m, u) => Math.max(m, u.user_id), 0) + 1;
    st.users.push({
      user_id: id, name, email, password: passwordHash, mobile, role: 'admin',
      status: 'active', created_at: nowStamp()
    });
    await this.setPermissions(id, permissions || []);
    return id;
  },

  async updateAdmin(id, { name, email, mobile, passwordHash }) {
    const u = this.s().users.find((x) => x.user_id === id && x.role === 'admin');
    if (!u) return;
    u.name = name; u.email = email; u.mobile = mobile;
    if (passwordHash) u.password = passwordHash;
  },

  async setStatus(id, status) {
    const u = this.s().users.find((x) => x.user_id === id && x.role === 'admin');
    if (u) u.status = status;
  },

  async deleteAdmin(id) {
    const st = this.s();
    st.admin_permissions = st.admin_permissions.filter((p) => p.admin_id !== id);
    st.users = st.users.filter((u) => !(u.user_id === id && u.role === 'admin'));
  },

  async queryLogs({ action, search, userId, from, to, page, limit }) {
    const st = this.s();
    let rows = this.joinLogs(st.system_logs);
    if (action) rows = rows.filter((l) => l.action === action);
    if (userId) rows = rows.filter((l) => l.user_id === userId);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((l) => String(l.description || '').toLowerCase().includes(q) ||
        String(l.user_name || '').toLowerCase().includes(q));
    }
    if (from) rows = rows.filter((l) => String(l.created_at).slice(0, 10) >= from);
    if (to) rows = rows.filter((l) => String(l.created_at).slice(0, 10) <= to);
    rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.log_id - a.log_id);

    const total = rows.length;
    const actions = [...new Set(st.system_logs.map((l) => l.action))].sort();
    const logs = rows.slice((page - 1) * limit, (page - 1) * limit + limit).map((l) => ({
      log_id: l.log_id, user_id: l.user_id, user_name: l.user_name, user_role: l.user_role,
      action: l.action, description: l.description, ip_address: l.ip_address, created_at: l.created_at
    }));
    return { logs, total, actions };
  },

  async loadSettings() {
    const stored = this.s().system_settings || {};
    const settings = {};
    for (const [key, def] of Object.entries(SETTING_DEFS)) {
      settings[key] = stored[key] !== undefined ? stored[key] : def.default;
    }
    return { settings, updated_at: memSettingsUpdatedAt };
  },

  async saveSettings(entries) {
    const st = this.s();
    if (!st.system_settings) st.system_settings = {};
    for (const { key, value } of entries) st.system_settings[key] = value;
    memSettingsUpdatedAt = nowStamp();
  }
};

// Choose the data layer for each request
function store() {
  const connected = typeof db.getIsConnected === 'function' ? db.getIsConnected() : false;
  if (connected) return sqlStore;
  if (!db.memStore) throw new Error('No database available (MySQL is not connected and no in-memory store was found).');
  return memStoreImpl;
}

// ========================================================
// ROUTES
// ========================================================
function registerSuperAdminRoutes(router) {
  const superGuard = requireRole(['super_admin']);

  // Authenticates and enforces Super Admin. Returns the user, or null after sending 401/403.
  async function requireSuper(req, res) {
    const user = await authenticateRequest(req);
    if (!superGuard(req, res, user)) return null;
    if (user.role !== 'super_admin') {
      res.error(403, 'Access denied. Super Admin only.');
      return null;
    }
    return user;
  }

  // GET /api/superadmin/dashboard-stats
  router.get('/api/superadmin/dashboard-stats', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;
    try {
      const data = await store().dashboard();
      res.json(200, { success: true, ...data });
    } catch (err) {
      console.error('[SuperAdmin Dashboard Error]', err);
      res.error(500, 'Failed to load Super Admin dashboard.');
    }
  });

  // GET /api/superadmin/admins?search=&status=
  router.get('/api/superadmin/admins', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    if (status && !['active', 'blocked'].includes(status)) {
      return res.error(400, "Invalid status filter. Use 'active' or 'blocked'.");
    }
    try {
      const admins = await store().listAdmins({ search, status });
      res.json(200, { success: true, admins, assignablePermissions: ASSIGNABLE_PERMISSIONS });
    } catch (err) {
      console.error('[List Admins Error]', err);
      res.error(500, 'Failed to load administrators.');
    }
  });

  // POST /api/superadmin/admins   { name, email, mobile?, password, permissions? }
  router.post('/api/superadmin/admins', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const body = req.body || {};
    const { errors, value } = validateAdminInput(body, { requirePassword: true });
    const perms = validatePermissions(body.permissions);
    if (!perms.ok) errors.push(perms.error);
    if (errors.length) return res.error(400, errors.join(' '));

    try {
      const s = store();
      if (await s.emailTaken(value.email)) return res.error(409, 'An account with this email already exists.');

      const newId = await s.createAdmin({
        name: value.name, email: value.email, mobile: value.mobile,
        passwordHash: db.hashPassword(value.password), permissions: perms.value || []
      });

      await db.logSystemActivity(user.user_id, 'ADMIN_CREATE',
        `Super Admin '${user.name}' created administrator '${value.name}' (${value.email}).`, clientIp(req));

      res.json(201, { success: true, message: 'Administrator created.', admin_id: newId });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') return res.error(409, 'An account with this email already exists.');
      console.error('[Create Admin Error]', err);
      res.error(500, 'Failed to create administrator.');
    }
  });

  // PUT /api/superadmin/admins/:id   { name, email, mobile?, password? (optional reset) }
  router.put(/^\/api\/superadmin\/admins\/(?<id>\d+)$/, async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const id = parseId(req.params.id);
    if (!id) return res.error(400, 'Invalid administrator id.');
    const { errors, value } = validateAdminInput(req.body || {}, { requirePassword: false });
    if (errors.length) return res.error(400, errors.join(' '));

    try {
      const s = store();
      const admin = await s.getAdmin(id);
      if (!admin) return res.error(404, 'Administrator not found.');
      if (await s.emailTaken(value.email, id)) return res.error(409, 'Another account already uses this email.');

      await s.updateAdmin(id, {
        name: value.name, email: value.email, mobile: value.mobile,
        passwordHash: value.password ? db.hashPassword(value.password) : null
      });

      await db.logSystemActivity(user.user_id, 'ADMIN_UPDATE',
        `Super Admin '${user.name}' updated administrator '${value.name}' (id ${id})${value.password ? ' and reset the password' : ''}.`,
        clientIp(req));

      res.json(200, { success: true, message: 'Administrator updated.' });
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') return res.error(409, 'Another account already uses this email.');
      console.error('[Update Admin Error]', err);
      res.error(500, 'Failed to update administrator.');
    }
  });

  // PATCH /api/superadmin/admins/:id/status   { status: 'active' | 'blocked' }
  router.patch(/^\/api\/superadmin\/admins\/(?<id>\d+)\/status$/, async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const id = parseId(req.params.id);
    if (!id) return res.error(400, 'Invalid administrator id.');
    const status = String((req.body || {}).status || '');
    if (!['active', 'blocked'].includes(status)) return res.error(400, "Status must be 'active' or 'blocked'.");
    if (id === user.user_id) return res.error(400, 'You cannot change your own status.');

    try {
      const s = store();
      const admin = await s.getAdmin(id);
      if (!admin) return res.error(404, 'Administrator not found.');
      await s.setStatus(id, status);

      await db.logSystemActivity(user.user_id, status === 'blocked' ? 'ADMIN_DEACTIVATE' : 'ADMIN_ACTIVATE',
        `Super Admin '${user.name}' ${status === 'blocked' ? 'deactivated' : 'activated'} administrator '${admin.name}' (id ${id}).`,
        clientIp(req));

      res.json(200, { success: true, message: `Administrator ${status === 'blocked' ? 'deactivated' : 'activated'}.` });
    } catch (err) {
      console.error('[Admin Status Error]', err);
      res.error(500, 'Failed to update administrator status.');
    }
  });

  // DELETE /api/superadmin/admins/:id
  router.delete(/^\/api\/superadmin\/admins\/(?<id>\d+)$/, async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const id = parseId(req.params.id);
    if (!id) return res.error(400, 'Invalid administrator id.');
    if (id === user.user_id) return res.error(400, 'You cannot delete your own account.');

    try {
      const s = store();
      const admin = await s.getAdmin(id);
      if (!admin) return res.error(404, 'Administrator not found.');
      await s.deleteAdmin(id);

      await db.logSystemActivity(user.user_id, 'ADMIN_DELETE',
        `Super Admin '${user.name}' deleted administrator '${admin.name}' (${admin.email}).`, clientIp(req));

      res.json(200, { success: true, message: 'Administrator deleted.' });
    } catch (err) {
      console.error('[Delete Admin Error]', err);
      res.error(500, 'Failed to delete administrator.');
    }
  });

  // GET /api/superadmin/permissions  → catalog + every admin's current grants
  router.get('/api/superadmin/permissions', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;
    try {
      const admins = await store().listAdmins({ order: 'name' });
      res.json(200, {
        success: true,
        assignablePermissions: ASSIGNABLE_PERMISSIONS,
        admins: admins.map((a) => ({
          user_id: a.user_id, name: a.name, email: a.email, status: a.status, permissions: a.permissions
        }))
      });
    } catch (err) {
      console.error('[List Permissions Error]', err);
      res.error(500, 'Failed to load permissions.');
    }
  });

  // PUT /api/superadmin/admins/:id/permissions   { permissions: [...] }
  router.put(/^\/api\/superadmin\/admins\/(?<id>\d+)\/permissions$/, async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const id = parseId(req.params.id);
    if (!id) return res.error(400, 'Invalid administrator id.');
    const perms = validatePermissions((req.body || {}).permissions);
    if (!perms.ok) return res.error(400, perms.error);
    if (perms.value === undefined) return res.error(400, 'permissions array is required.');

    try {
      const s = store();
      const admin = await s.getAdmin(id);
      if (!admin) return res.error(404, 'Administrator not found.');
      await s.setPermissions(id, perms.value);

      await db.logSystemActivity(user.user_id, 'PERMISSIONS_UPDATE',
        `Super Admin '${user.name}' set permissions for '${admin.name}' (id ${id}): ${perms.value.join(', ') || 'none'}.`,
        clientIp(req));

      res.json(200, { success: true, message: 'Permissions updated.', permissions: perms.value });
    } catch (err) {
      console.error('[Update Permissions Error]', err);
      res.error(500, 'Failed to update permissions.');
    }
  });

  // GET /api/superadmin/logs?action=&search=&user_id=&from=&to=&page=&limit=
  router.get('/api/superadmin/logs', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const action = String(req.query.action || '').trim();
    const search = String(req.query.search || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const userIdRaw = String(req.query.user_id || '').trim();

    if (from && !validDate(from)) return res.error(400, "Invalid 'from' date. Use YYYY-MM-DD.");
    if (to && !validDate(to)) return res.error(400, "Invalid 'to' date. Use YYYY-MM-DD.");
    if (from && to && from > to) return res.error(400, "'from' date cannot be later than 'to' date.");
    if (action && !/^[A-Z0-9_]{1,100}$/.test(action)) return res.error(400, 'Invalid action filter.');
    if (userIdRaw && !parseId(userIdRaw)) return res.error(400, 'Invalid user_id.');

    let page = parseInt(req.query.page || '1', 10);
    let limit = parseInt(req.query.limit || '25', 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 25;
    if (limit > 100) limit = 100;

    try {
      const { logs, total, actions } = await store().queryLogs({
        action, search, userId: userIdRaw ? parseId(userIdRaw) : null, from, to, page, limit
      });
      res.json(200, {
        success: true, logs, actions,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
      });
    } catch (err) {
      console.error('[System Logs Error]', err);
      res.error(500, 'Failed to load system logs.');
    }
  });

  // GET /api/superadmin/settings
  router.get('/api/superadmin/settings', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;
    try {
      const { settings, updated_at } = await store().loadSettings();
      res.json(200, { success: true, settings, updated_at });
    } catch (err) {
      console.error('[Get Settings Error]', err);
      res.error(500, 'Failed to load system settings.');
    }
  });

  // PUT /api/superadmin/settings
  router.put('/api/superadmin/settings', async (req, res) => {
    const user = await requireSuper(req, res);
    if (!user) return;

    const body = req.body || {};
    const keys = Object.keys(body);
    if (!keys.length) return res.error(400, 'No settings provided.');

    const entries = [];
    const errors = [];
    for (const key of keys) {
      const r = validateSetting(key, body[key]);
      if (r.error) errors.push(r.error);
      else entries.push({ key, value: r.value, stored: r.stored });
    }
    if (errors.length) return res.error(400, errors.join(' '));

    try {
      const s = store();
      await s.saveSettings(entries, user.user_id);

      await db.logSystemActivity(user.user_id, 'SETTINGS_UPDATE',
        `Super Admin '${user.name}' updated system settings: ${entries.map((e) => `${e.key}=${e.stored}`).join(', ')}.`,
        clientIp(req));

      const { settings } = await s.loadSettings();
      res.json(200, { success: true, message: 'Settings saved.', settings });
    } catch (err) {
      console.error('[Update Settings Error]', err);
      res.error(500, 'Failed to save system settings.');
    }
  });
}

module.exports = registerSuperAdminRoutes;