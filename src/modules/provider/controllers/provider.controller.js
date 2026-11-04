'use strict';
// Thin HTTP layer: ctx = { user, params, query, body } -> { status?, data }
const S = require('../services/provider.service');
const ok = (data, status = 200) => ({ status, data });

module.exports = {
  me: async ({ user }) => ok({ id: user.id, name: user.name, email: user.email, city: user.city || 'Tamil Nadu', mockData: false, options: S.options() }),
  dashboard: async ({ user }) => ok(await S.dashboard(user.id)),
  listPackages: async ({ user }) => ok(await S.listPackages(user.id)),
  getPackage: async ({ user, params }) => ok(await S.getPackage(user.id, params.id)),
  createPackage: async ({ user, body }) => ok(await S.createPackage(user.id, body), 201),
  updatePackage: async ({ user, params, body }) => ok(await S.updatePackage(user.id, params.id, body)),
  deletePackage: async ({ user, params }) => { await S.deletePackage(user.id, params.id); return ok({ deleted: true }); },
  listAvailability: async ({ user, params }) => ok(await S.listAvailability(user.id, params.id)),
  addAvailability: async ({ user, params, body }) => ok(await S.addAvailability(user.id, params.id, body), 201),
  updateAvailability: async ({ user, params, body }) => ok(await S.updateAvailability(user.id, params.id, body)),
  deleteAvailability: async ({ user, params }) => { await S.deleteAvailability(user.id, params.id); return ok({ deleted: true }); },
  listBookings: async ({ user, query }) => ok(await S.listBookings(user.id, query)),
  getBooking: async ({ user, params }) => ok(await S.getBooking(user.id, params.id)),
  updateBookingStatus: async ({ user, params, body }) => ok(await S.updateBookingStatus(user.id, params.id, body)),
  earnings: async ({ user }) => ok(await S.earnings(user.id)),
  reviews: async ({ user, query }) => ok(await S.reviews(user.id, query))
};
