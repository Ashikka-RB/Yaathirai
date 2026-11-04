'use strict';
// Business rules + ownership checks. Uses hybrid MySQL / in-memory repository.
const repo = require('../repositories/mysql.repository');
const { HttpError } = require('../errors');
const V = require('../validators/provider.validator');

const today = () => new Date().toISOString().slice(0, 10);
const NF = (what) => new HttpError(404, `${what} not found`);
const ACTIVE = ['pending', 'confirmed'];
const EARNING = ['confirmed', 'completed'];
const TRANSITIONS = { pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'] };

async function ownPackage(pid, id) {
  const p = await repo.getPackage(id);
  if (!p || String(p.providerId) !== String(pid)) throw NF('Package');
  return p;
}

async function ownAvailability(pid, id) {
  const a = await repo.getAvailability(id);
  if (!a) throw NF('Availability');
  return { a, pkg: await ownPackage(pid, a.packageId) };
}

async function scope(pid) {
  const packages = await repo.listPackages(pid);
  const bookings = await repo.listBookings(pid);
  const reviews = await repo.listReviews(pid);
  return { packages, bookings, reviews };
}

const avg = (rs) => (rs && rs.length ? Math.round((rs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / rs.length) * 10) / 10 : null);

module.exports = {
  options: () => ({ destinations: V.DESTINATIONS, categories: V.CATEGORIES }),

  async dashboard(pid) {
    const { packages, bookings, reviews } = await scope(pid);
    const earned = bookings.filter((b) => EARNING.includes(b.bookingStatus));
    return {
      totals: {
        packages: packages.length,
        approvedPackages: packages.filter((p) => p.status === 'approved').length,
        pendingBookings: bookings.filter((b) => b.bookingStatus === 'pending').length,
        confirmedBookings: bookings.filter((b) => b.bookingStatus === 'confirmed').length,
        earnings: earned.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
        averageRating: avg(reviews),
        reviews: reviews.length
      },
      recentBookings: bookings.sort((a, b) => String(b.bookedAt || '').localeCompare(String(a.bookedAt || ''))).slice(0, 5),
      mock: false
    };
  },

  async listPackages(pid) {
    const { packages, bookings } = await scope(pid);
    return packages.map((p) => ({
      ...p,
      bookingCount: bookings.filter((b) => String(b.packageId) === String(p.id) && ACTIVE.includes(b.bookingStatus)).length
    }));
  },

  getPackage: (pid, id) => ownPackage(pid, id),

  async createPackage(pid, body) {
    return repo.insertPackage({
      ...V.validatePackage(body),
      providerId: pid,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  },

  async updatePackage(pid, id, body) {
    await ownPackage(pid, id);
    return repo.updatePackage(id, V.validatePackage(body));
  },

  async deletePackage(pid, id) {
    await ownPackage(pid, id);
    const bookings = await repo.listBookings(pid);
    if (bookings.some((b) => String(b.packageId) === String(id) && ACTIVE.includes(b.bookingStatus))) {
      throw new HttpError(409, 'This package has pending or confirmed bookings. Resolve them before deleting.');
    }
    await repo.deletePackage(id);
  },

  async listAvailability(pid, pkgId) {
    const p = await ownPackage(pid, pkgId);
    const dates = await repo.listAvailability(pkgId);
    return { capacity: p.capacity, title: p.title, dates };
  },

  async addAvailability(pid, pkgId, body) {
    const p = await ownPackage(pid, pkgId);
    const v = V.validateAvailabilityCreate(body, p.capacity);
    const existing = await repo.listAvailability(pkgId);
    if (existing.some((a) => a.date === v.date)) {
      throw new HttpError(422, 'Validation failed', { date: 'This date already exists for the package.' });
    }
    return repo.insertAvailability({ packageId: pkgId, ...v, status: 'open' });
  },

  async updateAvailability(pid, id, body) {
    const { pkg } = await ownAvailability(pid, id);
    return repo.updateAvailability(id, V.validateAvailabilityUpdate(body, pkg.capacity));
  },

  async deleteAvailability(pid, id) {
    await ownAvailability(pid, id);
    const bookings = await repo.listBookings(pid);
    if (bookings.some((b) => String(b.availabilityId) === String(id) && ACTIVE.includes(b.bookingStatus))) {
      throw new HttpError(409, 'This date has pending or confirmed bookings.');
    }
    await repo.deleteAvailability(id);
  },

  async listBookings(pid, { status, packageId, q } = {}) {
    let rows = (await scope(pid)).bookings;
    if (status) rows = rows.filter((b) => b.bookingStatus === status);
    if (packageId) rows = rows.filter((b) => String(b.packageId) === String(packageId));
    if (q) rows = rows.filter((b) => (String(b.customerName || '') + String(b.id || '') + String(b.packageTitle || '')).toLowerCase().includes(String(q).toLowerCase()));
    return rows.sort((a, b) => String(b.bookedAt || '').localeCompare(String(a.bookedAt || '')));
  },

  async getBooking(pid, id) {
    const b = await repo.getBooking(id);
    if (!b) throw NF('Booking');
    await ownPackage(pid, b.packageId);
    return b;
  },

  async updateBookingStatus(pid, id, body) {
    const next = V.validateBookingStatus(body);
    const b = await repo.getBooking(id);
    if (!b) throw NF('Booking');
    await ownPackage(pid, b.packageId);

    if (!(TRANSITIONS[b.bookingStatus] || []).includes(next)) {
      throw new HttpError(409, `A ${b.bookingStatus} booking cannot be changed to ${next}.`);
    }

    const av = await repo.getAvailability(b.availabilityId);
    const pkg = await repo.getPackage(b.packageId);

    if (next === 'completed' && av && av.date > today()) {
      throw new HttpError(409, 'The trip date has not passed yet.');
    }

    if (next === 'cancelled' && av) {
      await repo.updateAvailability(av.id, {
        seatsAvailable: Math.min(pkg.capacity, av.seatsAvailable + b.travelers)
      });
    }

    return repo.updateBooking(id, {
      bookingStatus: next,
      paymentStatus: next === 'cancelled' ? 'refunded' : b.paymentStatus
    });
  },

  async earnings(pid) {
    const { packages, bookings } = await scope(pid);
    const rows = packages.map((p) => {
      const mine = bookings.filter((b) => String(b.packageId) === String(p.id));
      const paid = mine.filter((b) => EARNING.includes(b.bookingStatus));
      return {
        packageId: p.id,
        title: p.title,
        bookings: paid.length,
        travelers: paid.reduce((s, b) => s + (Number(b.travelers) || 0), 0),
        earnings: paid.reduce((s, b) => s + (Number(b.totalAmount) || 0), 0),
        pendingAmount: mine.filter((b) => b.bookingStatus === 'pending').reduce((s, b) => s + (Number(b.totalAmount) || 0), 0)
      };
    });
    return {
      rows,
      total: rows.reduce((s, r) => s + r.earnings, 0),
      pending: rows.reduce((s, r) => s + r.pendingAmount, 0),
      mock: false
    };
  },

  async reviews(pid, { packageId } = {}) {
    const { packages, reviews } = await scope(pid);
    const t = Object.fromEntries(packages.map((p) => [String(p.id), p.title]));
    const rows = reviews
      .filter((r) => !packageId || String(r.packageId) === String(packageId))
      .map((r) => ({ ...r, packageTitle: t[String(r.packageId)] || '' }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return { average: avg(rows), count: rows.length, reviews: rows };
  }
};
