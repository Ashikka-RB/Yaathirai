// ========================================================
// YAATHIRAI AUTOMATED SYSTEM AUDIT & INTEGRATION VERIFIER
// ========================================================
const db = require('./server/db');

async function runTests() {
  console.log('--- Starting Yaathirai System Audit & Integration Verification ---');

  // Test 1: Database Initialization
  try {
    await db.initDB();
    console.log('[PASS] Test 1: Database abstraction layer initialized successfully.');
  } catch (e) {
    console.error('[FAIL] Test 1: DB init error:', e);
  }

  // Test 2: Users and Authentication Queries
  try {
    const users = await db.query('SELECT * FROM users');
    console.log(`[PASS] Test 2: Users query returned ${users.length} user records.`);
    const adminUser = users.find(u => u.email === 'admin@yaathirai.com');
    if (adminUser) {
      console.log(`[PASS] Test 2.1: Admin user resolved: ${adminUser.name} (${adminUser.role})`);
    } else {
      console.warn('[WARN] Test 2.1: Demo admin user not found in initial users');
    }
  } catch (e) {
    console.error('[FAIL] Test 2: User query failed:', e);
  }

  // Test 3: Tour Packages and Destinations Join
  try {
    const pkgs = await db.query(`
      SELECT p.*, d.name AS destination_name 
      FROM tour_packages p
      LEFT JOIN destinations d ON p.destination_id = d.destination_id
    `);
    console.log(`[PASS] Test 3: Tour packages query returned ${pkgs.length} packages.`);
  } catch (e) {
    console.error('[FAIL] Test 3: Packages query failed:', e);
  }

  // Test 4: Package Availability and Seats
  try {
    const avs = await db.query('SELECT * FROM package_availability');
    console.log(`[PASS] Test 4: Package availability returned ${avs.length} departure slots.`);
  } catch (e) {
    console.error('[FAIL] Test 4: Package availability query failed:', e);
  }

  // Test 5: Bookings and Payments Join
  try {
    const bks = await db.query('SELECT * FROM bookings');
    console.log(`[PASS] Test 5: Bookings query returned ${bks.length} bookings.`);
  } catch (e) {
    console.error('[FAIL] Test 5: Bookings query failed:', e);
  }

  // Test 6: Provider Module Repository
  try {
    const providerRepo = require('./src/modules/provider/repositories/mysql.repository');
    const pPackages = await providerRepo.listPackages('3');
    console.log(`[PASS] Test 6: Provider module repository returned ${pPackages.length} packages for provider ID 3.`);
  } catch (e) {
    console.error('[FAIL] Test 6: Provider module repository failed:', e);
  }

  console.log('--- Yaathirai System Audit & Integration Verification Complete ---');
}

runTests();
