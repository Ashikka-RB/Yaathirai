'use strict';
// Thin HTTP layer: ctx = { user, params, query, body } -> { status?, data }
const S = require('../services/provider.service');
const ok = (data, status = 200) => ({ status, data });

module.exports = {
  me: ({ user }) => ok({ id: user.id, name: user.name, email: user.email, city: user.city, mockData: true, options: S.options() }),
  dashboard: ({ user }) => ok(S.dashboard(user.id)),
  listPackages: ({ user }) => ok(S.listPackages(user.id)),
  getPackage: ({ user, params }) => ok(S.getPackage(user.id, params.id)),
  createPackage: ({ user, body }) => ok(S.createPackage(user.id, body), 201),
  updatePackage: ({ user, params, body }) => ok(S.updatePackage(user.id, params.id, body)),
  deletePackage: ({ user, params }) => { S.deletePackage(user.id, params.id); return ok({ deleted: true }); },
  listAvailability: ({ user, params }) => ok(S.listAvailability(user.id, params.id)),
  addAvailability: ({ user, params, body }) => ok(S.addAvailability(user.id, params.id, body), 201),
  updateAvailability: ({ user, params, body }) => ok(S.updateAvailability(user.id, params.id, body)),
  deleteAvailability: ({ user, params }) => { S.deleteAvailability(user.id, params.id); return ok({ deleted: true }); },
  listBookings: ({ user, query }) => ok(S.listBookings(user.id, query)),
  getBooking: ({ user, params }) => ok(S.getBooking(user.id, params.id)),
  updateBookingStatus: ({ user, params, body }) => ok(S.updateBookingStatus(user.id, params.id, body)),
  earnings: ({ user }) => ok(S.earnings(user.id)),
  reviews: ({ user, query }) => ok(S.reviews(user.id, query))
};
