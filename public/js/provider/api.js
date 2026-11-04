/* All provider fetch() calls live here. Base URL: /api/provider */
(function () {
  const BASE = '/api/provider';
  // --- Access guard (same pattern as customer pages): only a logged-in PROVIDER (Local Tourist) may stay. ---
  // Real enforcement is on the server (/api/provider/* checks the signed token); this just redirects early.
  const session = () => { try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; } };
  const devId = sessionStorage.getItem('providerDevId'); // standalone dev server only (provider-dev-server.js)
  const user = session();
  if (!devId && (!user || String(user.role || '').toUpperCase() !== 'PROVIDER' || !user.token)) { document.documentElement.hidden = true; location.replace('/login.html'); }
  class ApiError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
  async function req(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const u = session(); if (u && u.token) headers.Authorization = 'Bearer ' + u.token;
    if (devId) headers['X-Provider-Id'] = devId; // ignored by server.js; only used by provider-dev-server.js
    let res;
    try { res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch (e) { throw new ApiError(0, 'Cannot reach the server. Is it running?'); }
    let json = null; try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (res.status === 401 && !devId) { localStorage.removeItem('user'); location.replace('/login.html'); } // expired or invalid login
    if (!res.ok || !json || !json.ok) throw new ApiError(res.status, (json && json.error && json.error.message) || 'Request failed', json && json.error && json.error.details);
    return json.data;
  }
  const qs = (o) => { const p = new URLSearchParams(); Object.entries(o || {}).forEach(([k, v]) => v && p.set(k, v)); const s = p.toString(); return s ? '?' + s : ''; };
  window.ProviderAPI = {
    ApiError,
    me: () => req('GET', '/me'), dashboard: () => req('GET', '/dashboard'),
    listPackages: () => req('GET', '/packages'), getPackage: (id) => req('GET', '/packages/' + id),
    createPackage: (b) => req('POST', '/packages', b), updatePackage: (id, b) => req('PUT', '/packages/' + id, b), deletePackage: (id) => req('DELETE', '/packages/' + id),
    listAvailability: (pid) => req('GET', `/packages/${pid}/availability`), addAvailability: (pid, b) => req('POST', `/packages/${pid}/availability`, b),
    updateAvailability: (id, b) => req('PUT', '/availability/' + id, b), deleteAvailability: (id) => req('DELETE', '/availability/' + id),
    listBookings: (f) => req('GET', '/bookings' + qs(f)), getBooking: (id) => req('GET', '/bookings/' + id), setBookingStatus: (id, status) => req('PATCH', `/bookings/${id}/status`, { status }),
    earnings: () => req('GET', '/earnings'), reviews: (f) => req('GET', '/reviews' + qs(f))
  };
})();