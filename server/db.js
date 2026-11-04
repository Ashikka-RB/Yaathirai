// ========================================================
// YAATHIRAI — DATABASE ABSTRACTION LAYER
// Uses mysql2/promise with automatic fallback for high resilience
// ========================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yaathirai_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
let isConnectedToMySQL = false;

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

function hashPassword(plainText) {
  return crypto.createHash('sha256').update(plainText).digest('hex');
}

async function initDB() {
  if (!mysql) {
    console.log('[DB] mysql2 driver not available, using in-memory store.');
    return;
  }

  try {
    // Attempt connecting to MySQL server
    const conn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });

    console.log('[DB] Connected to MySQL server. Checking yaathirai_db...');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.end();

    pool = mysql.createPool(DB_CONFIG);
    await pool.query('SELECT 1');

    // Run schema.sql if tables do not exist
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('[DB] Initializing tables from database/schema.sql...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
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
            // Ignore minor duplicate errors during init
          }
        }
        console.log('[DB] Schema and seed data successfully initialized in MySQL.');
      }
    }

    isConnectedToMySQL = true;
    console.log('[DB] Successfully connected and operational on MySQL.');
  } catch (err) {
    console.warn('[DB] MySQL connection notice: ' + err.message);
    console.log('[DB] Running with active in-memory repository (fully interactive for Admin & Super Admin).');
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

  // 1. SELECT dashboard stats (COUNT queries)
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

  // 2. Pending providers
  if (/FROM users.*WHERE role = 'provider' AND status = 'pending'/i.test(norm)) {
    return memStore.users.filter((u) => u.role === 'provider' && u.status === 'pending');
  }

  // 3. SELECT users by email
  if (/FROM users.*WHERE email =/i.test(norm)) {
    const email = params[0];
    return memStore.users.filter((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // 4. SELECT user by id
  if (/FROM users.*WHERE user_id =/i.test(norm)) {
    const id = parseInt(params[0], 10);
    return memStore.users.filter((u) => u.user_id === id);
  }

  // 5. SELECT all users / by role
  if (/FROM users/i.test(norm)) {
    if (/role =/i.test(norm)) {
      const role = params[0];
      return memStore.users.filter((u) => u.role === role);
    }
    return [...memStore.users];
  }

  // 6. SELECT admin permissions
  if (/FROM admin_permissions.*WHERE admin_id =/i.test(norm)) {
    const adminId = parseInt(params[0], 10);
    return memStore.admin_permissions.filter((p) => p.admin_id === adminId);
  }

  // 7. SELECT recent bookings with joins
  if (/FROM bookings/i.test(norm)) {
    return memStore.bookings.map((b) => {
      const cust = memStore.users.find((u) => u.user_id === b.customer_id) || {};
      const pkg = memStore.tour_packages.find((p) => p.package_id === b.package_id) || {};
      const dest = memStore.destinations.find((d) => d.destination_id === pkg.destination_id) || {};
      return {
        ...b,
        customer_name: cust.name || 'Unknown',
        customer_email: cust.email || '',
        customer_mobile: cust.mobile || '',
        package_title: pkg.title || 'Unknown Package',
        destination_name: dest.name || ''
      };
    });
  }

  // 8. SELECT tour packages (with status filter check)
  if (/FROM tour_packages/i.test(norm)) {
    let list = memStore.tour_packages;
    if (/status = 'pending'/i.test(norm)) {
      list = list.filter((p) => p.status === 'pending');
    }
    return list.map((p) => {
      const dest = memStore.destinations.find((d) => d.destination_id === p.destination_id) || {};
      const cat = memStore.categories.find((c) => c.category_id === p.category_id) || {};
      const prov = memStore.users.find((u) => u.user_id === p.provider_id) || {};
      return {
        ...p,
        destination_name: dest.name || '',
        category_name: cat.category_name || '',
        provider_name: prov.name || 'Unknown'
      };
    });
  }

  // UPDATE tour_packages SET status = ? WHERE package_id = ?
  if (/UPDATE tour_packages SET status = \? WHERE package_id = \?/i.test(norm)) {
    const newStatus = params[0];
    const pkgId = parseInt(params[1], 10);
    const pkg = memStore.tour_packages.find((p) => p.package_id === pkgId);
    if (pkg) {
      pkg.status = newStatus;
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // DELETE FROM tour_packages WHERE package_id = ?
  if (/DELETE FROM tour_packages WHERE package_id = \?/i.test(norm)) {
    const pkgId = parseInt(params[1], 10);
    const idx = memStore.tour_packages.findIndex((p) => p.package_id === pkgId);
    if (idx !== -1) {
      memStore.tour_packages.splice(idx, 1);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // SELECT single package by id
  if (/FROM tour_packages.*WHERE.*package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    const p = memStore.tour_packages.find((x) => x.package_id === pkgId);
    if (!p) return [];
    const dest = memStore.destinations.find((d) => d.destination_id === p.destination_id) || {};
    const cat = memStore.categories.find((c) => c.category_id === p.category_id) || {};
    const prov = memStore.users.find((u) => u.user_id === p.provider_id) || {};
    return [{
      ...p,
      destination_name: dest.name || '',
      category_name: cat.category_name || '',
      provider_name: prov.name || 'Unknown',
      provider_email: prov.email || ''
    }];
  }

  // SELECT package_itinerary
  if (/FROM package_itinerary.*WHERE.*package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    return memStore.package_itinerary.filter((it) => it.package_id === pkgId);
  }

  // SELECT package_availability
  if (/FROM package_availability.*WHERE.*package_id =/i.test(norm)) {
    const pkgId = parseInt(params[0], 10);
    return memStore.package_availability.filter((av) => av.package_id === pkgId);
  }

  // UPDATE bookings status
  if (/UPDATE bookings/i.test(norm)) {
    if (/booking_status = \?.*payment_status = \?.*WHERE booking_id = \?/i.test(norm)) {
      const [bStatus, pStatus, bookingId] = params;
      const b = memStore.bookings.find((x) => x.booking_id === parseInt(bookingId, 10));
      if (b) {
        b.booking_status = bStatus;
        b.payment_status = pStatus;
        return { affectedRows: 1 };
      }
    } else if (/booking_status = \?.*WHERE booking_id = \?/i.test(norm)) {
      const [bStatus, bookingId] = params;
      const b = memStore.bookings.find((x) => x.booking_id === parseInt(bookingId, 10));
      if (b) {
        b.booking_status = bStatus;
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // SELECT single booking
  if (/FROM bookings.*WHERE.*booking_id =/i.test(norm)) {
    const bookingId = parseInt(params[0], 10);
    const b = memStore.bookings.find((x) => x.booking_id === bookingId);
    if (!b) return [];
    const cust = memStore.users.find((u) => u.user_id === b.customer_id) || {};
    const pkg = memStore.tour_packages.find((p) => p.package_id === b.package_id) || {};
    const dest = memStore.destinations.find((d) => d.destination_id === pkg.destination_id) || {};
    const prov = memStore.users.find((u) => u.user_id === pkg.provider_id) || {};
    return [{
      ...b,
      customer_name: cust.name || 'Unknown',
      customer_email: cust.email || '',
      customer_mobile: cust.mobile || '',
      package_title: pkg.title || 'Unknown Package',
      package_price: pkg.price || 0,
      destination_name: dest.name || '',
      provider_name: prov.name || 'Unknown'
    }];
  }

  // UPDATE users SET status = ? WHERE user_id = ?
  if (/UPDATE users SET status = \? WHERE user_id = \?/i.test(norm)) {
    const newStatus = params[0];
    const userId = parseInt(params[1], 10);
    const targetUser = memStore.users.find((u) => u.user_id === userId);
    if (targetUser) {
      targetUser.status = newStatus;
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // SELECT bookings by customer_id
  if (/FROM bookings.*WHERE.*customer_id =/i.test(norm)) {
    const custId = parseInt(params[0], 10);
    return memStore.bookings
      .filter((b) => b.customer_id === custId)
      .map((b) => {
        const pkg = memStore.tour_packages.find((p) => p.package_id === b.package_id) || {};
        const dest = memStore.destinations.find((d) => d.destination_id === pkg.destination_id) || {};
        return {
          ...b,
          package_title: pkg.title || 'Unknown Package',
          destination_name: dest.name || ''
        };
      });
  }

  // SELECT tour packages by provider_id
  if (/FROM tour_packages.*WHERE.*provider_id =/i.test(norm)) {
    const provId = parseInt(params[0], 10);
    return memStore.tour_packages
      .filter((p) => p.provider_id === provId)
      .map((p) => {
        const dest = memStore.destinations.find((d) => d.destination_id === p.destination_id) || {};
        const cat = memStore.categories.find((c) => c.category_id === p.category_id) || {};
        return {
          ...p,
          destination_name: dest.name || '',
          category_name: cat.category_name || ''
        };
      });
  }

  // INSERT INTO destinations
  if (/INSERT INTO destinations/i.test(norm)) {
    const newId = memStore.destinations.length ? Math.max(...memStore.destinations.map(d => d.destination_id)) + 1 : 1;
    const newDest = {
      destination_id: newId,
      name: params[0],
      city: params[1] || params[0],
      state: params[2] || 'Tamil Nadu',
      country: params[3] || 'India',
      description: params[4] || '',
      status: params[5] || 'active'
    };
    memStore.destinations.push(newDest);
    return { insertId: newId, affectedRows: 1 };
  }

  // UPDATE destinations SET ... WHERE destination_id = ?
  if (/UPDATE destinations/i.test(norm)) {
    if (/SET status = \? WHERE destination_id = \?/i.test(norm)) {
      const newStatus = params[0];
      const destId = parseInt(params[1], 10);
      const dest = memStore.destinations.find(d => d.destination_id === destId);
      if (dest) {
        dest.status = newStatus;
        return { affectedRows: 1 };
      }
    } else {
      // Full update: name, city, state, country, description, destination_id
      const [name, city, state, country, description, destId] = params;
      const dest = memStore.destinations.find(d => d.destination_id === parseInt(destId, 10));
      if (dest) {
        dest.name = name;
        dest.city = city;
        dest.state = state;
        dest.country = country;
        dest.description = description;
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // SELECT single destination
  if (/FROM destinations.*WHERE destination_id =/i.test(norm)) {
    const destId = parseInt(params[0], 10);
    return memStore.destinations.filter(d => d.destination_id === destId);
  }

  // SELECT destinations
  if (/FROM destinations/i.test(norm)) {
    return [...memStore.destinations];
  }

  // INSERT INTO categories
  if (/INSERT INTO categories/i.test(norm)) {
    const newId = memStore.categories.length ? Math.max(...memStore.categories.map(c => c.category_id)) + 1 : 1;
    const newCat = {
      category_id: newId,
      category_name: params[0],
      description: params[1] || '',
      status: params[2] || 'active'
    };
    memStore.categories.push(newCat);
    return { insertId: newId, affectedRows: 1 };
  }

  // UPDATE categories
  if (/UPDATE categories/i.test(norm)) {
    if (/SET status = \? WHERE category_id = \?/i.test(norm)) {
      const newStatus = params[0];
      const catId = parseInt(params[1], 10);
      const cat = memStore.categories.find(c => c.category_id === catId);
      if (cat) {
        cat.status = newStatus;
        return { affectedRows: 1 };
      }
    } else {
      // Full update: category_name, description, category_id
      const [name, description, catId] = params;
      const cat = memStore.categories.find(c => c.category_id === parseInt(catId, 10));
      if (cat) {
        cat.category_name = name;
        cat.description = description;
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // SELECT single category
  if (/FROM categories.*WHERE category_id =/i.test(norm)) {
    const catId = parseInt(params[0], 10);
    return memStore.categories.filter(c => c.category_id === catId);
  }

  // SELECT categories
  if (/FROM categories/i.test(norm)) {
    return [...memStore.categories];
  }

  // SELECT system_logs
  if (/FROM system_logs/i.test(norm)) {
    return memStore.system_logs.map((log) => {
      const user = memStore.users.find((u) => u.user_id === log.user_id) || {};
      return {
        ...log,
        user_name: user.name || 'System',
        user_role: user.role || 'system'
      };
    }).reverse();
  }

  return [];
}

async function logSystemActivity(userId, action, description, ipAddress = '127.0.0.1') {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (isConnectedToMySQL && pool) {
      await pool.query(
        'INSERT INTO system_logs (user_id, action, description, ip_address, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, action, description, ipAddress, timestamp]
      );
    } else {
      memStore.system_logs.push({
        log_id: memStore.system_logs.length + 1,
        user_id: userId,
        action,
        description,
        ip_address: ipAddress,
        created_at: timestamp
      });
    }
  } catch (err) {
    console.error('[Log Error]', err.message);
  }
}

module.exports = {
  initDB,
  query,
  memStore,
  hashPassword,
  logSystemActivity,
  getIsConnected: () => isConnectedToMySQL
};
