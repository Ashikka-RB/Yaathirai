-- ========================================================
-- YAATHIRAI LOCAL TOURISM PACKAGE BOOKING SYSTEM
-- Database Schema & Initial Seed Data
-- ========================================================

CREATE DATABASE IF NOT EXISTS yaathirai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE yaathirai_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role ENUM('customer', 'provider', 'admin', 'super_admin') NOT NULL DEFAULT 'customer',
  status ENUM('active', 'pending', 'blocked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  address_line VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Destinations Table
CREATE TABLE IF NOT EXISTS destinations (
  destination_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  city VARCHAR(100),
  state VARCHAR(100) DEFAULT 'Tamil Nadu',
  country VARCHAR(100) DEFAULT 'India',
  description TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB;

-- 5. Tour Packages Table
CREATE TABLE IF NOT EXISTS tour_packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  destination_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_days INT NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  capacity INT NOT NULL DEFAULT 10,
  image VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected', 'disabled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(user_id),
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
) ENGINE=InnoDB;

-- 6. Package Itinerary Table
CREATE TABLE IF NOT EXISTS package_itinerary (
  itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  day_no INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Package Availability Table
CREATE TABLE IF NOT EXISTS package_availability (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  available_date DATE NOT NULL,
  seats_available INT NOT NULL DEFAULT 10,
  status ENUM('available', 'sold_out', 'cancelled') NOT NULL DEFAULT 'available',
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  package_id INT NOT NULL,
  availability_id INT NOT NULL,
  travelers INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id),
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id),
  FOREIGN KEY (availability_id) REFERENCES package_availability(availability_id)
) ENGINE=InnoDB;

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'UPI',
  payment_status ENUM('pending', 'successful', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (customer_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- 10. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  customer_id INT NOT NULL,
  package_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (customer_id) REFERENCES users(user_id),
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id)
) ENGINE=InnoDB;

-- 11. Admin Permissions Table
CREATE TABLE IF NOT EXISTS admin_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Users: Super Admin, Admin, Providers, Customers
-- (Passwords hashed with SHA-256 for standard demo authentication: 'admin123' -> '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')
INSERT INTO users (user_id, name, email, password, mobile, role, status) VALUES
(1, 'Yaathirai Super Admin', 'superadmin@yaathirai.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9876543210', 'super_admin', 'active'),
(2, 'Belina Admin', 'admin@yaathirai.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9876543211', 'admin', 'active'),
(3, 'Selvam Murugan', 'selvam@tntours.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9840123456', 'provider', 'active'),
(4, 'Meenakshi Sundaram', 'meenakshi@heritage.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9443123456', 'provider', 'pending'),
(5, 'Kavitha Rajan', 'kavitha@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9962123456', 'customer', 'active'),
(6, 'Arun Kumar', 'arun@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '9884123456', 'customer', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Admin Permissions for Admin user (ID 2)
INSERT INTO admin_permissions (admin_id, permission_name) VALUES
(2, 'manage_customers'),
(2, 'manage_providers'),
(2, 'manage_destinations'),
(2, 'manage_categories'),
(2, 'manage_packages'),
(2, 'manage_bookings'),
(2, 'view_reports')
ON DUPLICATE KEY UPDATE permission_name=VALUES(permission_name);

-- Categories
INSERT INTO categories (category_id, category_name, description, status) VALUES
(1, 'Hill Stations', 'Serene mountain retreats, pine trails, and misty morning viewpoints.', 'active'),
(2, 'Coastal & Beach', 'Ocean horizons, sunrise beaches, and gentle coastal breezes.', 'active'),
(3, 'Heritage & Culture', 'Ancient temples, stone carvings, and living historical traditions.', 'active'),
(4, 'Pilgrimage & Spiritual', 'Sacred sea corridors, coastal shrines, and peaceful sanctuaries.', 'active')
ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);

-- Destinations matching images in public/images/
INSERT INTO destinations (destination_id, name, city, state, country, description, status) VALUES
(1, 'Ooty', 'Ooty', 'Tamil Nadu', 'India', 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', 'active'),
(2, 'Kodaikanal', 'Kodaikanal', 'Tamil Nadu', 'India', 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', 'active'),
(3, 'Kanyakumari', 'Kanyakumari', 'Tamil Nadu', 'India', 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', 'active'),
(4, 'Madurai', 'Madurai', 'Tamil Nadu', 'India', 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', 'active'),
(5, 'Rameswaram', 'Rameswaram', 'Tamil Nadu', 'India', 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', 'active'),
(6, 'Mahabalipuram', 'Mahabalipuram', 'Tamil Nadu', 'India', 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', 'active'),
(7, 'Tiruchendur', 'Tiruchendur', 'Tamil Nadu', 'India', 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', 'active'),
(8, 'Velankanni', 'Velankanni', 'Tamil Nadu', 'India', 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', 'active'),
(9, 'Chennai', 'Chennai', 'Tamil Nadu', 'India', 'City energy, coastal mornings, colourful streets, and little discoveries around every corner.', 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Tour Packages
INSERT INTO tour_packages (package_id, provider_id, destination_id, category_id, title, description, duration_days, price, capacity, image, status) VALUES
(1, 3, 1, 1, 'Misty Tea Trails', 'Misty mountains, endless tea gardens, and mornings that make you want to stay a little longer.', 3, 6500.00, 12, 'images/ooty.jpg', 'approved'),
(2, 3, 2, 1, 'Pine and Lake Retreat', 'Winding pine trails, quiet lakes, and cool mountain air made for unhurried escapes.', 3, 7200.00, 10, 'images/kodaikanal.jpg', 'approved'),
(3, 3, 3, 2, 'Sunrise at Lands End', 'Colourful coastal skies, ocean horizons, and unforgettable sunrises at India southern tip.', 2, 4800.00, 15, 'images/kanyakumari.jpg', 'approved'),
(4, 3, 4, 3, 'Temple Town Trails', 'Ancient temple towers, lively streets, and food and traditions woven into everyday life.', 2, 4200.00, 20, 'images/madurai.jpg', 'approved'),
(5, 3, 5, 4, 'Sacred Sea Journey', 'Sacred corridors, blue coastal waters, and peaceful sea breezes at the edge of the mainland.', 3, 5800.00, 14, 'images/rameswaram.jpg', 'approved'),
(6, 4, 6, 3, 'Shore Temple Stories', 'Seaside heritage, remarkable stone carvings, and coastal sunsets along the Coromandel Coast.', 2, 3900.00, 18, 'images/mahabalipuram.jpg', 'pending'),
(7, 4, 7, 4, 'Coastal Temple Calm', 'A coastal pilgrimage town where temple traditions meet the sound of the waves.', 2, 4100.00, 16, 'images/tiruchendur.jpg', 'pending'),
(8, 3, 8, 4, 'Seaside Basilica Break', 'A seaside town known for its basilica, peaceful atmosphere, and refreshing coastal breeze.', 2, 3500.00, 20, 'images/velankanni.jpg', 'approved')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Package Itinerary for Package 1 (Ooty)
INSERT INTO package_itinerary (package_id, day_no, title, description) VALUES
(1, 1, 'Arrival & Botanical Splendour', 'Arrive in Ooty, check in at the heritage cottage, and take an evening stroll through Government Botanical Garden.'),
(1, 2, 'Tea Estate Exploration', 'Guided tour of lush tea plantations, factory visit, and tea tasting overlooking the Nilgiri hills.'),
(1, 3, 'Doddabetta Peak & Departure', 'Morning panorama at Doddabetta Peak, leisure craft boat ride at Pykara Lake, and departure.')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Package Availability
INSERT INTO package_availability (availability_id, package_id, available_date, seats_available, status) VALUES
(1, 1, '2026-11-15', 8, 'available'),
(2, 1, '2026-11-22', 10, 'available'),
(3, 2, '2026-11-18', 6, 'available'),
(4, 3, '2026-11-20', 12, 'available'),
(5, 4, '2026-11-16', 15, 'available'),
(6, 5, '2026-11-25', 10, 'available')
ON DUPLICATE KEY UPDATE seats_available=VALUES(seats_available);

-- Bookings
INSERT INTO bookings (booking_id, customer_id, package_id, availability_id, travelers, total_amount, booking_status, payment_status, booked_at) VALUES
(1, 5, 1, 1, 2, 13000.00, 'confirmed', 'paid', '2026-10-25 10:30:00'),
(2, 6, 3, 4, 4, 19200.00, 'pending', 'unpaid', '2026-10-27 14:15:00'),
(3, 5, 2, 3, 2, 14400.00, 'confirmed', 'paid', '2026-10-28 09:00:00')
ON DUPLICATE KEY UPDATE total_amount=VALUES(total_amount);

-- Payments
INSERT INTO payments (payment_id, booking_id, customer_id, amount, payment_method, payment_status, paid_at) VALUES
(1, 1, 5, 13000.00, 'UPI', 'successful', '2026-10-25 10:35:00'),
(2, 3, 5, 14400.00, 'Net Banking', 'successful', '2026-10-28 09:05:00')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- System Logs
INSERT INTO system_logs (log_id, user_id, action, description, ip_address) VALUES
(1, 1, 'SYSTEM_INIT', 'Yaathirai platform initialized with default configurations.', '127.0.0.1'),
(2, 2, 'PACKAGE_APPROVAL', 'Admin approved tour package: Misty Tea Trails (Ooty).', '127.0.0.1'),
(3, 3, 'PACKAGE_SUBMIT', 'Provider Selvam submitted package: Sacred Sea Journey.', '127.0.0.1'),
(4, 5, 'BOOKING_CREATE', 'Customer Kavitha booked Misty Tea Trails (2 travelers).', '127.0.0.1')
ON DUPLICATE KEY UPDATE action=VALUES(action);
