'use strict';
const C = require('../controllers/provider.controller');
// [method, path (under /api/provider), handler]
module.exports = [
  ['GET', '/me', C.me], ['GET', '/dashboard', C.dashboard],
  ['GET', '/packages', C.listPackages], ['POST', '/packages', C.createPackage],
  ['GET', '/packages/:id', C.getPackage], ['PUT', '/packages/:id', C.updatePackage], ['DELETE', '/packages/:id', C.deletePackage],
  ['GET', '/packages/:id/availability', C.listAvailability], ['POST', '/packages/:id/availability', C.addAvailability],
  ['PUT', '/availability/:id', C.updateAvailability], ['DELETE', '/availability/:id', C.deleteAvailability],
  ['GET', '/bookings', C.listBookings], ['GET', '/bookings/:id', C.getBooking], ['PATCH', '/bookings/:id/status', C.updateBookingStatus],
  ['GET', '/earnings', C.earnings], ['GET', '/reviews', C.reviews]
];
