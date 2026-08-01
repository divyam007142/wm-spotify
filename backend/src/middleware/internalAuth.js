'use strict';

/**
 * Guards bot-facing REST endpoints (mounted under /api) with a shared
 * secret. The Discord bot sends it as the `x-internal-secret` header on
 * every request (see discord-bot/src/utils/api.js).
 *
 * If INTERNAL_API_SECRET is not configured on the host, the check is
 * skipped entirely — useful when deploying to a new host before the secret
 * has been configured, or when no extra auth layer is needed.
 */

export function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_API_SECRET;

  // Secret not configured on this host — skip the check.
  if (!expected) return next();

  const provided = req.get('x-internal-secret');
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  next();
}
