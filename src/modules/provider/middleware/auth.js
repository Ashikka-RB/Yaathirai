'use strict';
const { HttpError } = require('../errors');
const repo = require('../repositories/memory.repository');

/* ============ INTEGRATION POINT ============
 * The team project has no authentication yet. Replace the body of resolveUser() with the team's
 * session/JWT lookup, returning { id, name, email, role, status } or null.
 * DEV STUB: trusts the X-Provider-Id header (or PROVIDER_DEV_USER, default prov-1). NOT SECURE.
 * ============================================ */
function resolveUser(req) {
  const id = req.headers['x-provider-id'] || process.env.PROVIDER_DEV_USER || 'prov-1';
  return repo.getUser(id);
}

/* resolver: optional async (req) => user|null supplied by the main server (real login). Falls back to the dev stub. */
async function requireProvider(req, resolver) {
  const user = await (resolver || resolveUser)(req);
  if (!user) throw new HttpError(401, 'Please log in.');
  if (user.role !== 'PROVIDER') throw new HttpError(403, 'Only local tourists / package providers can use this area.');
  if (user.status !== 'approved') throw new HttpError(403, 'Your provider account is not approved yet.');
  return user;
}
module.exports = { resolveUser, requireProvider };