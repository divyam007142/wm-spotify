'use strict';

/**
 * All direct calls to the Spotify Web API live here.
 * Uses Axios with an instance pre-configured with the base URL.
 * Token refresh is delegated to tokenService.
 */

import axios from 'axios';
import {
  SPOTIFY_API_BASE,
  SPOTIFY_AUTH_URL,
  SPOTIFY_SCOPES,
  SPOTIFY_TOKEN_URL,
} from '../config/spotify.js';
import { getValidAccessToken } from './tokenService.js';

export const spotifyClient = axios.create({
  baseURL: SPOTIFY_API_BASE,
  timeout: 8000,
});

/**
 * Short-lived cache of "currently playing" snapshots, keyed by Discord ID.
 * Keeps the `wm` trigger (and anything else polling playback) from hammering
 * Spotify's API when a user repeats the trigger within the same window —
 * fresh data is only fetched once this expires.
 */
/** Playback is always fetched live so song/state changes are reflected immediately. */
export function invalidatePlaybackCache(_discordId) {}

/**
 * @param {string} state
 * @param {{ clientId: string, redirectUri: string }} app — the Spotify
 *   application selected for this authorization (see config/spotifyApps.js)
 */
export function getAuthorizationUrl(state, app) {
  const params = new URLSearchParams({
    client_id: app.clientId,
    response_type: 'code',
    redirect_uri: app.redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
  });
  return `${SPOTIFY_AUTH_URL}?${params}`;
}

/**
 * @param {string} code
 * @param {{ clientId: string, clientSecret: string, redirectUri: string }} app —
 *   must be the same app used to generate the authorization URL for this code.
 */
export async function exchangeAuthorizationCode(code, app) {
  const params = new URLSearchParams({
    code,
    redirect_uri: app.redirectUri,
    grant_type: 'authorization_code',
  });
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

export async function getSpotifyProfile(accessToken) {
  const { data } = await spotifyClient.get('/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Fetches the user's currently playing track.
 * Returns `null` when nothing is playing (Spotify responds 204/empty body).
 *
 * Serves from the playback cache when available; only calls Spotify when
 * the cache has expired (or was explicitly invalidated). Access-token
 * caching/refresh is handled transparently by tokenService.getValidAccessToken.
 */
export async function getCurrentlyPlaying(discordId) {
  const accessToken = await getValidAccessToken(discordId);

  const response = await spotifyClient.get('/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { additional_types: 'track' },
    validateStatus: (status) => status === 200 || status === 204,
  });

  let track = null;
  if (response.status !== 204 && response.data?.item) {
    const { item, progress_ms: progressMs, is_playing: isPlaying } = response.data;
    track = {
      isPlaying: Boolean(isPlaying),
      progressMs: progressMs ?? 0,
      durationMs: item.duration_ms,
      name: item.name,
      artists: item.artists?.map((artist) => artist.name) ?? [],
      album: item.album?.name ?? null,
      albumArtUrl: item.album?.images?.[0]?.url ?? null,
      externalUrl: item.external_urls?.spotify ?? null,
    };
  }

  return track;
}

export async function getRecentlyPlayed(_userId, _limit = 10) {
  // TODO: GET /me/player/recently-played
  throw new Error('getRecentlyPlayed — not yet implemented');
}

export async function getTopItems(_userId, _type = 'tracks', _timeRange = 'medium_term') {
  // TODO: GET /me/top/{type}
  throw new Error('getTopItems — not yet implemented');
}
