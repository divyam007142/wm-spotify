'use strict';

/**
 * Spotify OAuth constants.
 * All Spotify URLs and required scopes are centralised here.
 */

export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * Scopes requested during OAuth authorisation.
 * Extend this list as features are added.
 */
export const SPOTIFY_SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');
