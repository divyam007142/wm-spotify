'use strict';

/**
 * Multiple Spotify Developer applications.
 *
 * Why: an unverified ("development mode") Spotify app can only be used by a
 * small, explicitly allow-listed set of testers. Registering several apps
 * and spreading users across them raises the effective tester ceiling
 * without waiting on Spotify's extension/quota review.
 *
 * Add or remove apps purely through environment variables — no code changes
 * needed. Two supported shapes:
 *
 *   1) Legacy / single app:
 *        SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI
 *
 *   2) Numbered / multi-app (as many as you like, 1-based, contiguous):
 *        SPOTIFY_APP_1_CLIENT_ID
 *        SPOTIFY_APP_1_CLIENT_SECRET
 *        SPOTIFY_APP_1_REDIRECT_URI
 *        SPOTIFY_APP_1_MAX_USERS      (optional, defaults to 25)
 *        SPOTIFY_APP_2_CLIENT_ID
 *        SPOTIFY_APP_2_CLIENT_SECRET
 *        SPOTIFY_APP_2_REDIRECT_URI
 *        ...
 *
 * If numbered apps are present they take precedence and the legacy vars are
 * ignored. Each app gets a stable id ("app-1", "app-2", ...) that is
 * persisted per-user as SpotifyUser.spotifyAppId, so every future token
 * refresh and Spotify API call for that user always goes through the same
 * app that originally issued their tokens — refresh tokens are not portable
 * across Spotify apps.
 */

/** Spotify's default dev-mode allow-list cap, used when *_MAX_USERS is unset. */
const DEFAULT_MAX_USERS = 25;

function loadNumberedApps() {
  const apps = [];
  let n = 1;

  while (process.env[`SPOTIFY_APP_${n}_CLIENT_ID`]) {
    const clientId = process.env[`SPOTIFY_APP_${n}_CLIENT_ID`];
    const clientSecret = process.env[`SPOTIFY_APP_${n}_CLIENT_SECRET`];
    const redirectUri = process.env[`SPOTIFY_APP_${n}_REDIRECT_URI`];

    if (!clientSecret || !redirectUri) {
      throw new Error(
        `SPOTIFY_APP_${n}_CLIENT_ID is set but SPOTIFY_APP_${n}_CLIENT_SECRET and/or ` +
          `SPOTIFY_APP_${n}_REDIRECT_URI is missing`
      );
    }

    const maxUsers = Number(process.env[`SPOTIFY_APP_${n}_MAX_USERS`]) || DEFAULT_MAX_USERS;
    apps.push({ id: `app-${n}`, clientId, clientSecret, redirectUri, maxUsers });
    n += 1;
  }

  return apps;
}

function loadLegacyApp() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) return [];

  return [
    {
      id: 'app-1',
      clientId: SPOTIFY_CLIENT_ID,
      clientSecret: SPOTIFY_CLIENT_SECRET,
      redirectUri: SPOTIFY_REDIRECT_URI,
      maxUsers: Number(process.env.SPOTIFY_MAX_USERS) || DEFAULT_MAX_USERS,
    },
  ];
}

// Resolved lazily (not at import time) so this module can be imported safely
// regardless of when dotenv.config() has run relative to other imports.
let cachedApps = null;

function loadApps() {
  if (cachedApps) return cachedApps;

  const numbered = loadNumberedApps();
  const apps = numbered.length > 0 ? numbered : loadLegacyApp();

  if (apps.length === 0) {
    throw new Error(
      'No Spotify application configured. Set SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET/' +
        'SPOTIFY_REDIRECT_URI, or SPOTIFY_APP_1_CLIENT_ID/_CLIENT_SECRET/_REDIRECT_URI.'
    );
  }

  cachedApps = apps;
  return cachedApps;
}

/** Returns every configured Spotify application. */
export function listSpotifyApps() {
  return loadApps();
}

/** Returns a single Spotify application by id, or throws if unknown. */
export function getSpotifyApp(appId) {
  const app = loadApps().find((candidate) => candidate.id === appId);
  if (!app) {
    throw new Error(`Unknown Spotify application id: ${appId}`);
  }
  return app;
}

/** Test-only hook to force re-reading env vars on next access. */
export function _resetSpotifyAppsCache() {
  cachedApps = null;
}
