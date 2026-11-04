'use strict';
// In-memory repository. Changes live only while the Node process runs and are lost on restart.
// DB LATER: keep this exact method list and re-implement it with MySQL queries.
const seed = require('../data/mock-data');
const clone = (o) => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
const db = clone(seed);
let seq = 1000;
const nid = (p) => `${p}-${++seq}`;
const find = (list, id) => list.find((x) => x.id === id);

module.exports = {
  getUser: (id) => clone(db.users[id]) || null,

  listPackages: (providerId) => clone(db.packages.filter((p) => p.providerId === providerId)),
  getPackage: (id) => clone(find(db.packages, id)) || null,
  insertPackage(data) { const row = { ...data, id: nid('pkg') }; db.packages.push(row); return clone(row); },
  updatePackage(id, patch) { Object.assign(find(db.packages, id), patch); return clone(find(db.packages, id)); },
  deletePackage(id) {
    db.packages = db.packages.filter((p) => p.id !== id);
    db.availability = db.availability.filter((a) => a.packageId !== id);
    db.bookings = db.bookings.filter((b) => b.packageId !== id);
    db.reviews = db.reviews.filter((r) => r.packageId !== id);
  },

  listAvailability: (packageId) => clone(db.availability.filter((a) => a.packageId === packageId)).sort((a, b) => a.date.localeCompare(b.date)),
  getAvailability: (id) => clone(find(db.availability, id)) || null,
  insertAvailability(data) { const row = { ...data, id: nid('av') }; db.availability.push(row); return clone(row); },
  updateAvailability(id, patch) { Object.assign(find(db.availability, id), patch); return clone(find(db.availability, id)); },
  deleteAvailability(id) { db.availability = db.availability.filter((a) => a.id !== id); },

  listBookings: () => clone(db.bookings),
  getBooking: (id) => clone(find(db.bookings, id)) || null,
  updateBooking(id, patch) { Object.assign(find(db.bookings, id), patch); return clone(find(db.bookings, id)); },

  listReviews: () => clone(db.reviews)
};
