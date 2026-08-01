'use strict';

/**
 * Root router — mounts all sub-routers.
 */

import { Router } from 'express';
import authRouter from './auth.js';
import apiRouter from './api.js';
import { authorize, callback } from '../controllers/authController.js';

const router = Router();

// Health check (unauthenticated)
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Spotify OAuth flow
router.use('/auth/spotify', authRouter);
router.get('/authorize', authorize);
router.get('/callback', callback);

// Bot-facing REST API
router.use('/api', apiRouter);

export default router;
