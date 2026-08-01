'use strict';

import { SpotifyUser } from '../models/SpotifyUser.js';
import { listSpotifyApps } from '../config/spotifyApps.js';

const PUBLIC_FIELDS = '-accessToken -refreshToken';

function normalizeId(id, name) {
  if (!id || typeof id !== 'string') {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return id.trim();
}

function normalizePayload(data = {}) {
  const payload = { ...data };
  if (payload.expiresAt !== undefined) {
    payload.expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(payload.expiresAt.getTime())) {
      throw new TypeError('expiresAt must be a valid date');
    }
  }
  return payload;
}

export async function createSpotifyUser(data) {
  return SpotifyUser.create(normalizePayload(data));
}

export async function upsertSpotifyUserByDiscordId(discordId, data) {
  return SpotifyUser.findOneAndUpdate(
    { discordId: normalizeId(discordId, 'discordId') },
    { $set: normalizePayload(data) },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('+accessToken +refreshToken')
    .exec();
}

export async function getSpotifyUserByDiscordId(discordId, options = {}) {
  const query = SpotifyUser.findOne({ discordId: normalizeId(discordId, 'discordId') });
  if (options.includeTokens) query.select('+accessToken +refreshToken');
  else query.select(PUBLIC_FIELDS);
  return query.lean().exec();
}

export async function getSpotifyUserBySpotifyId(spotifyId, options = {}) {
  const query = SpotifyUser.findOne({ spotifyId: normalizeId(spotifyId, 'spotifyId') });
  if (options.includeTokens) query.select('+accessToken +refreshToken');
  else query.select(PUBLIC_FIELDS);
  return query.lean().exec();
}

export async function listSpotifyUsers(options = {}) {
  const query = SpotifyUser.find({}).sort({ createdAt: -1 });
  if (options.includeTokens) query.select('+accessToken +refreshToken');
  else query.select(PUBLIC_FIELDS);
  return query.lean().exec();
}

export async function updateSpotifyUserByDiscordId(discordId, updates) {
  return SpotifyUser.findOneAndUpdate(
    { discordId: normalizeId(discordId, 'discordId') },
    { $set: normalizePayload(updates) },
    { new: true, runValidators: true, projection: PUBLIC_FIELDS }
  )
    .lean()
    .exec();
}

export async function deleteSpotifyUserByDiscordId(discordId) {
  const result = await SpotifyUser.deleteOne({ discordId: normalizeId(discordId, 'discordId') });
  return result.deletedCount === 1;
}

/**
 * Picks the first configured Spotify application that hasn't hit its tester
 * capacity yet (counted by how many linked users are already assigned to
 * it). Returns `null` if every app is full.
 */
export async function selectAvailableSpotifyApp() {
  const apps = listSpotifyApps();

  for (const app of apps) {
    // Sequential on purpose — apps are checked in priority order and we can
    // stop as soon as one has room, avoiding unnecessary count queries.
    // eslint-disable-next-line no-await-in-loop
    const linkedCount = await SpotifyUser.countDocuments({ spotifyAppId: app.id });
    if (linkedCount < app.maxUsers) return app;
  }

  return null;
}