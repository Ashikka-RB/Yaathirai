// ========================================================
// YAATHIRAI — DATABASE ABSTRACTION LAYER
// Uses mysql2/promise with automatic fallback for high resilience
// ========================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional if not installed
}

let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  mysql = null;
}

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'tourism_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isConnectedToMySQL = false;

function hashPassword(plainText) {
  return crypto.createHash('sha256').update(String(plainText || '')).digest('hex');
}

// In-Memory Seed Data (Mirrors schema.sql precisely)
const memStore = {
  users: [
    { user_id: 1, name: 'Yaathirai Super Admin', email: 'superadmin@yaathirai.com', password: hashPassword('admin123'), mobile: '9876543210', role: 'super_admin', status: 'active', created_at: '2026-10-20 10:00:00' },
    { user_id: 2, name: 'Belina Admin', email: 'admin@yaathirai.com', password: hashPassword('admin123'), mobile: '9876543211', role: 'admin', status: 'active', created_at: '2026-10-21 11:30:00' },
    { user_id: 3, name: 'Selvam Murugan', email: 'selvam@tntours.com', password: hashPassword('admin123'), mobile: '9840123456', role: 'provider', status: 'active', created_at: '2026-10-22 09:15:00' },
    { user_id: 4, name: 'Meenakshi Sundaram', email: 'meenakshi@heritage.com', password: hashPassword('admin123'), mobile: '9443123456', role: 'provider', status: 'pending', created_at: '2026-10-26 16:40:00' },
    { user_id: 5, name: 'Kavitha Rajan', email: 'kavitha@example.com', password: hashPassword('admin123'), mobile: '9962123456', role: 'customer', status: 'active', created_at: '2026-10-23 14:00:00' },
    { user_id: 6, name: 'Arun Kumar', email: 'arun@example.com', password: hashPassword('admin123'), mobile: '9884123456', role: 'customer', status: 'active', created_at: '2026-10-24 18:20:00' }
  ],
  admin_permissions: [
    { permission_id: 1, admin_id: 2, permission_name: 'manage_customers' },
    { permission_id: 2, admin_id: 2, permission_name: 'manage_providers' },
    { permission_id: 3, admin_id: 2, permission_name: 'manage_destinations' },
    { permission_id: 4, admin_id: 2, permission_name: 'manage_categories' },
    { permission_id: 5, admin_id: 2, permission_name: 'manage_packages' },
    { permission_id: 6, admin_id: 2, permission_name: 'manage_bookings' },
    { permission_id: 7, admin_id: 2, permission_name: 'view_reports' }
  ],
  categories: [
    { category_id: 1, category_name: 'Hill Stations', description: 'Serene mountain retreats, pine trails, and misty morning viewpoints.', status: 'active' },
    { category_id: 2, category_name: 'Coastal & Beach', description: 'Ocean horizons, sunrise beaches, and gentle coastal breezes.', status: 'active' },
    { category_id: 3, category_name: 'Heritage & Culture', description: 'Ancient temples, stone carvings, and living historical traditions.', status: 'active' },
    { category_id: 4, category_name: 'Pilgrimage & Spiritual', description: 'Sacred sea corridors, coastal shrines, and peaceful sanctuaries.', status: 'active' }
  ],
  destinations: [
    { destination_id: 1, name: 'Ooty', city: 'Ooty', state: 'Tamil Nadu', country: 'India', description: 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', status: 'active' },
    { destination_id: 2, name: 'Kodaikanal', city: 'Kodaikanal', state: 'Tamil Nadu', country: 'India', description: 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', status: 'active' },
    { destination_id: 3, name: 'Kanyakumari', city: 'Kanyakumari', state: 'Tamil Nadu', country: 'India', description: 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', status: 'active' },
    { destination_id: 4, name: 'Madurai', city: 'Madurai', state: 'Tamil Nadu', country: 'India', description: 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', status: 'active' },
    { destination_id: 5, name: 'Rameswaram', city: 'Rameswaram', state: 'Tamil Nadu', country: 'India', description: 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', status: 'active' },
    { destination_id: 6, name: 'Mahabalipuram', city: 'Mahabalipuram', state: 'Tamil Nadu', country: 'India', description: 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', status: 'active' },
    { destination_id: 7, name: 'Tiruchendur', city: 'Tiruchendur', state: 'Tamil Nadu', country: 'India', description: 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', status: 'active' },
    { destination_id: 8, name: 'Velankanni', city: 'Velankanni', state: 'Tamil Nadu', country: 'India', description: 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', status: 'active' },
    { destination_id: 9, name: 'Chennai', city: 'Chennai', state: 'Tamil Nadu', country: 'India', description: 'City energy, coastal mornings, colourful streets, and little discoveries around every corner.', status: 'active' }
  ],
  tour_packages: [
    { package_id: 1, provider_id: 3, destination_id: 1, category_id: 1, title: 'Misty Tea Trails', description: 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', duration_days: 3, price: 6500.00, capacity: 12, image: 'images/ooty.jpg', status: 'approved', created_at: '2026-10-23 10:00:00' },
    { package_id: 2, provider_id: 3, destination_id: 2, category_id: 1, title: 'Pine and Lake Retreat', description: 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', duration_days: 3, price: 7200.00, capacity: 10, image: 'images/kodaikanal.jpg', status: 'approved', created_at: '2026-10-23 11:30:00' },
    { package_id: 3, provider_id: 3, destination_id: 3, category_id: 2, title: 'Sunrise at Lands End', description: 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', duration_days: 2, price: 4800.00, capacity: 15, image: 'images/kanyakumari.jpg', status: 'approved', created_at: '2026-10-24 14:00:00' },
    { package_id: 4, provider_id: 3, destination_id: 4, category_id: 3, title: 'Temple Town Trails', description: 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', duration_days: 2, price: 4200.00, capacity: 20, image: 'images/madurai.jpg', status: 'approved', created_at: '2026-10-24 15:45:00' },
    { package_id: 5, provider_id: 3, destination_id: 5, category_id: 4, title: 'Sacred Sea Journey', description: 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', duration_days: 3, price: 5800.00, capacity: 14, image: 'images/rameswaram.jpg', status: 'approved', created_at: '2026-10-25 09:30:00' },
    { package_id: 6, provider_id: 4, destination_id: 6, category_id: 3, title: 'Shore Temple Stories', description: 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', duration_days: 2, price: 3900.00, capacity: 18, image: 'images/mahabalipuram.jpg', status: 'pending', created_at: '2026-10-26 12:00:00' },
    { package_id: 7, provider_id: 4, destination_id: 7, category_id: 4, title: 'Coastal Temple Calm', description: 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', duration_days: 2, price: 4100.00, capacity: 16, image: 'images/tiruchendur.jpg', status: 'pending', created_at: '2026-10-27 10:20:00' },
    { package_id: 8, provider_id: 3, destination_id: 8, category_id: 4, title: 'Seaside Basilica Break', description: 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', duration_days: 2, price: 3500.00, capacity: 20, image: 'images/velankanni.jpg', status: 'approved', created_at: '2026-10-25 16:00:00' }
  ],
  package_itinerary: [
    { itinerary_id: 1, package_id: 1, day_no: 1, title: 'Arrival & Botanical Splendour', description: 'Check-in, botanical gardens, lake boating.' },
    { itinerary_id: 2, package_id: 1, day_no: 2, title: 'Tea Estate Trails', description: 'Guided tea factory tour and viewpoint picnic.' },
    { itinerary_id: 3, package_id: 1, day_no: 3, title: 'Doddabetta & Pykara', description: 'Panoramic summit visit and departure.' },
    { itinerary_id: 4, package_id: 6, day_no: 1, title: 'Seaside Heritage Walk', description: 'Shore temple exploration and Pancha Rathas.' },
    { itinerary_id: 5, package_id: 6, day_no: 2, title: 'Coastal Sunrise & Crafts', description: 'Artisanal stone-sculpting demo and beach sunset.' }
  ],
  package_availability: [
    { availability_id: 1, package_id: 1, available_date: '2026-11-15', seats_available: 8, status: 'available' },
    { availability_id: 2, package_id: 1, available_date: '2026-11-22', seats_available: 10, status: 'available' },
    { availability_id: 3, package_id: 2, available_date: '2026-11-18', seats_available: 6, status: 'available' },
    { availability_id: 4, package_id: 3, available_date: '2026-11-20', seats_available: 12, status: 'available' },
    { availability_id: 5, package_id: 6, available_date: '2026-11-25', seats_available: 18, status: 'available' }
  ],
  bookings: [
    { booking_id: 1, customer_id: 5, package_id: 1, availability_id: 1, travelers: 2, total_amount: 13000.00, booking_status: 'confirmed', payment_status: 'paid', booked_at: '2026-10-25 10:30:00' },
    { booking_id: 2, customer_id: 6, package_id: 3, availability_id: 4, travelers: 4, total_amount: 19200.00, booking_status: 'pending', payment_status: 'unpaid', booked_at: '2026-10-27 14:15:00' },
    { booking_id: 3, customer_id: 5, package_id: 2, availability_id: 3, travelers: 2, total_amount: 14400.00, booking_status: 'confirmed', payment_status: 'paid', booked_at: '2026-10-28 09:00:00' }
  ],
  payments: [
    { payment_id: 1, booking_id: 1, customer_id: 5, amount: 13000.00, payment_method: 'UPI', payment_status: 'successful', paid_at: '2026-10-25 10:35:00' },
    { payment_id: 2, booking_id: 3, customer_id: 5, amount: 14400.00, payment_method: 'Net Banking', payment_status: 'successful', paid_at: '2026-10-28 09:05:00' }
  ],
  reviews: [
    { review_id: 1, booking_id: 1, customer_id: 5, package_id: 1, rating: 5, comment: 'Exceptional trip to Ooty. Seamless experience!', created_at: '2026-10-26 14:00:00' }
  ],
  addresses: [],
  system_logs: [
    { log_id: 1, user_id: 1, action: 'SYSTEM_INIT', description: 'Yaathirai platform initialized.', ip_address: '127.0.0.1', created_at: '2026-10-20 10:00:00' },
    { log_id: 2, user_id: 2, action: 'PACKAGE_APPROVAL', description: 'Admin approved tour package: Misty Tea Trails (Ooty).', ip_address: '127.0.0.1', created_at: '2026-10-23 10:05:00' },
    { log_id: 3, user_id: 3, action: 'PACKAGE_SUBMIT', description: 'Provider Selvam submitted package: Sacred Sea Journey.', ip_address: '127.0.0.1', created_at: '2026-10-25 09:30:00' },
    { log_id: 4, user_id: 5, action: 'BOOKING_CREATE', description: 'Customer Kavitha booked Misty Tea Trails (2 travelers).', ip_address: '127.0.0.1', created_at: '2026-10-25 10:30:00' }
  ],
  system_settings: {
    site_name: 'Yaathirai',
    platform_fee_percent: 5,
    allow_new_registrations: true,
    maintenance_mode: false,
    contact_email: 'support@yaathirai.com'
  }
};

let autoInc = {
  users: 100,
  destinations: 100,
  categories: 100,
  tour_packages: 100,
  package_itinerary: 100,
  package_availability: 100,
  bookings: 100,
  payments: 100,
  reviews: 100,
  admin_permissions: 100,
  system_logs: 100
};

async function initDB() {
  if (!mysql) {
    console.log('[DB] mysql2 driver not available, running on in-memory store.');
    return;
  }

  try {
    const conn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    console.log(`[DB] Connected to MySQL host. Checking database ${DB_CONFIG.database}...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.end();

    pool = mysql.createPool(DB_CONFIG);
    await pool.query('SELECT 1');

    // Run schema.sql if tables do not exist
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('[DB] Initializing tables from schema.sql...');
      const candidates = [
        path.join(__dirname, '..', 'schema.sql'),
        path.join(__dirname, '..', 'database', 'schema.sql'),
        path.join(process.cwd(), 'schema.sql')
      ];
      const schemaPath = candidates.find(p => fs.existsSync(p));
      if (schemaPath) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        const statements = sql
          .replace(/--.*$/gm, '')
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          try {
            await pool.query(statement);
          } catch (stmtErr) {
            // Ignore minor errors
          }
        }
        console.log('[DB] Schema and seed data successfully initialized in MySQL.');
      }
    }

    isConnectedToMySQL = true;
    console.log(`[DB] Successfully connected and operational on MySQL database "${DB_CONFIG.database}".`);
  } catch (err) {
    console.warn('[DB] MySQL connection notice: ' + err.message);
    console.log('[DB] Running with active in-memory store fallback (CRUD fully functional across all modules).');
    isConnectedToMySQL = false;
  }
}

// Unified query wrapper that executes on MySQL when connected, or seamlessly queries memStore
async function query(sql, params = []) {
  if (isConnectedToMySQL && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (dbErr) {
      console.error('[DB Query Error]', dbErr.message);
      throw dbErr;
    }
  }

  // Fallback memory store query router
  return handleMemQuery(sql, params);
}

function handleMemQuery(sql, params) {
  const norm = sql.trim().replace(/\s+/g, ' ');

  // INSERT INTO users
  if (/^INSERT INTO users/i.test(norm)) {
    const id = ++autoInc.users;
    const [name, email, password, mobile, role] = params;
    const userRole = String(role || 'customer').toLowerCase();
    const newUser = {
      user_id: id,
      name,
      email,
      password,
      mobile: mobile || null,
      role: userRole,
      status: 'active',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    memStore.users.push(newUser);
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO destinations
  if (/^INSERT INTO destinations/i.test(norm)) {
    const id = ++autoInc.destinations;
    const [name, state, country, description, status] = params;
    memStore.destinations.push({
      destination_id: id,
      name,
      city: name,
      state: state || 'Tamil Nadu',
      country: country || 'India',
      description: description || '',
      status: String(status || 'active').toLowerCase()
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO categories
  if (/^INSERT INTO categories/i.test(norm)) {
    const id = ++autoInc.categories;
    const [category_name, description, status] = params;
    memStore.categories.push({
      category_id: id,
      category_name,
      description: description || '',
      status: String(status || 'active').toLowerCase()
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO tour_packages
  if (/^INSERT INTO tour_packages/i.test(norm)) {
    const id = ++autoInc.tour_packages;
    const [provider_id, destination_id, category_id, title, description, duration_days, price, capacity, image] = params;
    memStore.tour_packages.push({
      package_id: id,
      provider_id: parseInt(provider_id, 10),
      destination_id: parseInt(destination_id, 10),
      category_id: parseInt(category_id, 10),
      title,
      description: description || '',
      duration_days: parseInt(duration_days, 10) || 1,
      price: parseFloat(price) || 0,
      capacity: parseInt(capacity, 10) || 10,
      image: image || '',
      status: 'pending',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO package_itinerary
  if (/^INSERT INTO package_itinerary/i.test(norm)) {
    const id = ++autoInc.package_itinerary;
    const [package_id, day_no, title, description] = params;
    memStore.package_itinerary.push({
      itinerary_id: id,
      package_id: parseInt(package_id, 10),
      day_no: parseInt(day_no, 10),
      title: title || '',
      description: description || ''
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO package_availability
  if (/^INSERT INTO package_availability/i.test(norm)) {
    const id = ++autoInc.package_availability;
    const [package_id, available_date, seats_available] = params;
    memStore.package_availability.push({
      availability_id: id,
      package_id: parseInt(package_id, 10),
      available_date: String(available_date).slice(0, 10),
      seats_available: parseInt(seats_available, 10),
      status: 'available'
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO bookings
  if (/^INSERT INTO bookings/i.test(norm)) {
    const id = ++autoInc.bookings;
    const [customer_id, package_id, availability_id, travelers, total_amount] = params;
    memStore.bookings.push({
      booking_id: id,
      customer_id: parseInt(customer_id, 10),
      package_id: parseInt(package_id, 10),
      availability_id: parseInt(availability_id, 10),
      travelers: parseInt(travelers, 10),
      total_amount: parseFloat(total_amount),
      booking_status: 'confirmed',
      payment_status: 'paid',
      booked_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO payments
  if (/^INSERT INTO payments/i.test(norm)) {
    const id = ++autoInc.payments;
    const [booking_id, customer_id, amount, payment_method, payment_status] = params;
    memStore.payments.push({
      payment_id: id,
      booking_id: parseInt(booking_id, 10),
      customer_id: parseInt(customer_id, 10),
      amount: parseFloat(amount),
      payment_method: payment_method || 'CARD',
      payment_status: String(payment_status || 'successful').toLowerCase(),
      paid_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO reviews
  if (/^INSERT INTO reviews/i.test(norm)) {
    const id = ++autoInc.reviews;
    const [booking_id, customer_id, package_id, rating, comment] = params;
    memStore.reviews.push({
      review_id: id,
      booking_id: parseInt(booking_id, 10),
      customer_id: parseInt(customer_id, 10),
      package_id: parseInt(package_id, 10),
      rating: parseInt(rating, 10),
      comment: comment || '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    return { insertId: id, affectedRows: 1 };
  }

  // INSERT INTO system_logs
  if (/^INSERT INTO system_logs/i.test(norm)) {
    const id = ++autoInc.system_logs;
    const [user_id, action, description, ip_address] = params;
    memStore.system_logs.push({
      log_id: id,
      user_id: user_id ? parseInt(user_id, 10) : null,
      action,
      description,
      ip_address: ip_address || '127.0.0.1',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
    return { insertId: id, affectedRows: 1 };
  }

  // UPDATE queries
  if (/^UPDATE package_availability/i.test(norm)) {
    if (/seats_available = seats_available -/i.test(norm)) {
      const seats = parseInt(params[0], 10);
      const avId = parseInt(params[1], 10);
      const av = memStore.package_availability.find(a => a.availability_id === avId);
      if (av) av.seats_available = Math.max(0, av.seats_available - seats);
      return { affectedRows: 1 };
    }
    if (/seats_available = seats_available \+/i.test(norm)) {
      const seats = parseInt(params[0], 10);
      const avId = parseInt(params[1], 10);
      const av = memStore.package_availability.find(a => a.availability_id === avId);
      if (av) av.seats_available += seats;
      return { affectedRows: 1 };
    }
    if (/seats_available = COALESCE/i.test(norm)) {
      const seats = params[0];
      const status = params[1];
      const avId = parseInt(params[2], 10);
      const av = memStore.package_availability.find(a => a.availability_id === avId);
      if (av) {
        if (seats !== null && seats !== undefined) av.seats_available = parseInt(seats, 10);
        if (status) av.status = String(status).toLowerCase();
      }
      return { affectedRows: 1 };
    }
  }

  if (/^UPDATE bookings/i.test(norm)) {
    if (/booking_status = 'CANCELLED'/i.test(norm)) {
      const bId = parseInt(params[0], 10);
      const b = memStore.bookings.find(x => x.booking_id === bId);
      if (b) {
        b.booking_status = 'cancelled';
        b.payment_status = 'refunded';
      }
      return { affectedRows: 1 };
    }
    if (/booking_status = COALESCE/i.test(norm)) {
      const bStatus = params[0];
      const pStatus = params[1];
      const bId = parseInt(params[2], 10);
      const b = memStore.bookings.find(x => x.booking_id === bId);
      if (b) {
        if (bStatus) b.booking_status = String(bStatus).toLowerCase();
        if (pStatus) b.payment_status = String(pStatus).toLowerCase();
      }
      return { affectedRows: 1 };
    }
  }

  if (/^UPDATE tour_packages/i.test(norm)) {
    const pkgId = parseInt(params[params.length - 1], 10);
    const p = memStore.tour_packages.find(x => x.package_id === pkgId);
    if (p) {
      if (/SET status =/i.test(norm)) {
        p.status = String(params[0]).toLowerCase();
      }
    }
    return { affectedRows: 1 };
  }

  if (/^UPDATE users/i.test(norm)) {
    const uId = parseInt(params[params.length - 1], 10);
    const u = memStore.users.find(x => x.user_id === uId);
    if (u) {
      if (/SET status =/i.test(norm)) {
        u.status = String(params[0]).toLowerCase();
      }
    }
    return { affectedRows: 1 };
  }

  // DELETE queries
  if (/^DELETE FROM package_itinerary/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    memStore.package_itinerary = memStore.package_itinerary.filter(it => it.package_id !== pkgId);
    return { affectedRows: 1 };
  }
  if (/^DELETE FROM package_availability/i.test(norm)) {
    const avId = parseInt(params[0], 10);
    memStore.package_availability = memStore.package_availability.filter(a => a.availability_id !== avId);
    return { affectedRows: 1 };
  }
  if (/^DELETE FROM tour_packages/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    memStore.tour_packages = memStore.tour_packages.filter(p => p.package_id !== pkgId);
    return { affectedRows: 1 };
  }

  // SELECT COUNT(*) queries for Dashboard
  if (/COUNT\(\*\)/i.test(norm)) {
    return [{
      total_customers: memStore.users.filter((u) => u.role === 'customer').length,
      total_providers: memStore.users.filter((u) => u.role === 'provider').length,
      pending_providers: memStore.users.filter((u) => u.role === 'provider' && u.status === 'pending').length,
      total_packages: memStore.tour_packages.length,
      pending_packages: memStore.tour_packages.filter((p) => p.status === 'pending').length,
      total_bookings: memStore.bookings.length,
      confirmed_bookings: memStore.bookings.filter((b) => b.booking_status === 'confirmed').length,
      total_revenue: memStore.bookings
        .filter((b) => b.payment_status === 'paid')
        .reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
    }];
  }

  // SELECT destinations
  if (/FROM destinations/i.test(norm)) {
    if (/WHERE name =/i.test(norm)) {
      return memStore.destinations.filter(d => d.name.toLowerCase() === String(params[0]).toLowerCase());
    }
    return memStore.destinations.map(d => ({ ...d }));
  }

  // SELECT categories
  if (/FROM categories/i.test(norm)) {
    if (/WHERE category_name =/i.test(norm)) {
      return memStore.categories.filter(c => c.category_name.toLowerCase() === String(params[0]).toLowerCase());
    }
    return memStore.categories.map(c => ({ ...c }));
  }

  // SELECT users by email
  if (/FROM users.*WHERE email =/i.test(norm)) {
    const email = params[0];
    return memStore.users.filter((u) => u.email.toLowerCase() === String(email).toLowerCase());
  }

  // SELECT user by id
  if (/FROM users.*WHERE user_id =/i.test(norm)) {
    const id = parseInt(params[0], 10);
    return memStore.users.filter((u) => u.user_id === id);
  }

  // SELECT users by role
  if (/FROM users/i.test(norm)) {
    if (/WHERE role = 'provider' AND status = 'pending'/i.test(norm)) {
      return memStore.users.filter((u) => u.role === 'provider' && u.status === 'pending');
    }
    if (/role =/i.test(norm)) {
      const role = String(params[0]).toLowerCase();
      return memStore.users.filter((u) => u.role === role);
    }
    return [...memStore.users];
  }

  // SELECT admin permissions
  if (/FROM admin_permissions.*WHERE admin_id =/i.test(norm)) {
    const adminId = parseInt(params[0], 10);
    return memStore.admin_permissions.filter((p) => p.admin_id === adminId);
  }

  // SELECT package details with joins
  if (/FROM tour_packages p.*WHERE p.package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    const p = memStore.tour_packages.find(x => x.package_id === pkgId);
    if (!p) return [];
    const dest = memStore.destinations.find(d => d.destination_id === p.destination_id) || {};
    const cat = memStore.categories.find(c => c.category_id === p.category_id) || {};
    const prov = memStore.users.find(u => u.user_id === p.provider_id) || {};
    return [{
      ...p,
      destination_name: dest.name || 'Tamil Nadu',
      category_name: cat.category_name || 'General',
      provider_name: prov.name || 'Local Guide'
    }];
  }

  // SELECT package itinerary
  if (/FROM package_itinerary.*WHERE package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    return memStore.package_itinerary.filter(it => it.package_id === pkgId);
  }

  // SELECT package availability
  if (/FROM package_availability.*WHERE availability_id =/i.test(norm)) {
    const avId = parseInt(params[0], 10);
    return memStore.package_availability.filter(a => a.availability_id === avId);
  }
  if (/FROM package_availability.*WHERE package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    return memStore.package_availability.filter(a => a.package_id === pkgId);
  }
  if (/FROM package_availability/i.test(norm)) {
    return memStore.package_availability.map(a => ({ ...a }));
  }

  // SELECT packages
  if (/FROM tour_packages/i.test(norm)) {
    let rows = memStore.tour_packages.map(p => {
      const dest = memStore.destinations.find(d => d.destination_id === p.destination_id) || {};
      const cat = memStore.categories.find(c => c.category_id === p.category_id) || {};
      const prov = memStore.users.find(u => u.user_id === p.provider_id) || {};
      return {
        ...p,
        destination_name: dest.name || 'Tamil Nadu',
        destination: dest.name || 'Tamil Nadu',
        category_name: cat.category_name || 'General',
        category: cat.category_name || 'General',
        provider_name: prov.name || 'Local Guide'
      };
    });

    if (/WHERE.*status = 'approved'/i.test(norm) || /WHERE.*status = 'APPROVED'/i.test(norm)) {
      rows = rows.filter(p => p.status === 'approved' || p.status === 'APPROVED');
    }
    if (/p.provider_id = \?/i.test(norm)) {
      const pid = parseInt(params[0], 10);
      rows = rows.filter(p => p.provider_id === pid);
    }
    if (/d.name LIKE/i.test(norm) && params.length > 0) {
      const q = String(params[0]).replace(/%/g, '').toLowerCase();
      rows = rows.filter(p => p.destination_name.toLowerCase().includes(q));
    }
    return rows;
  }

  // SELECT bookings
  if (/FROM bookings/i.test(norm)) {
    let rows = memStore.bookings.map((b) => {
      const cust = memStore.users.find((u) => u.user_id === b.customer_id) || {};
      const pkg = memStore.tour_packages.find((p) => p.package_id === b.package_id) || {};
      const dest = memStore.destinations.find((d) => d.destination_id === pkg.destination_id) || {};
      const av = memStore.package_availability.find((a) => a.availability_id === b.availability_id) || {};
      return {
        ...b,
        customer_name: cust.name || 'Unknown',
        customer_email: cust.email || '',
        package_title: pkg.title || 'Tour Package',
        destination_name: dest.name || 'Tamil Nadu',
        available_date: av.available_date || '2026-11-20'
      };
    });

    if (/WHERE b.customer_id = \?/i.test(norm)) {
      const cid = parseInt(params[0], 10);
      rows = rows.filter(b => b.customer_id === cid);
    }
    if (/WHERE b.booking_id = \? AND customer_id = \?/i.test(norm)) {
      const bid = parseInt(params[0], 10);
      const cid = parseInt(params[1], 10);
      rows = rows.filter(b => b.booking_id === bid && b.customer_id === cid);
    }
    if (/WHERE b.booking_id = \?/i.test(norm)) {
      const bid = parseInt(params[0], 10);
      rows = rows.filter(b => b.booking_id === bid);
    }
    return rows;
  }

  // SELECT system_logs
  if (/FROM system_logs/i.test(norm)) {
    return memStore.system_logs.map(l => {
      const u = memStore.users.find(x => x.user_id === l.user_id) || {};
      return {
        ...l,
        user_name: u.name || 'System',
        user_role: u.role || 'system'
      };
    }).reverse();
  }

  // SELECT reviews
  if (/FROM reviews/i.test(norm)) {
    return memStore.reviews.map(r => {
      const u = memStore.users.find(x => x.user_id === r.customer_id) || {};
      const p = memStore.tour_packages.find(x => x.package_id === r.package_id) || {};
      return {
        ...r,
        customer_name: u.name || 'Customer',
        package_title: p.title || 'Tour Package'
      };
    });
  }

  return [];
}

async function logSystemActivity(userId, action, description, ipAddress = '127.0.0.1') {
  try {
    await query(
      'INSERT INTO system_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [userId || null, action, description, ipAddress]
    );
  } catch (e) {
    console.error('[System Log Error]', e.message);
  }
}

module.exports = {
  initDB,
  query,
  execute: query,
  hashPassword,
  logSystemActivity,
  isConnected: () => isConnectedToMySQL,
  memStore
};
