# Yaathirai - Local Tourism Package Booking System

Yaathirai is a lightweight, full-stack web application designed for booking local tourism packages across Tamil Nadu. Built with **native Node.js**, **Vanilla JavaScript**, **HTML/CSS**, and **MySQL**, it provides role-based interfaces for Customers, Service Providers, and System Administrators.

---

## 🛠️ Tech Stack & Constraints
* **Backend:** Native Node.js `http` module (No Express framework used)
* **Database:** MySQL relational database driver (`mysql2`)
* **Frontend:** Vanilla JavaScript (Fetch API, DOM manipulation), HTML5, CSS3
* **Environment Management:** `dotenv`

---

## 📁 Project Directory Structure

```text
Yaathirai/
├── config/
│   └── db.js                 <-- MySQL connection pool configuration
├── public/                   <-- Shared Public Frontend Pages
│   ├── index.html            <-- Landing page
│   ├── login.html            <-- Shared Authentication (Login)
│   ├── register.html         <-- Shared Authentication (Registration)
│   ├── destinations.html     <-- Public Destinations showcase
│   ├── packages.html         <-- Public Package catalog
│   ├── package-details.html  <-- Dynamic Package details & itinerary
│   ├── style.css             <-- Global stylesheet
│   ├── script.js             <-- Shared landing JS
│   └── customer/             <-- Customer Module (Subfolder)
│       ├── customer-dashboard.html <-- Customer main hub
│       ├── search-packages.html   <-- Dedicated package filter/search
│       ├── booking.html          <-- Checkout & payment simulation
│       ├── my-bookings.html      <-- Booking history, cancellation & reviews
│       └── profile.html          <-- Manage customer contact info
├── schema.sql                <-- Complete database DDL script (12 tables)
├── server.js                 <-- Core HTTP router & API endpoints
├── package.json              <-- NPM dependencies
└── README.md