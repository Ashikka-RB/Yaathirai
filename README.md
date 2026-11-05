# Yaathirai - Local Tourism Package Booking System

Yaathirai is a comprehensive, full-stack web application designed for booking and managing authentic local tourism packages across Tamil Nadu. Built strictly with **native Node.js** (no heavy web frameworks like Express), **Vanilla JavaScript**, **HTML5/CSS3**, and **MySQL**, it provides dedicated, role-based workflows for Customers, Service Providers, Administrators, and Super Administrators.

---

## 🛠️ Architecture & Tech Stack

* **Backend:** Native Node.js `http` and `crypto` modules — custom routing, modular request handlers, token-based authentication (HMAC SHA-256 JWTs), cookie parsing, and static asset streaming.
* **Database Layer:** MySQL (`mysql2` connection pool) with dual-mode fallback (in-memory repository cache with relational simulation when MySQL is offline).
* **Frontend:** Vanilla JavaScript (ES6+, Fetch API, async/await, DOM manipulation), responsive HTML5, and modern custom CSS design system.
* **Security & Auth:** Secure cookie & Bearer token authorization, password hashing, role-based access control (RBAC), and moderation guards.

---

## 🌟 Key Features & Role Portals

### 1. Public & Customer Experience
* **Landing Page & Package Showcase:** Browse approved tour packages with dynamic pricing in INR (`₹ X,XXX / person`), duration, capacity, and curated images.
* **Destinations & Hidden Gems:** Discover destinations and unique local spots across Tamil Nadu.
* **Authentication:** Unified sign-in/registration with automated role-based dashboard redirection.
* **Customer Hub:**
  * Package discovery, filtering, and detailed itinerary view.
  * Departure date selection with real-time seat availability tracking.
  * Booking reservation and simulated payment workflow.
  * Customer profile management, booking history, cancellation, and reviews.

### 2. Provider Portal (`/provider/`)
* **Provider Dashboard:** Overview of listed packages, active bookings, guest capacity, and revenue stats.
* **Package Management:**
  * Create detailed tour packages (destination, category, duration, pricing, capacity, thumbnail upload/path).
  * Day-by-day itinerary builder and departure schedule manager.
  * Auto-submission into moderation queue with `pending` status.
* **Booking & Review Operations:** Track guest reservations and customer feedback.

### 3. Admin & Super Admin Management (`/admin/`)
* **Package Moderation Workflow:**
  * Review pending packages submitted by local tour providers.
  * Detailed inspection modal with day-wise itinerary, dates, and provider contacts.
  * Working **Approve** and **Reject** controls that update live database records.
  * Toggle **Disable** and **Enable** on live/approved packages.
* **Customer & Provider Directory:** View and manage registered users and service providers.
* **Destinations & Categories:** Add, edit, and organize destination locations and tour categories.
* **Bookings & Financial Reports:** View real booking logs, revenue numbers, and exportable reports.
* **Super Admin Capabilities:**
  * Admin team user management & granular permissions matrix (`manage_packages`, `manage_bookings`, `manage_users`, etc.).
  * Real database-backed system activity logs (logins, creations, moderations, cancellations).
  * Platform system settings.

---

## 📁 Project Directory Structure

```text
Yaathirai/
├── config/
│   └── db.js                 <-- MySQL pool configuration & credentials
├── database/
│   └── schema.sql            <-- Database DDL schema (users, packages, bookings, logs, etc.)
├── public/                   <-- Public Frontend Assets & Modules
│   ├── index.html            <-- Landing page with dynamic package showcase
│   ├── login.html            <-- Shared Authentication (Role-based redirect)
│   ├── register.html         <-- User / Provider registration
│   ├── destinations.html     <-- Destination showcase
│   ├── packages.html         <-- Public package catalog
│   ├── package-details.html  <-- Dynamic package dossier & itinerary
│   ├── css/                  <-- Modular stylesheet bundles
│   ├── js/                   <-- Client-side JavaScript helpers & APIs
│   │   ├── admin/            <-- Admin client logic (manage-packages, dashboard, etc.)
│   │   └── provider/         <-- Provider client logic (packages, bookings, api.js)
│   ├── customer/             <-- Customer Portal
│   │   ├── customer-dashboard.html
│   │   ├── search-packages.html
│   │   ├── booking.html
│   │   ├── my-bookings.html
│   │   └── profile.html
│   ├── provider/             <-- Service Provider Portal
│   │   ├── dashboard.html
│   │   ├── my-packages.html
│   │   ├── create-package.html
│   │   ├── edit-package.html
│   │   ├── availability.html
│   │   ├── bookings.html
│   │   ├── reviews.html
│   │   └── reports.html
│   └── admin/                <-- Admin & Super Admin Portal
│       ├── admin-dashboard.html
│       ├── superadmin-dashboard.html
│       ├── manage-packages.html
│       ├── manage-providers.html
│       ├── manage-customers.html
│       ├── manage-destinations.html
│       ├── manage-categories.html
│       ├── manage-bookings.html
│       ├── manage-admins.html
│       ├── permissions.html
│       ├── system-logs.html
│       ├── system-settings.html
│       └── reports.html
├── server/                   <-- Modular Backend Architecture
│   ├── db.js                 <-- DB abstraction layer & in-memory relational store
│   ├── auth.js               <-- JWT generation, verification, and cookie handler
│   └── routes/               <-- Route definitions
│       ├── auth-routes.js    <-- Authentication & session endpoints
│       ├── admin-routes.js   <-- Admin CRUD, moderation & package details endpoints
│       └── superadmin-routes.js <-- Super Admin management & system logs endpoints
├── server.js                 <-- Main HTTP server & public API routes
├── package.json              <-- NPM dependencies
└── README.md                 <-- Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16+ recommended)
* **MySQL Server** (Optional for local testing; application includes automatic in-memory fallback)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ashikka-RB/Yaathirai.git
   cd Yaathirai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Setup (MySQL):**
   * Import `database/schema.sql` into your MySQL instance:
     ```sql
     CREATE DATABASE tourism_db;
     USE tourism_db;
     SOURCE database/schema.sql;
     ```
   * Configure database credentials in `config/db.js` or via `.env` file:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=tourism_db
     PORT=3000
     ```

4. **Start the application:**
   ```bash
   node server.js
   ```
   The application will start on `http://localhost:3000`.

---

## 🔑 Default Accounts & Access

| Role | Email | Password | Portal URL |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@yaathirai.com` | `SuperAdmin@123` | `/admin/superadmin-dashboard.html` |
| **Admin** | `admin@yaathirai.com` | `Admin@123` | `/admin/admin-dashboard.html` |
| **Tour Provider**| `selvam@tntours.com` | `Provider@123` | `/provider/dashboard.html` |
| **Customer** | `ananya@example.com` | `Customer@123` | `/customer/customer-dashboard.html` |

---

## 📝 License

Developed for the Yaathirai Local Tourism initiative. All rights reserved.
