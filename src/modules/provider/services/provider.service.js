'use strict';
// Business rules + ownership checks. Talks only to the repository interface (swap for MySQL later).
const repo = require('../repositories/memory.repository');
const { HttpError } = require('../errors');
const V = require('../validators/provider.validator');

const today = () => new Date().toISOString().slice(0, 10);
const NF = (what) => new HttpError(404, `${what} not found`);
const ACTIVE = ['pending', 'confirmed'];
const EARNING = ['confirmed', 'completed'];
const TRANSITIONS = { pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'] };

function ownPackage(pid, id) { const p = repo.getPackage(id); if (!p || p.providerId !== pid) throw NF('Package'); return p; }
function ownAvailability(pid, id) {
  const a = repo.getAvailability(id); if (!a) throw NF('Availability');
  return { a, pkg: ownPackage(pid, a.packageId) };
}
function enrich(b) {
  const p = repo.getPackage(b.packageId), a = repo.getAvailability(b.availabilityId);
  return { ...b, packageTitle: p ? p.title : '—', destination: p ? p.destination : '', travelDate: a ? a.date : null };
}
function scope(pid) {
  const packages = repo.listPackages(pid), ids = new Set(packages.map((p) => p.id));
  return { packages, bookings: repo.listBookings().filter((b) => ids.has(b.packageId)).map(enrich), reviews: repo.listReviews().filter((r) => ids.has(r.packageId)) };
}
const avg = (rs) => (rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : null);

module.exports = {
  options: () => ({ destinations: V.DESTINATIONS, categories: V.CATEGORIES }),

  dashboard(pid) {
    const { packages, bookings, reviews } = scope(pid);
    const earned = bookings.filter((b) => EARNING.includes(b.bookingStatus));
    return {
      totals: {
        packages: packages.length, approvedPackages: packages.filter((p) => p.status === 'approved').length,
        pendingBookings: bookings.filter((b) => b.bookingStatus === 'pending').length,
        confirmedBookings: bookings.filter((b) => b.bookingStatus === 'confirmed').length,
        earnings: earned.reduce((s, b) => s + b.totalAmount, 0), averageRating: avg(reviews), reviews: reviews.length
      },
      recentBookings: bookings.sort((a, b) => b.bookedAt.localeCompare(a.bookedAt)).slice(0, 5),
      mock: true
    };
  },

  listPackages(pid) {
    const { packages, bookings } = scope(pid);
    return packages.map((p) => ({ ...p, bookingCount: bookings.filter((b) => b.packageId === p.id && ACTIVE.includes(b.bookingStatus)).length }));
  },
  getPackage: (pid, id) => ownPackage(pid, id),
  createPackage: (pid, body) => repo.insertPackage({ ...V.validatePackage(body), providerId: pid, status: 'pending', createdAt: new Date().toISOString() }),
  updatePackage(pid, id, body) { ownPackage(pid, id); return repo.updatePackage(id, V.validatePackage(body)); },
  deletePackage(pid, id) {
    ownPackage(pid, id);
    if (repo.listBookings().some((b) => b.packageId === id && ACTIVE.includes(b.bookingStatus))) throw new HttpError(409, 'This package has pending or confirmed bookings. Resolve them before deleting.');
    repo.deletePackage(id);
  },

  listAvailability(pid, pkgId) { const p = ownPackage(pid, pkgId); return { capacity: p.capacity, title: p.title, dates: repo.listAvailability(pkgId) }; },
  addAvailability(pid, pkgId, body) {
    const p = ownPackage(pid, pkgId), v = V.validateAvailabilityCreate(body, p.capacity);
    if (repo.listAvailability(pkgId).some((a) => a.date === v.date)) throw new HttpError(422, 'Validation failed', { date: 'This date already exists for the package.' });
    return repo.insertAvailability({ packageId: pkgId, ...v, status: 'open' });
  },
  updateAvailability(pid, id, body) { const { pkg } = ownAvailability(pid, id); return repo.updateAvailability(id, V.validateAvailabilityUpdate(body, pkg.capacity)); },
  deleteAvailability(pid, id) {
    ownAvailability(pid, id);
    if (repo.listBookings().some((b) => b.availabilityId === id && ACTIVE.includes(b.bookingStatus))) throw new HttpError(409, 'This date has pending or confirmed bookings.');
    repo.deleteAvailability(id);
  },

  listBookings(pid, { status, packageId, q } = {}) {
    let rows = scope(pid).bookings;
    if (status) rows = rows.filter((b) => b.bookingStatus === status);
    if (packageId) rows = rows.filter((b) => b.packageId === packageId);
    if (q) rows = rows.filter((b) => (b.customerName + b.id + b.packageTitle).toLowerCase().includes(String(q).toLowerCase()));
    return rows.sort((a, b) => b.bookedAt.localeCompare(a.bookedAt));
  },
  getBooking(pid, id) {
    const b = repo.getBooking(id); if (!b) throw NF('Booking'); ownPackage(pid, b.packageId); return enrich(b);
  },
  updateBookingStatus(pid, id, body) {
    const next = V.validateBookingStatus(body), b = repo.getBooking(id);
    if (!b) throw NF('Booking'); ownPackage(pid, b.packageId);
    if (!(TRANSITIONS[b.bookingStatus] || []).includes(next)) throw new HttpError(409, `A ${b.bookingStatus} booking cannot be changed to ${next}.`);
    const av = repo.getAvailability(b.availabilityId), pkg = repo.getPackage(b.packageId);
    if (next === 'completed' && av && av.date > today()) throw new HttpError(409, 'The trip date has not passed yet.');
    if (next === 'cancelled' && av) repo.updateAvailability(av.id, { seatsAvailable: Math.min(pkg.capacity, av.seatsAvailable + b.travelers) });
    return enrich(repo.updateBooking(id, { bookingStatus: next, paymentStatus: next === 'cancelled' ? 'mock_refunded' : b.paymentStatus }));
  },

  earnings(pid) {
    const { packages, bookings } = scope(pid);
    const rows = packages.map((p) => {
      const mine = bookings.filter((b) => b.packageId === p.id), paid = mine.filter((b) => EARNING.includes(b.bookingStatus));
      return { packageId: p.id, title: p.title, bookings: paid.length, travelers: paid.reduce((s, b) => s + b.travelers, 0), earnings: paid.reduce((s, b) => s + b.totalAmount, 0), pendingAmount: mine.filter((b) => b.bookingStatus === 'pending').reduce((s, b) => s + b.totalAmount, 0) };
    });
    return { rows, total: rows.reduce((s, r) => s + r.earnings, 0), pending: rows.reduce((s, r) => s + r.pendingAmount, 0), mock: true };
  },

  reviews(pid, { packageId } = {}) {
    const { packages, reviews } = scope(pid), t = Object.fromEntries(packages.map((p) => [p.id, p.title]));
    const rows = reviews.filter((r) => !packageId || r.packageId === packageId).map((r) => ({ ...r, packageTitle: t[r.packageId] })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { average: avg(rows), count: rows.length, reviews: rows };
  }
};
