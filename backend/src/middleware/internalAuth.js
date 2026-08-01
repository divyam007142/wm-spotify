'use strict';

/**
 * Guards bot-facing REST endpoints (mounted under /api) with a shared
 * secret. The Discord bot sends it as the `x-internal-secret` header on
 * every request (see discord-bot/src/utils/api.js).
 */

export function internalAuth(req, res, next) {
  const expected = process.env.INTERNAL_API_SECRET;
  const provided = req.get('x-internal-secret');

  if (!expected || !provided || provided !== expected) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }

  next();
}
