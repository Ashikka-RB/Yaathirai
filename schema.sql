CREATE DATABASE IF NOT EXISTS tourism_db;
USE tourism_db;

CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  role ENUM('CUSTOMER', 'PROVIDER', 'ADMIN', 'SUPER_ADMIN') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Local demo accounts for the Quick Demo Login buttons; do not use in production.
INSERT IGNORE INTO users (name, email, password, role, status) VALUES
  ('Demo Admin', 'admin@yaathirai.com', 'admin123', 'ADMIN', 'ACTIVE'),
  ('Demo Super Admin', 'superadmin@yaathirai.com', 'admin123', 'SUPER_ADMIN', 'ACTIVE'),
  ('Demo Provider', 'selvam@tntours.com', 'admin123', 'PROVIDER', 'ACTIVE'),
  ('Demo Customer', 'kavitha@example.com', 'admin123', 'CUSTOMER', 'ACTIVE');

CREATE TABLE IF NOT EXISTS addresses (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  address_line VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS destinations (
  destination_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  description TEXT,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS tour_packages (
  package_id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT,
  destination_id INT,
  category_id INT,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  duration_days INT,
  price DECIMAL(10,2),
  capacity INT,
  image VARCHAR(255),
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISABLED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(user_id),
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id),
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE IF NOT EXISTS package_itinerary (
  itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT,
  day_no INT,
  title VARCHAR(150),
  description TEXT,
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS package_availability (
  availability_id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT,
  available_date DATE,
  seats_available INT,
  status ENUM('AVAILABLE', 'FULL', 'CANCELLED') DEFAULT 'AVAILABLE',
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  package_id INT,
  availability_id INT,
  travelers INT NOT NULL,
  total_amount DECIMAL(10,2),
  booking_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
  payment_status ENUM('UNPAID', 'PAID', 'REFUNDED') DEFAULT 'UNPAID',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(user_id),
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id),
  FOREIGN KEY (availability_id) REFERENCES package_availability(availability_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  customer_id INT,
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'SUCCESS',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (customer_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT,
  customer_id INT,
  package_id INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (customer_id) REFERENCES users(user_id),
  FOREIGN KEY (package_id) REFERENCES tour_packages(package_id)
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  permission_name VARCHAR(100),
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);