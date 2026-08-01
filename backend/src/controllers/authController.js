'use strict';

/**
 * Handles the Spotify OAuth flow.
 * authorize() → redirects to Spotify
 * callback()  → exchanges code for tokens and stores the Spotify profile
 */

import crypto from 'node:crypto';
import {
  exchangeAuthorizationCode,
  getAuthorizationUrl,
  getSpotifyProfile,
  invalidatePlaybackCache,
} from '../services/spotifyService.js';
import {
  getSpotifyUserByDiscordId,
  selectAvailableSpotifyApp,
  upsertSpotifyUserByDiscordId,
} from '../services/spotifyUserService.js';
import { invalidateAccessTokenCache } from '../services/tokenService.js';
import { getSpotifyApp } from '../config/spotifyApps.js';

export async function authorize(req, res, next) {
  try {
    const discordId = String(req.query.discord_id || '');
    if (!discordId) return res.status(400).json({ error: 'discord_id is required' });

    // Returning users must keep authorizing through the same Spotify app
    // that issued their existing refresh token — switching apps here would
    // silently orphan it. New users get routed to whichever configured app
    // still has tester capacity.
    const existingUser = await getSpotifyUserByDiscordId(discordId);
    const app = existingUser?.spotifyAppId
      ? getSpotifyApp(existingUser.spotifyAppId)
      : await selectAvailableSpotifyApp();

    if (!app) {
      return res.status(503).json({
        error: 'All Spotify applications are at tester capacity right now. Please contact support.',
      });
    }

    console.log(
      `[auth] Selecting ${app.id} for Discord user ${discordId}; redirect=${app.redirectUri}`
    );

    const state = Buffer.from(
      JSON.stringify({ discordId, appId: app.id, nonce: crypto.randomUUID() })
    ).toString('base64url');
    res.redirect(getAuthorizationUrl(state, app));
  } catch (err) {
    next(err);
  }
}

export async function callback(req, res, next) {
  try {
    if (req.query.error) return res.status(400).json({ error: req.query.error });
    if (!req.query.code || !req.query.state) {
      return res.status(400).json({ error: 'code and state are required' });
    }
    let state;
    try {
      state = JSON.parse(Buffer.from(req.query.state, 'base64url').toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }
    if (!state.discordId || !state.appId) {
      return res.status(400).json({ error: 'Invalid OAuth state' });
    }

    let app;
    try {
      app = getSpotifyApp(state.appId);
    } catch {
      return res.status(400).json({
        error: 'The Spotify application used for this authorization is no longer configured.',
      });
    }

    const tokens = await exchangeAuthorizationCode(req.query.code, app);
    const profile = await getSpotifyProfile(tokens.access_token);
    const user = await upsertSpotifyUserByDiscordId(state.discordId, {
      spotifyId: profile.id,
      spotifyAppId: app.id,
      spotifyEmail: profile.email || null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      metadata: { displayName: profile.display_name || null, product: profile.product || null },
    });
    // A fresh authorization invalidates any stale cached token/playback state
    // (e.g. re-linking a different Spotify account to the same Discord user).
    invalidateAccessTokenCache(state.discordId);
    invalidatePlaybackCache(state.discordId);
    res.status(200).send(renderVerificationPage(user, profile));
  } catch (err) {
    console.error(
      '[auth] Spotify OAuth failed:',
      err.response?.data || err.message
    );
    if (err.response?.data) err.status = 502;
    next(err);
  }
}

/**
 * Renders the page shown to the user in their browser right after Spotify
 * redirects back. The app is in Spotify developer mode, so access is
 * restricted to users the developer has explicitly allow-listed — this
 * tells the user what to do next.
 */
function renderVerificationPage(user, profile) {
  const email = profile.email || null;
  const displayName = profile.display_name || profile.id || 'Spotify account';
  const escape = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Spotify connected</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #121212; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .card { max-width: 420px; margin: 24px; padding: 32px; border-radius: 16px; background: #181818;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4); text-align: center; }
  h1 { font-size: 20px; margin: 0 0 12px; color: #1db954; }
  p { line-height: 1.5; color: #d9d9d9; font-size: 15px; }
  .account { padding: 14px; margin: 18px 0; border: 1px solid #2f2f2f; border-radius: 10px; }
  .account strong { display: block; color: #fff; font-size: 17px; margin-bottom: 5px; }
  a { display: inline-block; margin-top: 12px; padding: 11px 16px; border-radius: 999px; background: #1db954; color: #000; text-decoration: none; font-weight: 700; }
  .note { margin-top: 16px; padding: 12px 16px; background: #1e1e1e; border-radius: 8px; font-size: 13px; color: #b3b3b3; }
</style>
</head>
<body>
  <div class="card">
    <h1>Spotify connected</h1>
    <p>Your Spotify account is linked successfully.</p>
    <div class="account">
      <strong>${escape(displayName)}</strong>
      ${email ? `<span>${escape(email)}</span>` : ''}
    </div>
    <p>Discord user: <strong>${escape(user.discordId)}</strong></p>
    <a href="/authorize?discord_id=${encodeURIComponent(user.discordId)}">Change Spotify account</a>
    <div class="note">To use another Spotify account, click “Change Spotify account” and authorize it.</div>
  </div>
</body>
</html>`;
}
