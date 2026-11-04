-- ========================================================
-- YAATHIRAI — LOCAL TOURISM PACKAGE BOOKING SYSTEM
-- Complete Relational Database Schema & Demo Seed Data
-- ========================================================

CREATE DATABASE IF NOT EXISTS tourism_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tourism_db;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role ENUM('CUSTOMER', 'PROVIDER', 'ADMIN', 'SUPER_ADMIN') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial System Accounts
-- Passwords are stored in SHA-256 hash for 'admin123': 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
-- Plain 'admin123' also works due to backward-compatible fallback check in login router.
INSERT IGNORE INTO users (user_id, name, email, password, mobile, role, status) VALUES
  (1, 'Yaathirai Super Admin', 'superadmin@yaathirai.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9876543210', 'SUPER_ADMIN', 'ACTIVE'),
  (2, 'Belina Admin', 'admin@yaathirai.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9876543211', 'ADMIN', 'ACTIVE'),
  (3, 'Selvam Murugan', 'selvam@tntours.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9840123456', 'PROVIDER', 'ACTIVE'),
  (4, 'Meenakshi Sundaram', 'meenakshi@heritage.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9443123456', 'PROVIDER', 'PENDING'),
  (5, 'Kavitha Rajan', 'kavitha@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9962123456', 'CUSTOMER', 'ACTIVE'),
  (6, 'Arun Kumar', 'arun@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9884123456', 'CUSTOMER', 'ACTIVE');

-- 2. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS addresses (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address_line VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Tamil Nadu',
  pincode VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT IGNORE INTO addresses (address_id, user_id, address_line, city, state, pincode) VALUES
  (1, 5, '42 Anna Salai', 'Chennai', 'Tamil Nadu', '600002'),
  (2, 6, '18 West Car Street', 'Madurai', 'Tamil Nadu', '625001');

-- 3. DESTINATIONS TABLE
CREATE TABLE IF NOT EXISTS destinations (
  destination_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Tamil Nadu',
  country VARCHAR(100) DEFAULT 'India',
  description TEXT,
  image VARCHAR(255),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

INSERT IGNORE INTO destinations (destination_id, name, city, state, country, description, image, status) VALUES
  (1, 'Ooty', 'Ooty', 'Tamil Nadu', 'India', 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', 'images/ooty.jpg', 'ACTIVE'),
  (2, 'Kodaikanal', 'Kodaikanal', 'Tamil Nadu', 'India', 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', 'images/kodaikanal.jpg', 'ACTIVE'),
  (3, 'Kanyakumari', 'Kanyakumari', 'Tamil Nadu', 'India', 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', 'images/kanyakumari.jpg', 'ACTIVE'),
  (4, 'Madurai', 'Madurai', 'Tamil Nadu', 'India', 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', 'images/madurai.jpg', 'ACTIVE'),
  (5, 'Rameswaram', 'Rameswaram', 'Tamil Nadu', 'India', 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', 'images/rameswaram.jpg', 'ACTIVE'),
  (6, 'Mahabalipuram', 'Mahabalipuram', 'Tamil Nadu', 'India', 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', 'images/ooty.jpg', 'ACTIVE'),
  (7, 'Tiruchendur', 'Tiruchendur', 'Tamil Nadu', 'India', 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', 'images/rameswaram.jpg', 'ACTIVE'),
  (8, 'Velankanni', 'Velankanni', 'Tamil Nadu', 'India', 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', 'images/kanyakumari.jpg', 'ACTIVE'),
  (9, 'Chennai', 'Chennai', 'Tamil Nadu', 'India', 'City energy, coastal mornings, colourful streets, and little discoveries around every corner.', 'images/madurai.jpg', 'ACTIVE');

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

INSERT IGNORE INTO categories (category_id, category_name, description, status) VALUES
  (1, 'Hill Stations', 'Serene mountain retreats, pine trails, and misty morning viewpoints.', 'ACTIVE'),
  (2, 'Coastal & Beach', 'Ocean horizons, sunrise beaches, and gentle coastal breezes.', 'ACTIVE'),
  (3, 'Heritage & Culture', 'Ancient temples, stone carvings, and living historical traditions.', 'ACTIVE'),
  (4, 'Pilgrimage & Spiritual', 'Sacred sea corridors, coastal shrines, and peaceful sanctuaries.', 'ACTIVE'),
  (5, 'Nature', 'Lush botanical trails and wildlife sanctuaries.', 'ACTIVE'),
  (6, 'Food & Culture', 'Authentic culinary walks and heritage tasting sessions.', 'ACTIVE');

-- 5. TOUR PACKAGES TABLE
CREATE TABLE IF NOT EXISTS tour_packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  destination_id INT,
  category_id INT,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  duration_days INT DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  capacity INT DEFAULT 10,
  image VARCHAR(255),
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISABLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

INSERT IGNORE INTO tour_packages (package_id, provider_id, destination_id, category_id, title, description, duration_days, price, capacity, image, status, created_at) VALUES
  (1, 3, 1, 1, 'Misty Tea Trails', 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', 3, 6500.00, 12, 'images/ooty.jpg', 'APPROVED', '2026-10-23 10:00:00'),
  (2, 3, 2, 1, 'Pine and Lake Retreat', 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', 3, 7200.00, 10, 'images/kodaikanal.jpg', 'APPROVED', '2026-10-23 11:30:00'),
  (3, 3, 3, 2, 'Sunrise at Lands End', 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', 2, 4800.00, 15, 'images/kanyakumari.jpg', 'APPROVED', '2026-10-24 14:00:00'),
  (4, 3, 4, 3, 'Temple Town Trails', 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', 2, 4200.00, 20, 'images/madurai.jpg', 'APPROVED', '2026-10-24 15:45:00'),
  (5, 3, 5, 4, 'Sacred Sea Journey', 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', 3, 5800.00, 14, 'images/rameswaram.jpg', 'APPROVED', '2026-10-25 09:30:00'),
  (6, 4, 6, 3, 'Shore Temple Stories', 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', 2, 3900.00, 18, 'images/ooty.jpg', 'PENDING', '2026-10-26 12:00:00'),
  (7, 4, 7, 4, 'Coastal Temple Calm', 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', 2, 4100.00, 16, 'images/rameswaram.jpg', 'PENDING', '2026-10-27 10:20:00'),
  (8, 3, 8, 4, 'Seaside Basilica Break', 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', 2, 3500.00, 20, 'images/kanyakumari.jpg', 'APPROVED', '2026-10-25 16:00:00');

-- 6. PACKAGE ITINERARY TABLE
CREATE TABLE IF NOT EXISTS package_itinerary (
  itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  day_no INT NOT NULL,
  title VARCHAR(150),
  description TEXT,
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
);

INSERT IGNORE INTO package_itinerary (itinerary_id, package_id, day_no, title, description) VALUES
  (1, 1, 1, 'Arrival & Botanical Splendour', 'Check-in, botanical gardens, lake boating.'),
  (2, 1, 2, 'Tea Estate Trails', 'Guided tea factory tour and viewpoint picnic.'),
  (3, 1, 3, 'Doddabetta & Pykara', 'Panoramic summit visit and departure.'),
  (4, 2, 1, 'Lake Stroll & Coaker Walk', 'Leisure walk around the star-shaped lake and viewpoints.'),
  (5, 2, 2, 'Pine Forest & Pillar Rocks', 'Nature trail amidst pine canopies and dramatic rock formations.'),
  (6, 2, 3, 'Chettiar Park & Departure', 'Morning garden visit before departure.'),
  (7, 6, 1, 'Seaside Heritage Walk', 'Shore temple exploration and Pancha Rathas.'),
  (8, 6, 2, 'Coastal Sunrise & Crafts', 'Artisanal stone-sculpting demo and beach sunset.');

-- 7. PACKAGE AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS package_availability (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  available_date DATE NOT NULL,
  seats_available INT NOT NULL,
  status ENUM('AVAILABLE', 'FULL', 'CANCELLED') DEFAULT 'AVAILABLE',
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
);

INSERT IGNORE INTO package_availability (availability_id, package_id, available_date, seats_available, status) VALUES
  (1, 1, '2026-11-15', 8, 'AVAILABLE'),
  (2, 1, '2026-11-22', 10, 'AVAILABLE'),
  (3, 2, '2026-11-18', 6, 'AVAILABLE'),
  (4, 3, '2026-11-20', 12, 'AVAILABLE'),
  (5, 4, '2026-11-24', 15, 'AVAILABLE'),
  (6, 5, '2026-11-28', 10, 'AVAILABLE'),
  (7, 6, '2026-11-25', 18, 'AVAILABLE'),
  (8, 8, '2026-11-26', 15, 'AVAILABLE'),
  (9, 8, '2026-12-05', 20, 'AVAILABLE'),
  (10, 7, '2026-11-28', 12, 'AVAILABLE');

-- 8. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  package_id INT NOT NULL,
  availability_id INT,
  travelers INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  booking_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
  payment_status ENUM('UNPAID', 'PAID', 'REFUNDED') DEFAULT 'UNPAID',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE,
  FOREIGN KEY (availability_id) REFERENCES package_availability(availability_id) ON DELETE SET NULL
);

INSERT IGNORE INTO bookings (booking_id, customer_id, package_id, availability_id, travelers, total_amount, booking_status, payment_status, booked_at) VALUES
  (1, 5, 1, 1, 2, 13000.00, 'CONFIRMED', 'PAID', '2026-10-25 10:30:00'),
  (2, 6, 3, 4, 4, 19200.00, 'PENDING', 'UNPAID', '2026-10-27 14:15:00'),
  (3, 5, 2, 3, 2, 14400.00, 'CONFIRMED', 'PAID', '2026-10-28 09:00:00');

-- 9. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CARD_SIMULATED',
  payment_status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'SUCCESS',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT IGNORE INTO payments (payment_id, booking_id, customer_id, amount, payment_method, payment_status, paid_at) VALUES
  (1, 1, 5, 13000.00, 'UPI', 'SUCCESS', '2026-10-25 10:35:00'),
  (2, 3, 5, 14400.00, 'Net Banking', 'SUCCESS', '2026-10-28 09:05:00');

-- 10. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  customer_id INT NOT NULL,
  package_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
);

INSERT IGNORE INTO reviews (review_id, booking_id, customer_id, package_id, rating, comment, created_at) VALUES
  (1, 1, 5, 1, 5, 'The tea estate trail in Ooty was truly unforgettable. Our host was wonderful!', '2026-10-26 14:00:00');

-- 11. ADMIN PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS admin_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

INSERT IGNORE INTO admin_permissions (permission_id, admin_id, permission_name) VALUES
  (1, 2, 'manage_customers'),
  (2, 2, 'manage_providers'),
  (3, 2, 'manage_destinations'),
  (4, 2, 'manage_categories'),
  (5, 2, 'manage_packages'),
  (6, 2, 'manage_bookings'),
  (7, 2, 'view_reports');

-- 12. SYSTEM LOGS TABLE
CREATE TABLE IF NOT EXISTS system_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  description TEXT,
  ip_address VARCHAR(45) DEFAULT '127.0.0.1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

INSERT IGNORE INTO system_logs (log_id, user_id, action, description, ip_address, created_at) VALUES
  (1, 1, 'SYSTEM_INIT', 'Yaathirai platform initialized.', '127.0.0.1', '2026-10-20 10:00:00'),
  (2, 2, 'PACKAGE_APPROVAL', 'Admin approved tour package: Misty Tea Trails (Ooty).', '127.0.0.1', '2026-10-23 10:05:00'),
  (3, 3, 'PACKAGE_SUBMIT', 'Provider Selvam submitted package: Sacred Sea Journey.', '127.0.0.1', '2026-10-25 09:30:00'),
  (4, 5, 'BOOKING_CREATE', 'Customer Kavitha booked Misty Tea Trails (2 travelers).', '127.0.0.1', '2026-10-25 10:30:00');
