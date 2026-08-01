'use strict';

/**
 * Validates required environment variables at startup.
 * Import this module first in src/index.js.
 */

import dotenv from 'dotenv';
dotenv.config();

import { listSpotifyApps } from './spotifyApps.js';

const REQUIRED = ['SESSION_SECRET', 'MONGODB_URI', 'INTERNAL_API_SECRET'];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[config] Missing required environment variables:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

// Fail fast if no Spotify application is configured, rather than only
// discovering it on the first OAuth request.
try {
  const apps = listSpotifyApps();
  console.log(
    `[startup] Spotify connected successfully (${apps.length} application${
      apps.length === 1 ? '' : 's'
    } configured)`
  );
} catch (err) {
  console.error(`[config] ${err.message}`);
  process.exit(1);
}
