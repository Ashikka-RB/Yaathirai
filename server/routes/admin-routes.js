// ========================================================
// YAATHIRAI — ADMIN REST API ROUTES
// Endpoints for Admin Dashboard, Metrics, Approvals & Activity
// ========================================================

const db = require('../db');
const { authenticateRequest, requireRole, requirePermission } = require('../auth');
const { buildMemoryReport } = require('../reports-memory');

function registerAdminRoutes(router) {
  const adminGuard = requireRole(['admin', 'super_admin']);

  // GET /api/admin/dashboard-stats
  router.get('/api/admin/dashboard-stats', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!adminGuard(req, res, user)) return;

    try {
      const stats = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
          (SELECT COUNT(*) FROM users WHERE role = 'provider') AS total_providers,
          (SELECT COUNT(*) FROM users WHERE role = 'provider' AND status = 'pending') AS pending_providers,
          (SELECT COUNT(*) FROM tour_packages) AS total_packages,
          (SELECT COUNT(*) FROM tour_packages WHERE status = 'pending') AS pending_packages,
          (SELECT COUNT(*) FROM bookings) AS total_bookings,
          (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') AS confirmed_bookings,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE payment_status = 'paid') AS total_revenue
      `);

      res.json(200, {
        success: true,
        stats: stats[0] || {}
      });
    } catch (err) {
      console.error('[Dashboard Stats Error]', err);
      res.error(500, 'Failed to load dashboard statistics.');
    }
  });

  // GET /api/admin/recent-bookings
  router.get('/api/admin/recent-bookings', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!adminGuard(req, res, user)) return;

    try {
      const bookings = await db.query(`
        SELECT 
          b.booking_id,
          b.customer_id,
          u.name AS customer_name,
          u.email AS customer_email,
          p.title AS package_title,
          d.name AS destination_name,
          b.travelers,
          b.total_amount,
          b.booking_status,
          b.payment_status,
          b.booked_at
        FROM bookings b
        JOIN users u ON b.customer_id = u.user_id
        JOIN tour_packages p ON b.package_id = p.package_id
        JOIN destinations d ON p.destination_id = d.destination_id
        ORDER BY b.booked_at DESC
        LIMIT 6
      `);

      res.json(200, {
        success: true,
        bookings
      });
    } catch (err) {
      console.error('[Recent Bookings Error]', err);
      res.error(500, 'Failed to fetch recent bookings.');
    }
  });

  // GET /api/admin/pending-approvals
  router.get('/api/admin/pending-approvals', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!adminGuard(req, res, user)) return;

    try {
      // Pending providers
      const pendingProviders = await db.query(`
        SELECT user_id, name, email, mobile, status, created_at
        FROM users
        WHERE role = 'provider' AND status = 'pending'
        ORDER BY created_at DESC
      `);

      // Pending packages
      const pendingPackages = await db.query(`
        SELECT 
          p.package_id,
          p.title,
          p.price,
          p.duration_days,
          p.capacity,
          p.image,
          p.status,
          p.created_at,
          u.name AS provider_name,
          d.name AS destination_name,
          c.category_name
        FROM tour_packages p
        JOIN users u ON p.provider_id = u.user_id
        JOIN destinations d ON p.destination_id = d.destination_id
        JOIN categories c ON p.category_id = c.category_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
      `);

      res.json(200, {
        success: true,
        pendingProviders,
        pendingPackages
      });
    } catch (err) {
      console.error('[Pending Approvals Error]', err);
      res.error(500, 'Failed to fetch pending approvals.');
    }
  });

  // GET /api/admin/recent-activity
  router.get('/api/admin/recent-activity', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!adminGuard(req, res, user)) return;

    try {
      const logs = await db.query(`
        SELECT 
          l.log_id,
          l.user_id,
          u.name AS user_name,
          u.role AS user_role,
          l.action,
          l.description,
          l.created_at
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.user_id
        ORDER BY l.created_at DESC
        LIMIT 8
      `);

      res.json(200, {
        success: true,
        logs
      });
    } catch (err) {
      console.error('[Activity Logs Error]', err);
      res.error(500, 'Failed to fetch system activity.');
    }
  });

  // ========================================================
  // CUSTOMER MANAGEMENT APIS (Permission: manage_customers)
  // ========================================================

  const customerGuard = requirePermission('manage_customers');

  // GET /api/admin/customers
  router.get('/api/admin/customers', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!customerGuard(req, res, user)) return;

    try {
      const { search = '', status = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT u.user_id, u.name, u.email, u.mobile, u.status, u.created_at,
                 COUNT(b.booking_id) AS total_bookings,
                 COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS total_spent
          FROM users u
          LEFT JOIN bookings b ON u.user_id = b.customer_id
          WHERE u.role = 'customer'
        `;
        const params = [];

        if (status && status !== 'all') {
          sql += ' AND u.status = ?';
          params.push(status);
        }

        if (search) {
          sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term);
        }

        sql += ' GROUP BY u.user_id ORDER BY u.created_at DESC';
        const customers = await db.query(sql, params);
        return res.json(200, { success: true, customers });
      }

      // Memory store handler
      let list = db.memStore.users.filter((u) => u.role === 'customer');

      if (status && status !== 'all') {
        list = list.filter((u) => u.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter((u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.mobile && u.mobile.includes(q))
        );
      }

      const customers = list.map((c) => {
        const userBookings = db.memStore.bookings.filter((b) => b.customer_id === c.user_id);
        const totalSpent = userBookings
          .filter((b) => b.payment_status === 'paid')
          .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

        return {
          user_id: c.user_id,
          name: c.name,
          email: c.email,
          mobile: c.mobile,
          status: c.status,
          created_at: c.created_at,
          total_bookings: userBookings.length,
          total_spent: totalSpent
        };
      });

      res.json(200, { success: true, customers });
    } catch (err) {
      console.error('[Get Customers Error]', err);
      res.error(500, 'Failed to fetch customers list.');
    }
  });

  // GET /api/admin/customers/:id
  router.get('/api/admin/customers/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!customerGuard(req, res, user)) return;

    try {
      const customerId = parseInt(req.params.id, 10);
      const userRows = await db.query('SELECT user_id, name, email, mobile, status, created_at FROM users WHERE user_id = ?', [customerId]);
      if (userRows.length === 0) {
        return res.error(404, 'Customer not found.');
      }

      const customer = userRows[0];
      const bookings = await db.query('SELECT * FROM bookings WHERE customer_id = ? ORDER BY booked_at DESC', [customerId]);

      res.json(200, {
        success: true,
        customer,
        bookings
      });
    } catch (err) {
      console.error('[Get Customer Details Error]', err);
      res.error(500, 'Failed to fetch customer details.');
    }
  });

  // PATCH /api/admin/customers/:id/status
  router.patch('/api/admin/customers/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!customerGuard(req, res, user)) return;

    const customerId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['active', 'blocked'].includes(status)) {
      return res.error(400, "Invalid status. Allowed values: 'active', 'blocked'.");
    }

    try {
      const existing = await db.query('SELECT user_id, name, status FROM users WHERE user_id = ?', [customerId]);
      if (existing.length === 0) {
        return res.error(404, 'Customer not found.');
      }

      await db.query('UPDATE users SET status = ? WHERE user_id = ?', [status, customerId]);

      await db.logSystemActivity(
        user.user_id,
        'CUSTOMER_STATUS_UPDATE',
        `Admin '${user.name}' updated customer '${existing[0].name}' status from '${existing[0].status}' to '${status}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: `Customer account is now ${status}.`,
        user_id: customerId,
        status
      });
    } catch (err) {
      console.error('[Update Customer Status Error]', err);
      res.error(500, 'Failed to update customer status.');
    }
  });

  // ========================================================
  // PROVIDER MANAGEMENT APIS (Permission: manage_providers)
  // ========================================================

  const providerGuard = requirePermission('manage_providers');

  // GET /api/admin/providers
  router.get('/api/admin/providers', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!providerGuard(req, res, user)) return;

    try {
      const { search = '', status = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT u.user_id, u.name, u.email, u.mobile, u.status, u.created_at,
                 COUNT(p.package_id) AS total_packages
          FROM users u
          LEFT JOIN tour_packages p ON u.user_id = p.provider_id
          WHERE u.role = 'provider'
        `;
        const params = [];

        if (status && status !== 'all') {
          sql += ' AND u.status = ?';
          params.push(status);
        }

        if (search) {
          sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term);
        }

        sql += ' GROUP BY u.user_id ORDER BY u.created_at DESC';
        const providers = await db.query(sql, params);
        return res.json(200, { success: true, providers });
      }

      // Memory store handler
      let list = db.memStore.users.filter((u) => u.role === 'provider');

      if (status && status !== 'all') {
        list = list.filter((u) => u.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        list = list.filter((u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.mobile && u.mobile.includes(q))
        );
      }

      const providers = list.map((p) => {
        const packages = db.memStore.tour_packages.filter((pkg) => pkg.provider_id === p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          mobile: p.mobile,
          status: p.status,
          created_at: p.created_at,
          total_packages: packages.length
        };
      });

      res.json(200, { success: true, providers });
    } catch (err) {
      console.error('[Get Providers Error]', err);
      res.error(500, 'Failed to fetch providers list.');
    }
  });

  // GET /api/admin/providers/:id
  router.get('/api/admin/providers/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!providerGuard(req, res, user)) return;

    try {
      const providerId = parseInt(req.params.id, 10);
      const userRows = await db.query('SELECT user_id, name, email, mobile, status, created_at FROM users WHERE user_id = ? AND role = "provider"', [providerId]);
      if (userRows.length === 0) {
        return res.error(404, 'Provider not found.');
      }

      const provider = userRows[0];
      const packages = await db.query('SELECT * FROM tour_packages WHERE provider_id = ?', [providerId]);

      res.json(200, {
        success: true,
        provider,
        packages
      });
    } catch (err) {
      console.error('[Get Provider Details Error]', err);
      res.error(500, 'Failed to fetch provider details.');
    }
  });

  // PATCH /api/admin/providers/:id/status
  router.patch('/api/admin/providers/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!providerGuard(req, res, user)) return;

    const providerId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['active', 'pending', 'rejected', 'blocked'].includes(status)) {
      return res.error(400, "Invalid status. Allowed values: 'active', 'pending', 'rejected', 'blocked'.");
    }

    try {
      const existing = await db.query('SELECT user_id, name, status FROM users WHERE user_id = ? AND role = "provider"', [providerId]);
      if (existing.length === 0) {
        return res.error(404, 'Provider not found.');
      }

      await db.query('UPDATE users SET status = ? WHERE user_id = ?', [status, providerId]);

      await db.logSystemActivity(
        user.user_id,
        'PROVIDER_STATUS_UPDATE',
        `Admin '${user.name}' updated provider '${existing[0].name}' status from '${existing[0].status}' to '${status}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: `Provider status updated to '${status}'.`,
        user_id: providerId,
        status
      });
    } catch (err) {
      console.error('[Update Provider Status Error]', err);
      res.error(500, 'Failed to update provider status.');
    }
  });

  // ========================================================
  // DESTINATION MANAGEMENT APIS (Permission: manage_destinations)
  // ========================================================

  const destinationGuard = requirePermission('manage_destinations');

  // GET /api/admin/destinations
  router.get('/api/admin/destinations', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!destinationGuard(req, res, user)) return;

    try {
      const { search = '', status = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT d.*, COUNT(p.package_id) AS total_packages
          FROM destinations d
          LEFT JOIN tour_packages p ON d.destination_id = p.destination_id
          WHERE 1=1
        `;
        const params = [];
        if (status && status !== 'all') {
          sql += ' AND d.status = ?';
          params.push(status);
        }
        if (search) {
          sql += ' AND (d.name LIKE ? OR d.city LIKE ? OR d.description LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term);
        }
        sql += ' GROUP BY d.destination_id ORDER BY d.name ASC';
        const destinations = await db.query(sql, params);
        return res.json(200, { success: true, destinations });
      }

      // Memory store handler
      let list = [...db.memStore.destinations];
      if (status && status !== 'all') {
        list = list.filter((d) => d.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((d) =>
          d.name.toLowerCase().includes(q) ||
          (d.city && d.city.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q))
        );
      }

      const destinations = list.map((d) => {
        const pkgs = db.memStore.tour_packages.filter((p) => p.destination_id === d.destination_id);
        return {
          ...d,
          total_packages: pkgs.length
        };
      });

      res.json(200, { success: true, destinations });
    } catch (err) {
      console.error('[Get Destinations Error]', err);
      res.error(500, 'Failed to fetch destinations.');
    }
  });

  // GET /api/admin/destinations/:id
  router.get('/api/admin/destinations/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!destinationGuard(req, res, user)) return;

    try {
      const destId = parseInt(req.params.id, 10);
      const rows = await db.query('SELECT * FROM destinations WHERE destination_id = ?', [destId]);
      if (rows.length === 0) {
        return res.error(404, 'Destination not found.');
      }
      res.json(200, { success: true, destination: rows[0] });
    } catch (err) {
      console.error('[Get Destination Error]', err);
      res.error(500, 'Failed to fetch destination details.');
    }
  });

  // POST /api/admin/destinations
  router.post('/api/admin/destinations', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!destinationGuard(req, res, user)) return;

    const { name, city, state = 'Tamil Nadu', country = 'India', description = '', status = 'active' } = req.body;
    if (!name || !name.trim()) {
      return res.error(400, 'Destination name is required.');
    }

    try {
      const result = await db.query(
        'INSERT INTO destinations (name, city, state, country, description, status) VALUES (?, ?, ?, ?, ?, ?)',
        [name.trim(), (city || name).trim(), state.trim(), country.trim(), description.trim(), status]
      );

      await db.logSystemActivity(
        user.user_id,
        'DESTINATION_CREATE',
        `Admin '${user.name}' added new destination: '${name.trim()}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(201, {
        success: true,
        message: 'Destination created successfully.',
        destination_id: result.insertId
      });
    } catch (err) {
      console.error('[Create Destination Error]', err);
      res.error(500, 'Failed to create destination.');
    }
  });

  // PUT /api/admin/destinations/:id
  router.put('/api/admin/destinations/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!destinationGuard(req, res, user)) return;

    const destId = parseInt(req.params.id, 10);
    const { name, city, state = 'Tamil Nadu', country = 'India', description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.error(400, 'Destination name is required.');
    }

    try {
      await db.query(
        'UPDATE destinations SET name = ?, city = ?, state = ?, country = ?, description = ? WHERE destination_id = ?',
        [name.trim(), (city || name).trim(), state.trim(), country.trim(), description.trim(), destId]
      );

      await db.logSystemActivity(
        user.user_id,
        'DESTINATION_UPDATE',
        `Admin '${user.name}' updated destination '${name.trim()}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: 'Destination updated successfully.'
      });
    } catch (err) {
      console.error('[Update Destination Error]', err);
      res.error(500, 'Failed to update destination.');
    }
  });

  // PATCH /api/admin/destinations/:id/status
  router.patch('/api/admin/destinations/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!destinationGuard(req, res, user)) return;

    const destId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.error(400, "Status must be 'active' or 'inactive'.");
    }

    try {
      await db.query('UPDATE destinations SET status = ? WHERE destination_id = ?', [status, destId]);

      await db.logSystemActivity(
        user.user_id,
        'DESTINATION_STATUS_UPDATE',
        `Admin '${user.name}' updated destination #${destId} status to '${status}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: `Destination status changed to '${status}'.`,
        status
      });
    } catch (err) {
      console.error('[Update Destination Status Error]', err);
      res.error(500, 'Failed to update destination status.');
    }
  });

  // ========================================================
  // CATEGORY MANAGEMENT APIS (Permission: manage_categories)
  // ========================================================

  const categoryGuard = requirePermission('manage_categories');

  // GET /api/admin/categories
  router.get('/api/admin/categories', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!categoryGuard(req, res, user)) return;

    try {
      const { search = '', status = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT c.*, COUNT(p.package_id) AS total_packages
          FROM categories c
          LEFT JOIN tour_packages p ON c.category_id = p.category_id
          WHERE 1=1
        `;
        const params = [];
        if (status && status !== 'all') {
          sql += ' AND c.status = ?';
          params.push(status);
        }
        if (search) {
          sql += ' AND (c.category_name LIKE ? OR c.description LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term);
        }
        sql += ' GROUP BY c.category_id ORDER BY c.category_name ASC';
        const categories = await db.query(sql, params);
        return res.json(200, { success: true, categories });
      }

      // Memory store handler
      let list = [...db.memStore.categories];
      if (status && status !== 'all') {
        list = list.filter((c) => c.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((c) =>
          c.category_name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      }

      const categories = list.map((c) => {
        const pkgs = db.memStore.tour_packages.filter((p) => p.category_id === c.category_id);
        return {
          ...c,
          total_packages: pkgs.length
        };
      });

      res.json(200, { success: true, categories });
    } catch (err) {
      console.error('[Get Categories Error]', err);
      res.error(500, 'Failed to fetch categories.');
    }
  });

  // GET /api/admin/categories/:id
  router.get('/api/admin/categories/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!categoryGuard(req, res, user)) return;

    try {
      const catId = parseInt(req.params.id, 10);
      const rows = await db.query('SELECT * FROM categories WHERE category_id = ?', [catId]);
      if (rows.length === 0) {
        return res.error(404, 'Category not found.');
      }
      res.json(200, { success: true, category: rows[0] });
    } catch (err) {
      console.error('[Get Category Error]', err);
      res.error(500, 'Failed to fetch category details.');
    }
  });

  // POST /api/admin/categories
  router.post('/api/admin/categories', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!categoryGuard(req, res, user)) return;

    const { category_name, description = '', status = 'active' } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.error(400, 'Category name is required.');
    }

    try {
      const result = await db.query(
        'INSERT INTO categories (category_name, description, status) VALUES (?, ?, ?)',
        [category_name.trim(), description.trim(), status]
      );

      await db.logSystemActivity(
        user.user_id,
        'CATEGORY_CREATE',
        `Admin '${user.name}' added new package category: '${category_name.trim()}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(201, {
        success: true,
        message: 'Category created successfully.',
        category_id: result.insertId
      });
    } catch (err) {
      console.error('[Create Category Error]', err);
      res.error(500, 'Failed to create category.');
    }
  });

  // PUT /api/admin/categories/:id
  router.put('/api/admin/categories/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!categoryGuard(req, res, user)) return;

    const catId = parseInt(req.params.id, 10);
    const { category_name, description = '' } = req.body;
    if (!category_name || !category_name.trim()) {
      return res.error(400, 'Category name is required.');
    }

    try {
      await db.query(
        'UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?',
        [category_name.trim(), description.trim(), catId]
      );

      await db.logSystemActivity(
        user.user_id,
        'CATEGORY_UPDATE',
        `Admin '${user.name}' updated category '${category_name.trim()}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: 'Category updated successfully.'
      });
    } catch (err) {
      console.error('[Update Category Error]', err);
      res.error(500, 'Failed to update category.');
    }
  });

  // PATCH /api/admin/categories/:id/status
  router.patch('/api/admin/categories/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!categoryGuard(req, res, user)) return;

    const catId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.error(400, "Status must be 'active' or 'inactive'.");
    }

    try {
      await db.query('UPDATE categories SET status = ? WHERE category_id = ?', [status, catId]);

      await db.logSystemActivity(
        user.user_id,
        'CATEGORY_STATUS_UPDATE',
        `Admin '${user.name}' updated category #${catId} status to '${status}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: `Category status changed to '${status}'.`,
        status
      });
    } catch (err) {
      console.error('[Update Category Status Error]', err);
      res.error(500, 'Failed to update category status.');
    }
  });

  // ========================================================
  // PACKAGE MANAGEMENT & MODERATION (Permission: manage_packages)
  // ========================================================

  const packageGuard = requirePermission('manage_packages');

  // GET /api/admin/packages
  router.get('/api/admin/packages', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!packageGuard(req, res, user)) return;

    try {
      const { search = '', status = '', destination_id = '', category_id = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT p.*, d.name AS destination_name, c.category_name, u.name AS provider_name
          FROM tour_packages p
          JOIN destinations d ON p.destination_id = d.destination_id
          JOIN categories c ON p.category_id = c.category_id
          JOIN users u ON p.provider_id = u.user_id
          WHERE 1=1
        `;
        const params = [];
        if (status && status !== 'all') {
          sql += ' AND p.status = ?';
          params.push(status);
        }
        if (destination_id && destination_id !== 'all') {
          sql += ' AND p.destination_id = ?';
          params.push(parseInt(destination_id, 10));
        }
        if (category_id && category_id !== 'all') {
          sql += ' AND p.category_id = ?';
          params.push(parseInt(category_id, 10));
        }
        if (search) {
          sql += ' AND (p.title LIKE ? OR p.description LIKE ? OR d.name LIKE ? OR u.name LIKE ?)';
          const term = `%${search}%`;
          params.push(term, term, term, term);
        }
        sql += ' ORDER BY p.created_at DESC';
        const packages = await db.query(sql, params);
        return res.json(200, { success: true, packages });
      }

      // Memory store handler
      let list = [...db.memStore.tour_packages];
      if (status && status !== 'all') {
        list = list.filter((p) => p.status === status);
      }
      if (destination_id && destination_id !== 'all') {
        list = list.filter((p) => p.destination_id === parseInt(destination_id, 10));
      }
      if (category_id && category_id !== 'all') {
        list = list.filter((p) => p.category_id === parseInt(category_id, 10));
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) => {
          const dest = db.memStore.destinations.find((d) => d.destination_id === p.destination_id);
          const prov = db.memStore.users.find((u) => u.user_id === p.provider_id);
          return (
            p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (dest && dest.name.toLowerCase().includes(q)) ||
            (prov && prov.name.toLowerCase().includes(q))
          );
        });
      }

      const packages = list.map((p) => {
        const dest = db.memStore.destinations.find((d) => d.destination_id === p.destination_id) || {};
        const cat = db.memStore.categories.find((c) => c.category_id === p.category_id) || {};
        const prov = db.memStore.users.find((u) => u.user_id === p.provider_id) || {};
        return {
          ...p,
          destination_name: dest.name || '',
          category_name: cat.category_name || '',
          provider_name: prov.name || 'Unknown'
        };
      });

      res.json(200, { success: true, packages });
    } catch (err) {
      console.error('[Get Packages Error]', err);
      res.error(500, 'Failed to fetch packages.');
    }
  });

  // GET /api/admin/packages/:id
  router.get('/api/admin/packages/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!packageGuard(req, res, user)) return;

    try {
      const pkgId = parseInt(req.params.id, 10);
      const rows = await db.query('SELECT * FROM tour_packages WHERE package_id = ?', [pkgId]);
      if (rows.length === 0) {
        return res.error(404, 'Tour package not found.');
      }
      const pkg = rows[0];
      const itinerary = await db.query('SELECT * FROM package_itinerary WHERE package_id = ? ORDER BY day_no ASC', [pkgId]);
      const availability = await db.query('SELECT * FROM package_availability WHERE package_id = ? ORDER BY available_date ASC', [pkgId]);

      res.json(200, {
        success: true,
        package: pkg,
        itinerary,
        availability
      });
    } catch (err) {
      console.error('[Get Package Details Error]', err);
      res.error(500, 'Failed to fetch package details.');
    }
  });

  // PATCH /api/admin/packages/:id/status (Approve, Reject, Disable, Pending)
  router.patch('/api/admin/packages/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!packageGuard(req, res, user)) return;

    const pkgId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected', 'disabled'].includes(status)) {
      return res.error(400, "Invalid status. Allowed: 'approved', 'rejected', 'disabled', 'pending'.");
    }

    try {
      const existing = await db.query('SELECT package_id, title, status FROM tour_packages WHERE package_id = ?', [pkgId]);
      if (existing.length === 0) {
        return res.error(404, 'Package not found.');
      }

      await db.query('UPDATE tour_packages SET status = ? WHERE package_id = ?', [status, pkgId]);

      await db.logSystemActivity(
        user.user_id,
        'PACKAGE_MODERATION',
        `Admin '${user.name}' updated package '${existing[0].title}' moderation status to '${status}'.`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: `Package status updated to '${status}'.`,
        status
      });
    } catch (err) {
      console.error('[Moderate Package Error]', err);
      res.error(500, 'Failed to update package status.');
    }
  });

  // DELETE /api/admin/packages/:id
  router.delete('/api/admin/packages/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!packageGuard(req, res, user)) return;

    const pkgId = parseInt(req.params.id, 10);
    try {
      const existing = await db.query('SELECT package_id, title FROM tour_packages WHERE package_id = ?', [pkgId]);
      if (existing.length === 0) {
        return res.error(404, 'Package not found.');
      }

      await db.query('DELETE FROM tour_packages WHERE package_id = ?', [pkgId]);

      await db.logSystemActivity(
        user.user_id,
        'PACKAGE_DELETE',
        `Admin '${user.name}' removed package '${existing[0].title}' (ID #${pkgId}).`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: 'Package removed successfully.'
      });
    } catch (err) {
      console.error('[Delete Package Error]', err);
      res.error(500, 'Failed to delete package.');
    }
  });

  // ========================================================
  // BOOKINGS MANAGEMENT APIS (Permission: manage_bookings)
  // ========================================================

  const bookingGuard = requirePermission('manage_bookings');

  // GET /api/admin/bookings
  router.get('/api/admin/bookings', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!bookingGuard(req, res, user)) return;

    try {
      const { search = '', booking_status = '', payment_status = '' } = req.query;

      if (db.getIsConnected()) {
        let sql = `
          SELECT b.*, u.name AS customer_name, u.email AS customer_email, u.mobile AS customer_mobile,
                 p.title AS package_title, d.name AS destination_name
          FROM bookings b
          JOIN users u ON b.customer_id = u.user_id
          JOIN tour_packages p ON b.package_id = p.package_id
          JOIN destinations d ON p.destination_id = d.destination_id
          WHERE 1=1
        `;
        const params = [];
        if (booking_status && booking_status !== 'all') {
          sql += ' AND b.booking_status = ?';
          params.push(booking_status);
        }
        if (payment_status && payment_status !== 'all') {
          sql += ' AND b.payment_status = ?';
          params.push(payment_status);
        }
        if (search) {
          sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR p.title LIKE ? OR d.name LIKE ? OR b.booking_id = ?)';
          const term = `%${search}%`;
          params.push(term, term, term, term, parseInt(search, 10) || 0);
        }
        sql += ' ORDER BY b.booked_at DESC';
        const bookings = await db.query(sql, params);
        return res.json(200, { success: true, bookings });
      }

      // Memory store handler
      let list = [...db.memStore.bookings];
      if (booking_status && booking_status !== 'all') {
        list = list.filter((b) => b.booking_status === booking_status);
      }
      if (payment_status && payment_status !== 'all') {
        list = list.filter((b) => b.payment_status === payment_status);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((b) => {
          const cust = db.memStore.users.find((u) => u.user_id === b.customer_id);
          const pkg = db.memStore.tour_packages.find((p) => p.package_id === b.package_id);
          return (
            (cust && (cust.name.toLowerCase().includes(q) || cust.email.toLowerCase().includes(q))) ||
            (pkg && pkg.title.toLowerCase().includes(q)) ||
            String(b.booking_id).includes(q)
          );
        });
      }

      const bookings = list.map((b) => {
        const cust = db.memStore.users.find((u) => u.user_id === b.customer_id) || {};
        const pkg = db.memStore.tour_packages.find((p) => p.package_id === b.package_id) || {};
        const dest = db.memStore.destinations.find((d) => d.destination_id === pkg.destination_id) || {};
        return {
          ...b,
          customer_name: cust.name || 'Unknown',
          customer_email: cust.email || '',
          customer_mobile: cust.mobile || '',
          package_title: pkg.title || 'Unknown Package',
          destination_name: dest.name || ''
        };
      });

      res.json(200, { success: true, bookings });
    } catch (err) {
      console.error('[Get Bookings Error]', err);
      res.error(500, 'Failed to fetch bookings.');
    }
  });

  // GET /api/admin/bookings/:id
  router.get('/api/admin/bookings/:id', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!bookingGuard(req, res, user)) return;

    try {
      const bookingId = parseInt(req.params.id, 10);
      const rows = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
      if (rows.length === 0) {
        return res.error(404, 'Booking not found.');
      }
      res.json(200, { success: true, booking: rows[0] });
    } catch (err) {
      console.error('[Get Booking Details Error]', err);
      res.error(500, 'Failed to fetch booking details.');
    }
  });

  // PATCH /api/admin/bookings/:id/status
  router.patch('/api/admin/bookings/:id/status', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!bookingGuard(req, res, user)) return;

    const bookingId = parseInt(req.params.id, 10);
    const { booking_status, payment_status } = req.body;

    try {
      const existing = await db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
      if (existing.length === 0) {
        return res.error(404, 'Booking not found.');
      }

      const nextBookingStatus = booking_status || existing[0].booking_status;
      const nextPaymentStatus = payment_status || existing[0].payment_status;

      await db.query(
        'UPDATE bookings SET booking_status = ?, payment_status = ? WHERE booking_id = ?',
        [nextBookingStatus, nextPaymentStatus, bookingId]
      );

      await db.logSystemActivity(
        user.user_id,
        'BOOKING_STATUS_UPDATE',
        `Admin '${user.name}' updated Booking #BK-${String(bookingId).padStart(4, '0')} to [Booking: ${nextBookingStatus}, Payment: ${nextPaymentStatus}].`,
        req.socket.remoteAddress || '127.0.0.1'
      );

      res.json(200, {
        success: true,
        message: 'Booking status updated successfully.',
        booking_status: nextBookingStatus,
        payment_status: nextPaymentStatus
      });
    } catch (err) {
      console.error('[Update Booking Status Error]', err);
      res.error(500, 'Failed to update booking status.');
    }
  });
  // ─── REPORTS ────────────────────────────────────────────────────────────
  // GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&destination_id=N
  router.get('/api/admin/reports', async (req, res) => {
    const user = await authenticateRequest(req);
    if (!adminGuard(req, res, user)) return;
    const permGuard = requirePermission('view_reports');
    if (!permGuard(req, res, user)) return;

    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const destRaw = String(req.query.destination_id || '').trim();

    // ── validation ──
    const isRealDate = (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;

    if (from && !isRealDate(from)) return res.error(400, "Invalid 'from' date. Use YYYY-MM-DD.");
    if (to && !isRealDate(to)) return res.error(400, "Invalid 'to' date. Use YYYY-MM-DD.");
    if (from && to && from > to) return res.error(400, "'from' date cannot be later than 'to' date.");

    let destId = null;
    if (destRaw) {
      if (!/^\d+$/.test(destRaw) || parseInt(destRaw, 10) < 1) {
        return res.error(400, 'Invalid destination_id.');
      }
      destId = parseInt(destRaw, 10);
    }

    // ── shared filter fragments (bookings alias = b, packages alias = tp) ──
    const dateConds = [];
    const dateParams = [];
    if (from) { dateConds.push('b.booked_at >= ?'); dateParams.push(from + ' 00:00:00'); }
    if (to) { dateConds.push('b.booked_at < DATE_ADD(?, INTERVAL 1 DAY)'); dateParams.push(to + ' 00:00:00'); }
    const dateSql = dateConds.length ? ' AND ' + dateConds.join(' AND ') : '';

    // Inner-join queries (bookings that exist inside the filter)
    const bookingWhere = ' WHERE 1=1' + dateSql + (destId ? ' AND tp.destination_id = ?' : '');
    const bookingParams = destId ? [...dateParams, destId] : [...dateParams];
        // No MySQL connection: build the same report from the in-memory repository
    if (typeof db.getIsConnected === 'function' && !db.getIsConnected()) {
      return res.json(200, buildMemoryReport(db.memStore, { from, to, destId }));
    }
    
    try {
      // 1. Booking summary by status
      const bookingSummary = await db.query(
        `SELECT b.booking_status, COUNT(*) AS count,
                COALESCE(SUM(b.total_amount), 0) AS amount
         FROM bookings b
         JOIN tour_packages tp ON tp.package_id = b.package_id
         ${bookingWhere}
         GROUP BY b.booking_status`,
        bookingParams
      );

      // 2. Revenue totals
      const revenueTotals = await db.query(
        `SELECT
           COUNT(*) AS total_bookings,
           COALESCE(SUM(b.travelers), 0) AS total_travelers,
           COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS collected_revenue,
           COALESCE(SUM(CASE WHEN b.payment_status = 'unpaid' AND b.booking_status <> 'cancelled' THEN b.total_amount ELSE 0 END), 0) AS pending_revenue,
           COALESCE(SUM(CASE WHEN b.payment_status = 'refunded' THEN b.total_amount ELSE 0 END), 0) AS refunded_amount,
           COALESCE(SUM(CASE WHEN b.booking_status <> 'cancelled' THEN b.total_amount ELSE 0 END), 0) AS booked_value
         FROM bookings b
         JOIN tour_packages tp ON tp.package_id = b.package_id
         ${bookingWhere}`,
        bookingParams
      );

      // 3. Destination popularity (date filter lives in the JOIN so empty destinations still show)
      const destinationStats = await db.query(
        `SELECT d.destination_id, d.name AS destination_name,
                COUNT(DISTINCT tp.package_id) AS package_count,
                COUNT(DISTINCT CASE WHEN b.booking_status <> 'cancelled' THEN b.booking_id END) AS booking_count,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS revenue
         FROM destinations d
         LEFT JOIN tour_packages tp ON tp.destination_id = d.destination_id
         LEFT JOIN bookings b ON b.package_id = tp.package_id${dateSql}
         WHERE 1=1${destId ? ' AND d.destination_id = ?' : ''}
         GROUP BY d.destination_id, d.name
         ORDER BY booking_count DESC, revenue DESC`,
        destId ? [...dateParams, destId] : [...dateParams]
      );

      // 4. Top packages by collected revenue (only packages with bookings)
      const topPackages = await db.query(
        `SELECT tp.package_id, tp.title AS package_name,
                d.name AS destination_name,
                u.name AS provider_name,
                COUNT(DISTINCT CASE WHEN b.booking_status <> 'cancelled' THEN b.booking_id END) AS booking_count,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS revenue
         FROM tour_packages tp
         JOIN destinations d ON d.destination_id = tp.destination_id
         JOIN users u ON u.user_id = tp.provider_id
         LEFT JOIN bookings b ON b.package_id = tp.package_id${dateSql}
         WHERE 1=1${destId ? ' AND tp.destination_id = ?' : ''}
         GROUP BY tp.package_id, tp.title, d.name, u.name
         HAVING booking_count > 0
         ORDER BY revenue DESC, booking_count DESC
         LIMIT 10`,
        destId ? [...dateParams, destId] : [...dateParams]
      );

      // 5. Monthly trend (last 6 months by default, or the selected range)
      const trendDefault = (!from && !to)
        ? " AND b.booked_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)"
        : '';
      const monthlyRows = await db.query(
        `SELECT DATE_FORMAT(b.booked_at, '%Y-%m') AS month,
                COUNT(*) AS bookings,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS revenue
         FROM bookings b
         JOIN tour_packages tp ON tp.package_id = b.package_id
         ${bookingWhere}${trendDefault}
         GROUP BY DATE_FORMAT(b.booked_at, '%Y-%m')
         ORDER BY month DESC
         LIMIT 24`,
        bookingParams
      );

      // 6. Destinations for the filter dropdown
      const destinations = await db.query(
        'SELECT destination_id, name FROM destinations ORDER BY name'
      );

      const asArray = (v) => (Array.isArray(v) ? v : []);

      res.json(200, {
        success: true,
        filters: { from: from || null, to: to || null, destination_id: destId },
        bookingSummary: asArray(bookingSummary),
        revenueTotals: (Array.isArray(revenueTotals) ? revenueTotals[0] : revenueTotals) || {},
        destinationStats: asArray(destinationStats),
        topPackages: asArray(topPackages),
        monthlyTrend: asArray(monthlyRows).slice().reverse(), // oldest → newest
        destinations: asArray(destinations)
      });
    } catch (err) {
      console.error('[Reports Error]', err);
      res.error(500, 'Failed to generate reports.');
    }
  });
}

module.exports = registerAdminRoutes;
