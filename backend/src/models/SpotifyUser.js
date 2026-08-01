'use strict';

import mongoose from 'mongoose';

const spotifyUserSchema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    spotifyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    spotifyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    /**
     * Which configured Spotify Developer application (see
     * config/spotifyApps.js) this user authorized with, e.g. "app-1".
     * Refresh tokens are only valid for the app that issued them, so every
     * future token refresh and Spotify API call for this user must keep
     * using this same app's client credentials.
     *
     * Not required: legacy records created before multi-app support may not
     * have one yet. tokenService resolves and backfills it automatically
     * the first time such a user's token needs refreshing.
     */
    spotifyAppId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    accessToken: {
      type: String,
      required: true,
      select: false,
    },
    refreshToken: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SpotifyUser =
  mongoose.models.SpotifyUser || mongoose.model('SpotifyUser', spotifyUserSchema);