'use strict';

/**
 * Bot-facing REST API routes.
 * All endpoints here are consumed by the Discord bot over HTTP.
 *
 * Placeholder routes — implementation added later.
 */

import { Router } from 'express';
import { internalAuth } from '../middleware/internalAuth.js';
import {
  disconnectUser,
  getNowPlaying,
  getRecentTracks,
  getTopItems,
  getUserStatus,
} from '../controllers/apiController.js';

const router = Router();

// Every endpoint below is bot-facing only — require the shared internal secret.
router.use(internalAuth);

// GET /api/now-playing
router.get('/now-playing', getNowPlaying);

// GET /api/recent
router.get('/recent', getRecentTracks);

// GET /api/top
router.get('/top', getTopItems);

// GET /api/users/:discordId/status — whether a Discord user has linked Spotify
router.get('/users/:discordId/status', getUserStatus);

// DELETE /api/users/:discordId — remove a user's stored Spotify authorization
router.delete('/users/:discordId', disconnectUser);

export default router;
