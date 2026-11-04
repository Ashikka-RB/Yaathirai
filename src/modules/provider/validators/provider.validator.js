'use strict';
const { HttpError } = require('../errors');

const DESTINATIONS = ['Ooty', 'Kodaikanal', 'Kanyakumari', 'Madurai', 'Rameswaram', 'Mahabalipuram', 'Tiruchendur', 'Velankanni', 'Chennai'];
const CATEGORIES = ['Nature', 'Beach', 'Heritage', 'Spiritual', 'Food & Culture', 'Adventure'];
const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const list = (v) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : null);
const fail = (e) => { if (Object.keys(e).length) throw new HttpError(422, 'Validation failed', e); };
const today = () => new Date().toISOString().slice(0, 10);

function validatePackage(b) {
  b = b || {}; const e = {};
  const title = String(b.title || '').trim();
  if (title.length < 5 || title.length > 120) e.title = 'Title must be 5–120 characters.';
  const destination = String(b.destination || '').trim();
  if (!DESTINATIONS.includes(destination)) e.destination = 'Choose a valid destination.';
  const category = String(b.category || '').trim();
  if (!CATEGORIES.includes(category)) e.category = 'Choose a valid category.';
  const description = String(b.description || '').trim();
  if (description.length < 20 || description.length > 2000) e.description = 'Description must be 20–2000 characters.';
  const durationDays = num(b.durationDays);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) e.durationDays = 'Duration must be 1–30 days.';
  const price = num(b.price);
  if (!(price > 0) || price > 1000000) e.price = 'Price must be above 0 and at most 10,00,000.';
  const capacity = num(b.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) e.capacity = 'Capacity must be a whole number from 1 to 200.';
  const image = String(b.image || '').trim();
  if (image && !/^(https?:\/\/|\/?images\/)\S+$/i.test(image)) e.image = 'Use an http(s) URL or an images/... path.';
  const inclusions = list(b.inclusions || []), exclusions = list(b.exclusions || []);
  if (!inclusions) e.inclusions = 'Inclusions must be a list.';
  if (!exclusions) e.exclusions = 'Exclusions must be a list.';
  const raw = Array.isArray(b.itinerary) ? b.itinerary : null;
  let itinerary = [];
  if (!raw || raw.length < 1) e.itinerary = 'Add at least one itinerary day.';
  else {
    itinerary = raw.map((x) => ({ title: String((x && x.title) || '').trim(), description: String((x && x.description) || '').trim() }));
    if (itinerary.some((x) => !x.title)) e.itinerary = 'Every itinerary day needs a title.';
    else if (Number.isInteger(durationDays) && itinerary.length > durationDays) e.itinerary = 'More itinerary days than the package duration.';
  }
  fail(e);
  return { title, destination, category, description, durationDays, price, capacity, image, inclusions, exclusions, itinerary };
}

function validateAvailabilityCreate(b, capacity) {
  b = b || {}; const e = {};
  const date = String(b.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T00:00:00Z'))) e.date = 'Enter a valid date.';
  else if (date < today()) e.date = 'Date cannot be in the past.';
  const seatsAvailable = num(b.seatsAvailable);
  if (!Number.isInteger(seatsAvailable) || seatsAvailable < 1 || seatsAvailable > capacity) e.seatsAvailable = `Seats must be 1–${capacity} (package capacity).`;
  fail(e);
  return { date, seatsAvailable };
}

function validateAvailabilityUpdate(b, capacity) {
  b = b || {}; const e = {}; const out = {};
  if (b.seatsAvailable !== undefined) {
    const s = num(b.seatsAvailable);
    if (!Number.isInteger(s) || s < 0 || s > capacity) e.seatsAvailable = `Seats must be 0–${capacity}.`; else out.seatsAvailable = s;
  }
  if (b.status !== undefined) { if (!['open', 'closed'].includes(b.status)) e.status = 'Status must be open or closed.'; else out.status = b.status; }
  if (!Object.keys(out).length && !Object.keys(e).length) e.body = 'Nothing to update.';
  fail(e);
  return out;
}

function validateBookingStatus(b) {
  const s = b && b.status;
  if (!['confirmed', 'cancelled', 'completed'].includes(s)) throw new HttpError(422, 'Validation failed', { status: 'Status must be confirmed, cancelled or completed.' });
  return s;
}

module.exports = { DESTINATIONS, CATEGORIES, validatePackage, validateAvailabilityCreate, validateAvailabilityUpdate, validateBookingStatus };
