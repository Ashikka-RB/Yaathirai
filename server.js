const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./config/db'); // MySQL connection pool

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

// Helper function to read JSON request body in native Node.js
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

// Helper function to send JSON responses
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  let { url } = req;
  const { method } = req;

  // ==========================================
  // API ROUTING MODULE
  // ==========================================
  if (url.startsWith('/api/')) {

    // 1. REGISTER ENDPOINT: POST /api/register
    if (url === '/api/register' && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { name, email, password, mobile, role } = body;

        if (!name || !email || !password || !role) {
          return sendJSON(res, 400, { error: 'Missing required fields: name, email, password, role' });
        }

        const query = 'INSERT INTO users (name, email, password, mobile, role) VALUES (?, ?, ?, ?, ?)';
        const [result] = await db.execute(query, [name, email, password, mobile || null, role]);

        return sendJSON(res, 201, {
          message: 'User registered successfully',
          userId: result.insertId
        });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return sendJSON(res, 400, { error: 'Email address already exists' });
        }
        console.error('Registration Error:', err);
        return sendJSON(res, 500, { error: 'Server database error' });
      }
    }

    // 2. LOGIN ENDPOINT: POST /api/login
    if (url === '/api/login' && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return sendJSON(res, 400, { error: 'Email and password are required' });
        }

        const query = 'SELECT user_id, name, email, role, status FROM users WHERE email = ? AND password = ?';
        const [rows] = await db.execute(query, [email, password]);

        if (rows.length === 0) {
          return sendJSON(res, 401, { error: 'Invalid email or password' });
        }

        const user = rows[0];

        if (user.status === 'BLOCKED') {
          return sendJSON(res, 403, { error: 'Your account has been blocked by an Administrator.' });
        }

        return sendJSON(res, 200, {
          message: 'Login successful',
          user: {
            id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } catch (err) {
        console.error('Login Error:', err);
        return sendJSON(res, 500, { error: 'Server database error' });
      }
    }

    // 3. GET DESTINATIONS: GET /api/destinations
    if (url === '/api/destinations' && method === 'GET') {
      try {
        const [destinations] = await db.execute("SELECT * FROM destinations WHERE status = 'ACTIVE'");
        return sendJSON(res, 200, destinations);
      } catch (err) {
        console.error('Fetch Destinations Error:', err);
        return sendJSON(res, 500, { error: 'Database query error' });
      }
    }

    // 4. GET ALL PACKAGES: GET /api/packages
    if (url.startsWith('/api/packages') && !url.startsWith('/api/packages/detail') && method === 'GET') {
      try {
        const parsedUrl = new URL(url, `http://${req.headers.host}`);
        const destination = parsedUrl.searchParams.get('destination');

        let query = `
          SELECT p.*, d.name AS destination_name, c.category_name 
          FROM tour_packages p
          LEFT JOIN destinations d ON p.destination_id = d.destination_id
          LEFT JOIN categories c ON p.category_id = c.category_id
          WHERE p.status = 'APPROVED'
        `;
        const params = [];

        if (destination) {
          query += ' AND d.name LIKE ?';
          params.push(`%${destination}%`);
        }

        const [packages] = await db.execute(query, params);
        return sendJSON(res, 200, packages);
      } catch (err) {
        console.error('Fetch Packages Error:', err);
        return sendJSON(res, 500, { error: 'Database query error' });
      }
    }

    // 5. GET PACKAGE DETAILS: GET /api/packages/detail?id=X
    if (url.startsWith('/api/packages/detail') && method === 'GET') {
      try {
        const parsedUrl = new URL(url, `http://${req.headers.host}`);
        const packageId = parsedUrl.searchParams.get('id');

        if (!packageId) {
          return sendJSON(res, 400, { error: 'Package ID parameter is required' });
        }

        const [packages] = await db.execute(
          `SELECT p.*, d.name AS destination_name, u.name AS provider_name 
           FROM tour_packages p
           LEFT JOIN destinations d ON p.destination_id = d.destination_id
           LEFT JOIN users u ON p.provider_id = u.user_id
           WHERE p.package_id = ?`,
          [packageId]
        );

        if (packages.length === 0) {
          return sendJSON(res, 404, { error: 'Package not found' });
        }

        const [itinerary] = await db.execute(
          'SELECT * FROM package_itinerary WHERE package_id = ? ORDER BY day_no ASC',
          [packageId]
        );

        const [availability] = await db.execute(
          "SELECT * FROM package_availability WHERE package_id = ? AND status = 'AVAILABLE' AND seats_available > 0",
          [packageId]
        );

        return sendJSON(res, 200, {
          package: packages[0],
          itinerary,
          availability
        });
      } catch (err) {
        console.error('Fetch Details Error:', err);
        return sendJSON(res, 500, { error: 'Database query error' });
      }
    }

    // 6. CREATE BOOKING: POST /api/bookings
    if (url === '/api/bookings' && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { customerId, packageId, availabilityId, travelers, totalAmount } = body;

        if (!customerId || !packageId || !availabilityId || !travelers) {
          return sendJSON(res, 400, { error: 'Missing required booking details' });
        }

        const bookingQuery = `
          INSERT INTO bookings (customer_id, package_id, availability_id, travelers, total_amount, booking_status, payment_status)
          VALUES (?, ?, ?, ?, ?, 'CONFIRMED', 'PAID')
        `;
        const [bookingResult] = await db.execute(bookingQuery, [customerId, packageId, availabilityId, travelers, totalAmount]);
        const bookingId = bookingResult.insertId;

        await db.execute(
          'INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)',
          [bookingId, customerId, totalAmount, 'CARD_SIMULATED', 'SUCCESS']
        );

        await db.execute(
          'UPDATE package_availability SET seats_available = seats_available - ? WHERE availability_id = ?',
          [travelers, availabilityId]
        );

        return sendJSON(res, 201, { message: 'Booking confirmed successfully', bookingId });
      } catch (err) {
        console.error('Booking Error:', err);
        return sendJSON(res, 500, { error: 'Database transaction error' });
      }
    }

    // 7. GET CUSTOMER BOOKINGS: GET /api/my-bookings?customerId=X
    if (url.startsWith('/api/my-bookings') && method === 'GET') {
      try {
        const parsedUrl = new URL(url, `http://${req.headers.host}`);
        const customerId = parsedUrl.searchParams.get('customerId');

        if (!customerId) {
          return sendJSON(res, 400, { error: 'Customer ID is required' });
        }

        const [bookings] = await db.execute(`
          SELECT b.*, p.title AS package_title, pa.available_date
          FROM bookings b
          JOIN tour_packages p ON b.package_id = p.package_id
          JOIN package_availability pa ON b.availability_id = pa.availability_id
          WHERE b.customer_id = ?
          ORDER BY b.booked_at DESC
        `, [customerId]);

        return sendJSON(res, 200, bookings);
      } catch (err) {
        console.error('Fetch My Bookings Error:', err);
        return sendJSON(res, 500, { error: 'Database query error' });
      }
    }

    // 8. CANCEL BOOKING: PUT /api/bookings/cancel
    if (url === '/api/bookings/cancel' && method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        const { bookingId, customerId } = body;

        if (!bookingId || !customerId) {
          return sendJSON(res, 400, { error: 'Booking ID and Customer ID are required' });
        }

        const [bookings] = await db.execute(
          'SELECT * FROM bookings WHERE booking_id = ? AND customer_id = ?',
          [bookingId, customerId]
        );

        if (bookings.length === 0) {
          return sendJSON(res, 404, { error: 'Booking not found' });
        }

        const booking = bookings[0];
        if (booking.booking_status === 'CANCELLED') {
          return sendJSON(res, 400, { error: 'Booking is already cancelled' });
        }

        await db.execute(
          "UPDATE bookings SET booking_status = 'CANCELLED', payment_status = 'REFUNDED' WHERE booking_id = ?",
          [bookingId]
        );

        await db.execute(
          'UPDATE package_availability SET seats_available = seats_available + ? WHERE availability_id = ?',
          [booking.travelers, booking.availability_id]
        );

        return sendJSON(res, 200, { message: 'Booking cancelled and seats restored successfully' });
      } catch (err) {
        console.error('Cancel Booking Error:', err);
        return sendJSON(res, 500, { error: 'Database update error' });
      }
    }

    // 9. ADD PACKAGE REVIEW: POST /api/reviews
    if (url === '/api/reviews' && method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const { bookingId, customerId, packageId, rating, comment } = body;

        if (!bookingId || !customerId || !packageId || !rating) {
          return sendJSON(res, 400, { error: 'Missing review details' });
        }

        const query = 'INSERT INTO reviews (booking_id, customer_id, package_id, rating, comment) VALUES (?, ?, ?, ?, ?)';
        await db.execute(query, [bookingId, customerId, packageId, rating, comment || '']);

        return sendJSON(res, 201, { message: 'Review submitted successfully' });
      } catch (err) {
        console.error('Submit Review Error:', err);
        return sendJSON(res, 500, { error: 'Database error' });
      }
    }

    return sendJSON(res, 404, { error: 'API route not found' });
  }

  // ==========================================
  // STATIC FILE ROUTING MODULE
  // ==========================================

  // Only rewrite URLs for pages inside public/customer/
  const customerSubfolderPages = [
    '/booking.html',
    '/my-bookings.html',
    '/customer-dashboard.html',
    '/search-packages.html',
    '/profile.html'
  ];

  if (customerSubfolderPages.some(page => url.startsWith(page))) {
    url = '/customer' + url;
  }

  let filePath = path.join(PUBLIC_DIR, url === '/' ? 'index.html' : url);
  let ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Page Not Found</h1>');
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});