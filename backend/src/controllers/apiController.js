'use strict';

/**
 * Handlers for bot-facing REST API endpoints.
 * Each function is a thin adapter: validate → call service → respond.
 */

import {
  deleteSpotifyUserByDiscordId,
  getSpotifyUserByDiscordId,
} from '../services/spotifyUserService.js';
import { getCurrentlyPlaying, invalidatePlaybackCache } from '../services/spotifyService.js';
import { invalidateAccessTokenCache } from '../services/tokenService.js';

export async function getUserStatus(req, res, next) {
  try {
    const discordId = String(req.params.discordId || '').trim();
    if (!discordId) {
      return res.status(400).json({ error: { message: 'discordId is required' } });
    }

    const user = await getSpotifyUserByDiscordId(discordId);
    res.json({ authorized: Boolean(user) });
  } catch (err) {
    next(err);
  }
}

export async function disconnectUser(req, res, next) {
  try {
    const discordId = String(req.params.discordId || '').trim();
    if (!discordId) {
      return res.status(400).json({ error: { message: 'discordId is required' } });
    }

    const existing = await getSpotifyUserByDiscordId(discordId);
    if (!existing) {
      return res.status(404).json({ error: { message: 'No linked Spotify account found' } });
    }

    await deleteSpotifyUserByDiscordId(discordId);
    invalidateAccessTokenCache(discordId);
    invalidatePlaybackCache(discordId);
    res.json({ message: 'Spotify account disconnected', discordId });
  } catch (err) {
    next(err);
  }
}

export async function getNowPlaying(req, res, next) {
  try {
    const discordId = String(req.query.discordId || '').trim();
    if (!discordId) {
      return res.status(400).json({ error: { message: 'discordId is required' } });
    }

    const user = await getSpotifyUserByDiscordId(discordId);
    if (!user) {
      return res.status(404).json({ error: { message: 'No linked Spotify account found' } });
    }

    const track = await getCurrentlyPlaying(discordId);
    res.json({ track });
  } catch (err) {
    if (err.response?.data) err.status = 502;
    next(err);
  }
}

export async function getRecentTracks(_req, res, next) {
  try {
    // TODO: call spotifyService.getRecentlyPlayed()
    res.json({ message: 'getRecentTracks — not yet implemented' });
  } catch (err) {
    next(err);
  }
}

export async function getTopItems(_req, res, next) {
  try {
    // TODO: call spotifyService.getTopItems()
    res.json({ message: 'getTopItems — not yet implemented' });
  } catch (err) {
    next(err);
  }
}
