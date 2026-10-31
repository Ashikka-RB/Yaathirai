/* All provider fetch() calls live here. Base URL: /api/provider */
(function () {
  const BASE = '/api/provider';
  class ApiError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details; } }
  async function req(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const dev = sessionStorage.getItem('providerDevId'); // DEV ONLY: remove when real auth exists
    if (dev) headers['X-Provider-Id'] = dev;
    let res;
    try { res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }); }
    catch (e) { throw new ApiError(0, 'Cannot reach the server. Is it running?'); }
    let json = null; try { json = await res.json(); } catch (e) { /* non-JSON */ }
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
