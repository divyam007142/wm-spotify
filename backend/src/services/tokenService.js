'use strict';

/**
 * Manages Spotify access/refresh tokens in MongoDB.
 * Responsible for storing, retrieving, and refreshing tokens transparently.
 *
 * Access tokens are additionally cached in-memory until shortly before they
 * expire, so repeated calls (e.g. the same user triggering `wm` a few times
 * in a row) don't hit MongoDB or Spotify unnecessarily. The cache is a
 * private implementation detail — callers only ever see getValidAccessToken().
 */

import axios from 'axios';
import { SPOTIFY_TOKEN_URL } from '../config/spotify.js';
import { getSpotifyApp, listSpotifyApps } from '../config/spotifyApps.js';
import { SpotifyUser } from '../models/SpotifyUser.js';
import { TTLCache } from '../utils/cache.js';

/** Refresh this long before the token's real expiry, to avoid using a stale/expiring token mid-request. */
const REFRESH_BUFFER_MS = 60_000;

const accessTokenCache = new TTLCache();

function cacheAccessToken(discordId, accessToken, expiresAt) {
  const ttlMs = expiresAt.getTime() - Date.now() - REFRESH_BUFFER_MS;
  if (ttlMs > 0) {
    accessTokenCache.set(discordId, accessToken, ttlMs);
  } else {
    accessTokenCache.delete(discordId);
  }
}

/** Drops any cached access token for a user — call after disconnect/re-auth. */
export function invalidateAccessTokenCache(discordId) {
  accessTokenCache.delete(discordId);
}

function tokenExpiry(expiresIn) {
  const seconds = Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('Spotify returned an invalid token expiry');
  }
  return new Date(Date.now() + seconds * 1000);
}

export async function saveTokens(discordId, tokens) {
  const update = {
    accessToken: tokens.access_token,
    expiresAt: tokenExpiry(tokens.expires_in),
  };
  if (tokens.refresh_token) update.refreshToken = tokens.refresh_token;

  const user = await SpotifyUser.findOneAndUpdate(
    { discordId },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select('+accessToken +refreshToken')
    .exec();

  if (!user) throw new Error(`Spotify user not found for Discord ID ${discordId}`);

  cacheAccessToken(discordId, user.accessToken, user.expiresAt);
  return user;
}

export async function getTokens(discordId) {
  return SpotifyUser.findOne({ discordId }).select('+accessToken +refreshToken').exec();
}

/** Attempts a refresh_token grant against one specific Spotify app. */
async function requestTokenRefresh(app, refreshToken) {
  const params = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const { data } = await axios.post(SPOTIFY_TOKEN_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString(
        'base64'
      )}`,
    },
  });
  return data;
}

/** True when Spotify's error indicates "wrong app for this token" rather than an unrelated failure. */
function isWrongAppError(err) {
  const spotifyError = err.response?.data?.error;
  return err.response?.status === 400 && (spotifyError === 'invalid_grant' || spotifyError === 'invalid_client');
}

/**
 * Legacy fallback for users stored before multi-app support, who have a
 * refresh token but no recorded spotifyAppId. Probes every configured app's
 * credentials against the token — Spotify rejects a refresh_token grant
 * with invalid_grant/invalid_client when the app doesn't match — and
 * persists the first one that succeeds so this search never repeats for
 * this user again.
 */
async function resolveAndPersistSpotifyApp(discordId, refreshToken) {
  const apps = listSpotifyApps();

  for (const app of apps) {
    try {
      // Sequential on purpose: stop probing as soon as a match is found.
      // eslint-disable-next-line no-await-in-loop
      const data = await requestTokenRefresh(app, refreshToken);
      await SpotifyUser.updateOne({ discordId }, { $set: { spotifyAppId: app.id } }).exec();
      return { app, data };
    } catch (err) {
      if (isWrongAppError(err)) continue;
      throw err;
    }
  }

  throw new Error(
    `Could not determine the Spotify application for Discord ID ${discordId} — ` +
      'its refresh token did not match any configured app.'
  );
}

/**
 * Refreshes a user's access token — always using the same Spotify
 * application that originally issued their refresh token. Refresh tokens
 * are not portable across Spotify apps, so this deliberately ignores any
 * "default"/global client credentials:
 *  - spotifyAppId already stored → refresh with that app only
 *  - spotifyAppId missing (legacy record) → probe every configured app
 *    once, persist the match, then proceed as normal from then on
 */
export async function refreshAccessToken(discordId) {
  const user = await getTokens(discordId);
  if (!user?.refreshToken) throw new Error(`No refresh token found for Discord ID ${discordId}`);

  let data;
  if (user.spotifyAppId) {
    const app = getSpotifyApp(user.spotifyAppId);
    data = await requestTokenRefresh(app, user.refreshToken);
  } else {
    ({ data } = await resolveAndPersistSpotifyApp(discordId, user.refreshToken));
  }

  return saveTokens(discordId, { ...data, refresh_token: data.refresh_token || user.refreshToken });
}

/**
 * Returns a valid access token for a user, only touching MongoDB/Spotify
 * when necessary:
 *  - cache hit (not expired, not near expiry)      → returned instantly
 *  - cache miss but stored token still valid        → cached + returned
 *  - stored token expired/near expiry                → refreshed, cached, returned
 */
export async function getValidAccessToken(discordId) {
  const cached = accessTokenCache.get(discordId);
  if (cached) return cached;

  const user = await getTokens(discordId);
  if (!user) throw new Error(`Spotify user not found for Discord ID ${discordId}`);

  if (user.expiresAt.getTime() > Date.now() + REFRESH_BUFFER_MS) {
    cacheAccessToken(discordId, user.accessToken, user.expiresAt);
    return user.accessToken;
  }

  const refreshed = await refreshAccessToken(discordId);
  return refreshed.accessToken;
}
