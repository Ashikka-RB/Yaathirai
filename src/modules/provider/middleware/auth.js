'use strict';
const { HttpError } = require('../errors');
const repo = require('../repositories/mysql.repository');

async function resolveUser(req) {
  const id = req.headers['x-provider-id'] || process.env.PROVIDER_DEV_USER || '3';
  return repo.getUser(id);
}

/* resolver: optional async (req) => user|null supplied by the main server (real login). */
async function requireProvider(req, resolver) {
  const user = await (resolver || resolveUser)(req);
  if (!user) throw new HttpError(401, 'Please log in.');
  if (user.role !== 'PROVIDER') throw new HttpError(403, 'Only local tourists / package providers can use this area.');
  if (user.status !== 'approved' && user.status !== 'active') throw new HttpError(403, 'Your provider account is not approved yet.');
  return user;
}

module.exports = { resolveUser, requireProvider };
