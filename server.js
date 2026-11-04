// ========================================================
// YAATHIRAI — LOCAL TOURISM PACKAGE BOOKING SYSTEM
// Main Application Server (Node.js Native HTTP)
// ========================================================

const http = require('http');
const path = require('path');
require('dotenv').config();

const db = require('./server/db');
const Router = require('./server/router');
const { generateToken, verifyToken } = require('./server/auth');
const { signToken } = require('./config/auth-token');
const { handleProviderRequest } = require('./src/modules/provider');

const registerAuthRoutes = require('./server/routes/auth-routes');
const registerAdminRoutes = require('./server/routes/admin-routes');
const registerSuperAdminRoutes = require('./server/routes/superadmin-routes');

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

const router = new Router(PUBLIC_DIR);

// ========================================================
// AUTHENTICATION PROVIDER RESOLVER
// ========================================================
async function authenticateProvider(req) {
  let token = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/yaathirai_token=([^;]+)/);
    if (match) token = match[1].trim();
  }

  if (!token) return null;

  // Try standard token verification
  const claims = verifyToken(token);
  if (!claims || !claims.user_id) return null;

  const rows = await db.query(
    'SELECT user_id, name, email, role, status FROM users WHERE user_id = ?',
    [claims.user_id]
  );
  if (!rows || rows.length === 0) return null;
  const u = rows[0];

  const roleUpper = String(u.role || '').toUpperCase();
  const statusLower = String(u.status || '').toLowerCase();

  return {
    id: String(u.user_id),
    name: u.name,
    email: u.email,
    role: roleUpper,
    status: statusLower === 'active' ? 'approved' : statusLower
  };
}

// ========================================================
// PUBLIC & CUSTOMER API ENDPOINTS
// ========================================================

// 1. POST /api/register
router.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, mobile, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.error(400, 'Missing required fields: name, email, password, role');
    }

    const roleNormalized = String(role).toUpperCase();
    if (!['CUSTOMER', 'PROVIDER'].includes(roleNormalized)) {
      return res.error(400, 'Invalid account type. Only Customer or Provider accounts can be registered.');
    }

    // Check email uniqueness
    const existing = await db.query('SELECT user_id FROM users WHERE email = ?', [email.trim()]);
    if (existing && existing.length > 0) {
      return res.error(400, 'An account with this email address already exists.');
    }

    const hashedPassword = db.hashPassword(password);
    const result = await db.query(
      'INSERT INTO users (name, email, password, mobile, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashedPassword, mobile || null, roleNormalized]
    );

    return res.json(201, {
      success: true,
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error('[Registration Error]', err);
    return res.error(500, 'Server database error during registration.');
  }
});

// 2. POST /api/login
router.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.error(400, 'Email and password are required');
    }

    const rows = await db.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
    if (!rows || rows.length === 0) {
      return res.error(401, 'Invalid email or password');
    }

    const user = rows[0];
    const inputHash = db.hashPassword(password);

    if (user.password !== inputHash && user.password !== password) {
      return res.error(401, 'Invalid email or password');
    }

    const statusNorm = String(user.status || '').toUpperCase();
    if (statusNorm === 'BLOCKED') {
      return res.error(403, 'Your account has been blocked by an Administrator.');
    }
    if (statusNorm === 'PENDING') {
      return res.error(403, 'Your provider account is currently pending administrator review.');
    }

    const token = generateToken(user);
    const legacyToken = signToken({ id: user.user_id, role: String(user.role).toUpperCase() });

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': `yaathirai_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    });

    return res.end(JSON.stringify({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: String(user.role).toUpperCase(),
        token
      }
    }));
  } catch (err) {
    console.error('[Login Error]', err);
    return res.error(500, 'Server database error during login.');
  }
});

// 3. GET /api/destinations
router.get('/api/destinations', async (req, res) => {
  try {
    const destinations = await db.query("SELECT * FROM destinations WHERE status = 'ACTIVE' OR status = 'active'");
    return res.json(200, destinations);
  } catch (err) {
    console.error('[Destinations Error]', err);
    return res.error(500, 'Database query error');
  }
});

// 4. GET /api/packages
router.get('/api/packages', async (req, res) => {
  try {
    const destination = req.query.destination;
    let query = `
      SELECT p.*, d.name AS destination_name, c.category_name 
      FROM tour_packages p
      LEFT JOIN destinations d ON p.destination_id = d.destination_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE (p.status = 'APPROVED' OR p.status = 'approved')
    `;
    const params = [];

    if (destination) {
      query += ' AND d.name LIKE ?';
      params.push(`%${destination}%`);
    }

    const packages = await db.query(query, params);
    return res.json(200, packages);
  } catch (err) {
    console.error('[Packages Error]', err);
    return res.error(500, 'Database query error');
  }
});

// 5. GET /api/packages/detail
router.get('/api/packages/detail', async (req, res) => {
  try {
    const packageId = req.query.id;
    if (!packageId) {
      return res.error(400, 'Package ID parameter is required');
    }

    const packages = await db.query(`
      SELECT p.*, d.name AS destination_name, u.name AS provider_name 
      FROM tour_packages p
      LEFT JOIN destinations d ON p.destination_id = d.destination_id
      LEFT JOIN users u ON p.provider_id = u.user_id
      WHERE p.package_id = ?
    `, [packageId]);

    if (!packages || packages.length === 0) {
      return res.error(404, 'Package not found');
    }

    const itinerary = await db.query(
      'SELECT * FROM package_itinerary WHERE package_id = ? ORDER BY day_no ASC',
      [packageId]
    );

    const availability = await db.query(`
      SELECT * FROM package_availability 
      WHERE package_id = ? AND (status = 'AVAILABLE' OR status = 'available') AND seats_available > 0
      ORDER BY available_date ASC
    `, [packageId]);

    return res.json(200, {
      package: packages[0],
      itinerary,
      availability
    });
  } catch (err) {
    console.error('[Package Details Error]', err);
    return res.error(500, 'Database query error');
  }
});

// 6. POST /api/bookings
router.post('/api/bookings', async (req, res) => {
  try {
    const { customerId, packageId, availabilityId, travelers, totalAmount } = req.body;
    if (!customerId || !packageId || !availabilityId || !travelers) {
      return res.error(400, 'Missing required booking details');
    }

    // Verify availability & seat count
    const avRows = await db.query(
      'SELECT seats_available FROM package_availability WHERE availability_id = ?',
      [availabilityId]
    );
    if (!avRows || avRows.length === 0) {
      return res.error(400, 'Selected date availability was not found.');
    }
    if (avRows[0].seats_available < travelers) {
      return res.error(400, `Only ${avRows[0].seats_available} seats remaining for this departure.`);
    }

    // Create booking
    const bookingResult = await db.query(`
      INSERT INTO bookings (customer_id, package_id, availability_id, travelers, total_amount, booking_status, payment_status)
      VALUES (?, ?, ?, ?, ?, 'CONFIRMED', 'PAID')
    `, [customerId, packageId, availabilityId, travelers, totalAmount]);

    const bookingId = bookingResult.insertId;

    // Record payment
    await db.query(
      'INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
      [bookingId, customerId, totalAmount, 'CARD_SIMULATED', 'SUCCESS']
    );

    // Decrement available seats
    await db.query(
      'UPDATE package_availability SET seats_available = seats_available - ? WHERE availability_id = ?',
      [travelers, availabilityId]
    );

    await db.logSystemActivity(
      customerId,
      'BOOKING_CREATE',
      `Customer booked ${travelers} seat(s) for package #${packageId}. Booking #${bookingId}.`
    );

    return res.json(201, {
      success: true,
      message: 'Booking confirmed successfully',
      bookingId
    });
  } catch (err) {
    console.error('[Booking Error]', err);
    return res.error(500, 'Database error during booking creation.');
  }
});

// 7. GET /api/my-bookings
router.get('/api/my-bookings', async (req, res) => {
  try {
    const customerId = req.query.customerId;
    if (!customerId) {
      return res.error(400, 'Customer ID is required');
    }

    const bookings = await db.query(`
      SELECT b.*, p.title AS package_title, pa.available_date
      FROM bookings b
      JOIN tour_packages p ON b.package_id = p.package_id
      LEFT JOIN package_availability pa ON b.availability_id = pa.availability_id
      WHERE b.customer_id = ?
      ORDER BY b.booked_at DESC
    `, [customerId]);

    return res.json(200, bookings);
  } catch (err) {
    console.error('[My Bookings Error]', err);
    return res.error(500, 'Database query error');
  }
});

// 8. PUT /api/bookings/cancel
router.put('/api/bookings/cancel', async (req, res) => {
  try {
    const { bookingId, customerId } = req.body;
    if (!bookingId || !customerId) {
      return res.error(400, 'Booking ID and Customer ID are required');
    }

    const bookings = await db.query(
      'SELECT * FROM bookings WHERE booking_id = ? AND customer_id = ?',
      [bookingId, customerId]
    );

    if (!bookings || bookings.length === 0) {
      return res.error(404, 'Booking not found');
    }

    const booking = bookings[0];
    if (String(booking.booking_status).toUpperCase() === 'CANCELLED') {
      return res.error(400, 'Booking is already cancelled');
    }

    await db.query(
      "UPDATE bookings SET booking_status = 'CANCELLED', payment_status = 'REFUNDED' WHERE booking_id = ?",
      [bookingId]
    );

    await db.query(
      'UPDATE package_availability SET seats_available = seats_available + ? WHERE availability_id = ?',
      [booking.travelers, booking.availability_id]
    );

    await db.logSystemActivity(
      customerId,
      'BOOKING_CANCEL',
      `Booking #${bookingId} was cancelled by customer. ${booking.travelers} seat(s) restored.`
    );

    return res.json(200, {
      success: true,
      message: 'Booking cancelled and seats restored successfully'
    });
  } catch (err) {
    console.error('[Cancel Booking Error]', err);
    return res.error(500, 'Database update error');
  }
});

// 9. POST /api/reviews
router.post('/api/reviews', async (req, res) => {
  try {
    const { bookingId, customerId, packageId, rating, comment } = req.body;
    if (!bookingId || !customerId || !packageId || !rating) {
      return res.error(400, 'Missing review details');
    }

    await db.query(
      'INSERT INTO reviews (booking_id, customer_id, package_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [bookingId, customerId, packageId, rating, comment || '']
    );

    return res.json(201, {
      success: true,
      message: 'Review submitted successfully'
    });
  } catch (err) {
    console.error('[Review Error]', err);
    return res.error(500, 'Database error');
  }
});

// 10. GET /api/customer/profile & PUT /api/customer/profile
router.get('/api/customer/profile', async (req, res) => {
  const customerId = req.query.id;
  if (!customerId) return res.error(400, 'Customer ID required');

  const rows = await db.query('SELECT user_id, name, email, mobile FROM users WHERE user_id = ?', [customerId]);
  if (!rows || rows.length === 0) return res.error(404, 'User not found');
  const user = rows[0];

  const addr = await db.query('SELECT address_line, city, state, pincode FROM addresses WHERE user_id = ?', [customerId]);
  res.json(200, {
    success: true,
    user: {
      ...user,
      address_line: addr && addr.length > 0 ? addr[0].address_line : '',
      city: addr && addr.length > 0 ? addr[0].city : ''
    }
  });
});

router.put('/api/customer/profile', async (req, res) => {
  const { customerId, name, mobile, address_line, city } = req.body;
  if (!customerId) return res.error(400, 'Customer ID required');

  await db.query('UPDATE users SET name = COALESCE(?, name), mobile = COALESCE(?, mobile) WHERE user_id = ?', [name || null, mobile || null, customerId]);
  
  const existingAddr = await db.query('SELECT address_id FROM addresses WHERE user_id = ?', [customerId]);
  if (existingAddr && existingAddr.length > 0) {
    await db.query('UPDATE addresses SET address_line = ?, city = ? WHERE user_id = ?', [address_line || '', city || '', customerId]);
  } else if (address_line || city) {
    await db.query('INSERT INTO addresses (user_id, address_line, city, state, pincode) VALUES (?, ?, ?, "Tamil Nadu", "")', [customerId, address_line || '', city || '']);
  }

  res.json(200, { success: true, message: 'Profile updated successfully' });
});

// Register Modular Route Handlers
registerAuthRoutes(router);
registerAdminRoutes(router);
registerSuperAdminRoutes(router);

// Native HTTP Server with Subfolder Rewrite & Provider Module Integration
const server = http.createServer(async (req, res) => {
  try {
    let { url } = req;

    // Provider REST API interception
    if (url.startsWith('/api/provider')) {
      const handled = await handleProviderRequest(req, res, { resolveUser: authenticateProvider });
      if (handled) return;
    }

    // Rewrite customer root-level references to /customer/ subfolder
    const customerPages = [
      '/booking.html',
      '/my-bookings.html',
      '/customer-dashboard.html',
      '/search-packages.html',
      '/profile.html'
    ];
    if (customerPages.some(page => url === page || url.startsWith(page + '?'))) {
      req.url = '/customer' + url;
    }

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
  console.log('==================================================');
  console.log('   YAATHIRAI — Local Tourism Package Booking System');
  console.log('==================================================');

  await db.initDB();

  server.listen(PORT, () => {
    console.log(`[Server] Yaathirai server running on http://localhost:${PORT}`);
    console.log(`[Public] Landing Page:     http://localhost:${PORT}/index.html`);
    console.log(`[Login]  Authentication:   http://localhost:${PORT}/login.html`);
    console.log(`[Admin]  Admin Dashboard:  http://localhost:${PORT}/admin/admin-dashboard.html`);
    console.log(`[Provider] Provider Hub:   http://localhost:${PORT}/provider/dashboard.html`);
    console.log(`[Customer] Customer Hub:   http://localhost:${PORT}/customer/customer-dashboard.html`);
    console.log('==================================================');
  });
}

start();

module.exports = server;
