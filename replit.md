# Workspace

## Overview

Full-stack **Color Prediction Game** (WinGo-style) — a real-time betting game where users predict colors, numbers, and sizes.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Tailwind CSS, dark gaming theme)
- **Backend**: Express 5 + Socket.io
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Real-time**: Socket.io WebSockets
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express + Socket.io backend
│   └── color-prediction/   # React frontend (dark gaming UI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Game Features

- **3 Game Modes**: 30s, 1m, 3m — each runs independently
- **Bet Types**: Color (Red 2x, Green 2x, Violet 4.5x), Number 0-9 (9x), Size Big/Small (2x)
- **Server-side game engine**: setInterval timers that auto-resolve rounds and credit payouts
- **Real-time via Socket.io**: clients join a room per mode; timer and results broadcast instantly
- **Auth**: JWT stored in localStorage; custom-fetch.ts auto-attaches Bearer token
- **Wallet**: Each user starts with $1000 balance; bets deduct, wins credit back

## Database Schema

- `users` — id, username, password_hash, balance, created_at
- `game_results` — id, period_id, mode, result_number, result_color, result_size, created_at
- `bets` — id, user_id, period_id, mode, bet_type, bet_value, amount, status, payout, created_at

## API Routes

- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET /api/auth/me` — get current user (requires auth)
- `GET /api/game/state?mode=1m` — current timer state
- `GET /api/game/history?mode=1m` — past results
- `GET /api/game/stats` — aggregated stats
- `POST /api/bets` — place a bet (requires auth)
- `GET /api/bets` — user bet history
- `GET /api/bets/active` — pending bets
- `GET /api/wallet` — wallet balance + totals

## WebSocket Events

- Server → Client: `gameState` (timer tick), `gameResult` (round resolved)
- Client → Server: `joinMode` (subscribe to a game mode room)
- Socket path: `/ws/socket.io`

## Security

- JWT auth with 7d expiry
- bcrypt password hashing (10 rounds)
- Rate limiting: 200 req/min global, 30 req/min for /bets
- Betting closes 5 seconds before round end to prevent cheating
- Server-side timer — client can't manipulate timing
