
'use strict';

// Signed login token (HMAC-SHA256, Node built-in crypto).
// Lets the server verify WHO is calling protected APIs,
// because the existing login only returned plain user JSON.

// Set AUTH_SECRET in the environment for a stable secret.
// Otherwise, a random secret is generated at start-up.
// Tokens stop working after a server restart, and users
// simply log in again.

const crypto = require('crypto');

const SECRET =
    process.env.AUTH_SECRET ||
    crypto.randomBytes(32).toString('hex');

const TTL_SECONDS = 8 * 60 * 60;

// Generate HMAC-SHA256 signature
const mac = (body) => {
    return crypto
        .createHmac('sha256', SECRET)
        .update(body)
        .digest('base64url');
};

// Generate signed login token
function signToken(payload) {

    const body = Buffer.from(
        JSON.stringify({
            ...payload,
            exp: Math.floor(Date.now() / 1000) + TTL_SECONDS
        })
    ).toString('base64url');

    return body + '.' + mac(body);
}

// Verify signed login token
function verifyToken(token) {

    if (typeof token !== 'string') {
        return null;
    }

    const [body, sig] = token.split('.');

    if (!body || !sig) {
        return null;
    }

    // Generate expected signature
    const expected = Buffer.from(mac(body));
    const given = Buffer.from(sig);

    // Compare signatures securely
    if (
        expected.length !== given.length ||
        !crypto.timingSafeEqual(expected, given)
    ) {
        return null;
    }

    try {

        const p = JSON.parse(
            Buffer.from(body, 'base64url').toString()
        );

        // Check token expiration
        return p.exp > Date.now() / 1000 ? p : null;

    } catch (e) {

        return null;
    }
}

// Export functions for use in other modules
module.exports = {
    signToken,
    verifyToken
};
