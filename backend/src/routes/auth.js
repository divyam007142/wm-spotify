'use strict';

/**
 * Spotify OAuth routes.
 *
 * GET /auth/spotify          → redirects user to Spotify authorise page
 * GET /auth/spotify/callback → handles the OAuth callback from Spotify
 */

import { Router } from 'express';
import { authorize, callback } from '../controllers/authController.js';

const router = Router();

router.get('/', authorize);
router.get('/callback', callback);

export default router;
