'use strict';
// MySQL repository with automatic fallback to memory store for Provider module
const db = require('../../../../server/db');
const memRepo = require('./memory.repository');
const { HttpError } = require('../errors');

function isMySQL() {
  return db.isConnected && db.isConnected();
}

module.exports = {
  async getUser(id) {
    if (isMySQL()) {
      try {
        const rows = await db.query(
          'SELECT user_id, name, email, role, status FROM users WHERE user_id = ?',
          [id]
        );
        if (!rows || rows.length === 0) return null;
        const u = rows[0];
        return {
          id: String(u.user_id),
          name: u.name,
          email: u.email,
          role: u.role ? u.role.toUpperCase() : 'PROVIDER',
          status: String(u.status || '').toLowerCase() === 'active' ? 'approved' : String(u.status || '').toLowerCase()
        };
      } catch (e) {
        console.error('[MySQL Provider getUser Error]', e.message);
      }
    }
    return memRepo.getUser(id);
  },

  async listPackages(providerId) {
    if (isMySQL()) {
      try {
        const rows = await db.query(`
          SELECT p.*, d.name AS destination, c.category_name AS category
          FROM tour_packages p
          LEFT JOIN destinations d ON p.destination_id = d.destination_id
          LEFT JOIN categories c ON p.category_id = c.category_id
          WHERE p.provider_id = ?
          ORDER BY p.created_at DESC
        `, [providerId]);

        return rows.map(r => ({
          id: String(r.package_id),
          providerId: String(r.provider_id),
          destination: r.destination || '',
          category: r.category || '',
          title: r.title,
          description: r.description || '',
          durationDays: r.duration_days,
          price: parseFloat(r.price) || 0,
          capacity: r.capacity,
          image: r.image || '',
          status: String(r.status || '').toLowerCase(),
          createdAt: r.created_at
        }));
      } catch (e) {
        console.error('[MySQL Provider listPackages Error]', e.message);
      }
    }
    return memRepo.listPackages(providerId);
  },

  async getPackage(id) {
    if (isMySQL()) {
      try {
        const rows = await db.query(`
          SELECT p.*, d.name AS destination, c.category_name AS category
          FROM tour_packages p
          LEFT JOIN destinations d ON p.destination_id = d.destination_id
          LEFT JOIN categories c ON p.category_id = c.category_id
          WHERE p.package_id = ?
        `, [id]);
        if (!rows || rows.length === 0) return null;
        const r = rows[0];

        const itineraryRows = await db.query(
          'SELECT day_no, title, description FROM package_itinerary WHERE package_id = ? ORDER BY day_no ASC',
          [id]
        );

        return {
          id: String(r.package_id),
          providerId: String(r.provider_id),
          destination: r.destination || '',
          category: r.category || '',
          title: r.title,
          description: r.description || '',
          durationDays: r.duration_days,
          price: parseFloat(r.price) || 0,
          capacity: r.capacity,
          image: r.image || '',
          status: String(r.status || '').toLowerCase(),
          createdAt: r.created_at,
          itinerary: itineraryRows.map(it => ({ title: it.title || '', description: it.description || '' })),
          inclusions: ['Local guide', 'Sightseeing transport'],
          exclusions: ['Personal expenses']
        };
      } catch (e) {
        console.error('[MySQL Provider getPackage Error]', e.message);
      }
    }
    return memRepo.getPackage(id);
  },

  async insertPackage(data) {
    if (isMySQL()) {
      try {
        // Resolve destination_id
        let destId = null;
        const destRows = await db.query('SELECT destination_id FROM destinations WHERE name = ? LIMIT 1', [data.destination]);
        if (destRows && destRows.length > 0) {
          destId = destRows[0].destination_id;
        } else {
          const newDest = await db.query('INSERT INTO destinations (name, state, country, description, status) VALUES (?, "Tamil Nadu", "India", ?, "ACTIVE")', [data.destination, data.destination]);
          destId = newDest.insertId;
        }

        // Resolve category_id
        let catId = null;
        const catRows = await db.query('SELECT category_id FROM categories WHERE category_name = ? LIMIT 1', [data.category]);
        if (catRows && catRows.length > 0) {
          catId = catRows[0].category_id;
        } else {
          const newCat = await db.query('INSERT INTO categories (category_name, description, status) VALUES (?, ?, "ACTIVE")', [data.category, data.category]);
          catId = newCat.insertId;
        }

        const res = await db.query(`
          INSERT INTO tour_packages (provider_id, destination_id, category_id, title, description, duration_days, price, capacity, image, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [data.providerId, destId, catId, data.title, data.description, data.durationDays, data.price, data.capacity, data.image || '']);

        const pkgId = res.insertId;

        // Insert itinerary items
        if (Array.isArray(data.itinerary)) {
          for (let i = 0; i < data.itinerary.length; i++) {
            const it = data.itinerary[i];
            await db.query(
              'INSERT INTO package_itinerary (package_id, day_no, title, description) VALUES (?, ?, ?, ?)',
              [pkgId, i + 1, it.title || `Day ${i + 1}`, it.description || '']
            );
          }
        }

        return this.getPackage(pkgId);
      } catch (e) {
        console.error('[MySQL Provider insertPackage Error]', e.message);
      }
    }
    return memRepo.insertPackage(data);
  },

  async updatePackage(id, patch) {
    if (isMySQL()) {
      try {
        // Resolve destination & category if provided
        let destId = null;
        if (patch.destination) {
          const destRows = await db.query('SELECT destination_id FROM destinations WHERE name = ? LIMIT 1', [patch.destination]);
          if (destRows && destRows.length > 0) destId = destRows[0].destination_id;
        }
        let catId = null;
        if (patch.category) {
          const catRows = await db.query('SELECT category_id FROM categories WHERE category_name = ? LIMIT 1', [patch.category]);
          if (catRows && catRows.length > 0) catId = catRows[0].category_id;
        }

        await db.query(`
          UPDATE tour_packages
          SET title = COALESCE(?, title),
              description = COALESCE(?, description),
              destination_id = COALESCE(?, destination_id),
              category_id = COALESCE(?, category_id),
              duration_days = COALESCE(?, duration_days),
              price = COALESCE(?, price),
              capacity = COALESCE(?, capacity),
              image = COALESCE(?, image)
          WHERE package_id = ?
        `, [
          patch.title || null,
          patch.description || null,
          destId,
          catId,
          patch.durationDays || null,
          patch.price || null,
          patch.capacity || null,
          patch.image || null,
          id
        ]);

        if (Array.isArray(patch.itinerary)) {
          await db.query('DELETE FROM package_itinerary WHERE package_id = ?', [id]);
          for (let i = 0; i < patch.itinerary.length; i++) {
            const it = patch.itinerary[i];
            await db.query(
              'INSERT INTO package_itinerary (package_id, day_no, title, description) VALUES (?, ?, ?, ?)',
              [id, i + 1, it.title || `Day ${i + 1}`, it.description || '']
            );
          }
        }

        return this.getPackage(id);
      } catch (e) {
        console.error('[MySQL Provider updatePackage Error]', e.message);
      }
    }
    return memRepo.updatePackage(id, patch);
  },

  async deletePackage(id) {
    if (isMySQL()) {
      try {
        await db.query('DELETE FROM tour_packages WHERE package_id = ?', [id]);
        return;
      } catch (e) {
        console.error('[MySQL Provider deletePackage Error]', e.message);
      }
    }
    return memRepo.deletePackage(id);
  },

  async listAvailability(packageId) {
    if (isMySQL()) {
      try {
        const rows = await db.query(
          'SELECT availability_id, package_id, available_date, seats_available, status FROM package_availability WHERE package_id = ? ORDER BY available_date ASC',
          [packageId]
        );
        return rows.map(r => ({
          id: String(r.availability_id),
          packageId: String(r.package_id),
          date: String(r.available_date).slice(0, 10),
          seatsAvailable: r.seats_available,
          status: String(r.status || '').toLowerCase() === 'available' ? 'open' : String(r.status || '').toLowerCase()
        }));
      } catch (e) {
        console.error('[MySQL Provider listAvailability Error]', e.message);
      }
    }
    return memRepo.listAvailability(packageId);
  },

  async getAvailability(id) {
    if (isMySQL()) {
      try {
        const rows = await db.query(
          'SELECT availability_id, package_id, available_date, seats_available, status FROM package_availability WHERE availability_id = ?',
          [id]
        );
        if (!rows || rows.length === 0) return null;
        const r = rows[0];
        return {
          id: String(r.availability_id),
          packageId: String(r.package_id),
          date: String(r.available_date).slice(0, 10),
          seatsAvailable: r.seats_available,
          status: String(r.status || '').toLowerCase() === 'available' ? 'open' : String(r.status || '').toLowerCase()
        };
      } catch (e) {
        console.error('[MySQL Provider getAvailability Error]', e.message);
      }
    }
    return memRepo.getAvailability(id);
  },

  async insertAvailability(data) {
    if (isMySQL()) {
      try {
        const res = await db.query(
          'INSERT INTO package_availability (package_id, available_date, seats_available, status) VALUES (?, ?, ?, "AVAILABLE")',
          [data.packageId, data.date, data.seatsAvailable]
        );
        return {
          id: String(res.insertId),
          packageId: String(data.packageId),
          date: data.date,
          seatsAvailable: data.seatsAvailable,
          status: 'open'
        };
      } catch (e) {
        console.error('[MySQL Provider insertAvailability Error]', e.message);
      }
    }
    return memRepo.insertAvailability(data);
  },

  async updateAvailability(id, patch) {
    if (isMySQL()) {
      try {
        const statusMap = { open: 'AVAILABLE', closed: 'FULL' };
        await db.query(`
          UPDATE package_availability
          SET seats_available = COALESCE(?, seats_available),
              status = COALESCE(?, status)
          WHERE availability_id = ?
        `, [
          patch.seatsAvailable !== undefined ? patch.seatsAvailable : null,
          patch.status ? (statusMap[patch.status] || patch.status) : null,
          id
        ]);
        return this.getAvailability(id);
      } catch (e) {
        console.error('[MySQL Provider updateAvailability Error]', e.message);
      }
    }
    return memRepo.updateAvailability(id, patch);
  },

  async deleteAvailability(id) {
    if (isMySQL()) {
      try {
        await db.query('DELETE FROM package_availability WHERE availability_id = ?', [id]);
        return;
      } catch (e) {
        console.error('[MySQL Provider deleteAvailability Error]', e.message);
      }
    }
    return memRepo.deleteAvailability(id);
  },

  async listBookings(providerId) {
    if (isMySQL()) {
      try {
        const rows = await db.query(`
          SELECT b.*, u.name AS customer_name, u.email AS customer_email,
                 p.title AS package_title, d.name AS destination, pa.available_date
          FROM bookings b
          JOIN users u ON b.customer_id = u.user_id
          JOIN tour_packages p ON b.package_id = p.package_id
          LEFT JOIN destinations d ON p.destination_id = d.destination_id
          LEFT JOIN package_availability pa ON b.availability_id = pa.availability_id
          WHERE p.provider_id = ?
          ORDER BY b.booked_at DESC
        `, [providerId]);

        return rows.map(r => ({
          id: String(r.booking_id),
          packageId: String(r.package_id),
          availabilityId: String(r.availability_id),
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          travelers: r.travelers,
          totalAmount: parseFloat(r.total_amount) || 0,
          bookingStatus: String(r.booking_status || '').toLowerCase(),
          paymentStatus: String(r.payment_status || '').toLowerCase(),
          bookedAt: r.booked_at,
          packageTitle: r.package_title,
          destination: r.destination || '',
          travelDate: r.available_date ? String(r.available_date).slice(0, 10) : null
        }));
      } catch (e) {
        console.error('[MySQL Provider listBookings Error]', e.message);
      }
    }
    return memRepo.listBookings();
  },

  async getBooking(id) {
    if (isMySQL()) {
      try {
        const rows = await db.query(`
          SELECT b.*, u.name AS customer_name, u.email AS customer_email,
                 p.title AS package_title, d.name AS destination, pa.available_date
          FROM bookings b
          JOIN users u ON b.customer_id = u.user_id
          JOIN tour_packages p ON b.package_id = p.package_id
          LEFT JOIN destinations d ON p.destination_id = d.destination_id
          LEFT JOIN package_availability pa ON b.availability_id = pa.availability_id
          WHERE b.booking_id = ?
        `, [id]);
        if (!rows || rows.length === 0) return null;
        const r = rows[0];
        return {
          id: String(r.booking_id),
          packageId: String(r.package_id),
          availabilityId: String(r.availability_id),
          customerName: r.customer_name,
          customerEmail: r.customer_email,
          travelers: r.travelers,
          totalAmount: parseFloat(r.total_amount) || 0,
          bookingStatus: String(r.booking_status || '').toLowerCase(),
          paymentStatus: String(r.payment_status || '').toLowerCase(),
          bookedAt: r.booked_at,
          packageTitle: r.package_title,
          destination: r.destination || '',
          travelDate: r.available_date ? String(r.available_date).slice(0, 10) : null
        };
      } catch (e) {
        console.error('[MySQL Provider getBooking Error]', e.message);
      }
    }
    return memRepo.getBooking(id);
  },

  async updateBooking(id, patch) {
    if (isMySQL()) {
      try {
        const statusMap = { confirmed: 'CONFIRMED', cancelled: 'CANCELLED', pending: 'PENDING', completed: 'COMPLETED' };
        const payMap = { paid: 'PAID', unpaid: 'UNPAID', mock_paid: 'PAID', mock_refunded: 'REFUNDED', refunded: 'REFUNDED' };

        await db.query(`
          UPDATE bookings
          SET booking_status = COALESCE(?, booking_status),
              payment_status = COALESCE(?, payment_status)
          WHERE booking_id = ?
        `, [
          patch.bookingStatus ? (statusMap[patch.bookingStatus] || patch.bookingStatus.toUpperCase()) : null,
          patch.paymentStatus ? (payMap[patch.paymentStatus] || patch.paymentStatus.toUpperCase()) : null,
          id
        ]);
        return this.getBooking(id);
      } catch (e) {
        console.error('[MySQL Provider updateBooking Error]', e.message);
      }
    }
    return memRepo.updateBooking(id, patch);
  },

  async listReviews(providerId) {
    if (isMySQL()) {
      try {
        const rows = await db.query(`
          SELECT r.*, u.name AS customer_name, p.title AS package_title
          FROM reviews r
          JOIN users u ON r.customer_id = u.user_id
          JOIN tour_packages p ON r.package_id = p.package_id
          WHERE p.provider_id = ?
          ORDER BY r.created_at DESC
        `, [providerId]);

        return rows.map(r => ({
          id: String(r.review_id),
          bookingId: String(r.booking_id),
          packageId: String(r.package_id),
          customerName: r.customer_name,
          packageTitle: r.package_title,
          rating: r.rating,
          comment: r.comment || '',
          createdAt: r.created_at
        }));
      } catch (e) {
        console.error('[MySQL Provider listReviews Error]', e.message);
      }
    }
    return memRepo.listReviews();
  }
};
