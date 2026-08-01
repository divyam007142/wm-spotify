# spotify-wm — Backend

Express.js service responsible for Spotify OAuth, token lifecycle management, MongoDB persistence, and REST API endpoints consumed by the Discord bot.

## Responsibilities

- Spotify OAuth 2.0 authorization flow (authorize + callback)
- Access & refresh token storage and automatic refresh
- MongoDB models and data persistence
- REST API endpoints (called by the Discord bot over HTTP)
- Session management and security middleware

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 4 |
| Database | MongoDB via Mongoose |
| Auth | Spotify OAuth 2.0 (manual flow with Axios) |
| Sessions | express-session |
| Security | helmet, cors |
| Logging | morgan |

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Entry point — boots Express + connects MongoDB
│   ├── config/
│   │   ├── index.js          # Validates and exports env vars
│   │   ├── db.js             # Mongoose connection setup
│   │   └── spotify.js        # Spotify OAuth constants and URLs
│   ├── models/
│   │   └── .gitkeep          # Mongoose models live here (e.g. User, Token)
│   ├── routes/
│   │   ├── index.js          # Mounts all routers
│   │   ├── auth.js           # GET /auth/spotify, GET /auth/spotify/callback
│   │   └── api.js            # REST endpoints for the bot (GET /api/*)
│   ├── controllers/
│   │   ├── authController.js # OAuth flow handlers
│   │   └── apiController.js  # API response handlers
│   ├── services/
│   │   ├── spotifyService.js # Spotify API calls, token refresh logic
│   │   └── tokenService.js   # Token storage/retrieval from MongoDB
│   └── middleware/
│       ├── errorHandler.js   # Centralised error handler
│       └── requestLogger.js  # Morgan logger setup
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

1. Copy `.env.example` to `.env` and fill in all values.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start in development mode:
   ```sh
   npm run dev
   ```

## Environment Variables

See [`.env.example`](./.env.example) for the full reference.

## API Contract

All bot-facing endpoints are mounted at `/api`. The Discord bot authenticates requests using a shared internal secret (configure via `INTERNAL_API_SECRET` once implemented).
