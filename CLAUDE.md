# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (custom server — do NOT use `next dev`)
npm run dev          # tsx watch server.ts (Next.js + Socket.IO on :3000)

# Production
npm run build        # next build
npm run start        # NODE_ENV=production tsx server.ts

# Lint
npm run lint         # eslint

# Tests (Vitest)
npm test             # run all tests
npm run test:ui      # Vitest browser UI
npm run test:coverage

# Run a single test file
npx vitest run src/__tests__/gameLogic.test.ts
```

If the dev server fails to start, remove the stale lock: `rm -f .next/dev/lock`.

## Architecture

### Custom Server

The app does **not** use `next dev`. `server.ts` creates a raw Node.js HTTP server that passes requests to Next.js while also mounting a Socket.IO server (`socket.io` v4). All real-time communication goes through Socket.IO — there are no Next.js API routes for game logic.

**This means Vercel is not compatible** — deploy to Railway or Render instead (persistent Node.js process required for in-memory room state).

### Three Layers

```
src/lib/          Pure game logic — no React, no I/O, fully immutable
src/server/       Node.js server-side: room management + Socket.IO handlers
src/components/   React UI — all interactive components are 'use client'
src/hooks/        React state wrappers (local vs online)
src/contexts/     SocketContext — provides typed Socket.IO client to the app
```

### Game Logic (`src/lib/`)

- **`types/game.types.ts`** — all shared types: `Card`, `Player`, `GameState`, `Combination`, `JokerMapping`
- **`models/Card.ts`**, **`models/Deck.ts`**, **`models/Combination.ts`** — pure model classes with static methods
- **`utils/gameLogic.ts`** — core engine: `initGame`, `startRound`, `drawFromDeck`, `drawFromDiscard`, `discardCard`, `meldCombinations`, `addToCombination`, `substituteJoker`, `claimDiscard`, `checkRoundEnd`, `checkGameEnd`, `nextTurn`. Every function takes a `GameState` and returns a new `GameState` (immutable).
- **`utils/validators.ts`** — `isValidForRound(round, combinations)` for round-objective validation
- **`utils/scoring.ts`** — `calculateRoundScores`

### Server Side (`src/server/`)

- **`GameRoomManager.ts`** — in-memory room store (`Map<roomCode, ServerGameRoom>`). Handles create/join/leave/start. Rooms auto-cleaned after 2 hours. On `startGame`, player IDs are remapped by **name** (not index) to handle shuffled player order.
- **`socketHandlers.ts`** — mounts all Socket.IO event handlers. Each game action calls the pure `gameLogic` functions, updates room state via `roomManager.updateGameState`, then broadcasts `gameStateUpdate` (public state, no hands) to the room and `privateHandUpdate` to each player's socket individually.
- **`types.ts`** — typed Socket.IO events (`ClientToServerEvents`, `ServerToClientEvents`) and `PublicGameState` (hands stripped out, only `handCount` exposed).

### Client Side

- **`SocketContext.tsx`** — creates and provides a typed `socket.io-client` instance to the whole app
- **`useOnlineGameState.ts`** — primary hook; listens to Socket.IO server events and exposes action callbacks that emit to the server. This is what `page.tsx` uses.
- **`useGameState.ts`** — local hot-seat hook that runs the pure game logic entirely in-browser (no server). Not currently wired to `page.tsx` but kept for reference/future use.
- **`GameTable.tsx`** — main game orchestrator component; receives all state and callbacks as props, coordinates all modal states

### State Flow (Online Mode)

```
User action → useOnlineGameState (emits socket event)
           → socketHandlers.ts (runs pure gameLogic, updates room)
           → broadcasts gameStateUpdate + privateHandUpdate
           → useOnlineGameState updates local state
           → React re-renders
```

## Game Rules

- 4 rounds, 10 cards dealt per player, lowest total score wins (A=1, 2–10=face value, J/Q/K=10)
- **Round objectives** (must meld exactly these before discarding):
  - R1: 1 trio + 1 sequence
  - R2: 3 trios
  - R3: 2 sequences
  - R4: 2 trios + 1 sequence
- **Trio**: 3+ cards of the same value; **Sequence**: 4+ consecutive cards of the same suit (ace only goes low)
- Jokers can fill gaps in sequences and can be substituted later by the real card
- After melding, players can add cards to any melded combination on the table
- **Player order**: randomized at `initGame` (Fisher-Yates), fixed for all rounds. Each round the starting player rotates: round N starts at index `(N-1) % playerCount`.
- **"La quiero" mechanic** (3+ players): when the current player draws from the deck, other players may press "¡La quiero!" to claim the top discard card. When the current player discards, the eligible claimant closest in turn order receives the claimed card + 1 penalty card from the deck, and their next turn is skipped. Implemented via `pendingClaimCard`, `pendingClaimants`, `pendingSkipPlayerId` on `GameState`.

## Key UI Components

- **`GameHeader`** — shows round number, objective, and exit button (no scores)
- **`PlayerInfo`** — shows all players in turn order with numbered badge; labels the local player as "Yo"; no score display (scores shown only in end-of-round/game modals)
- **`MeldedCombinations`** — drag-and-drop target for adding cards; for joker drops on a sequence, shows left/right visual indicator to choose `start` or `end` position
- **`AddToCombinationModal`** — for joker + sequence: shows two clickable targets (◀ 3♥ / 8♥ ▶) to choose extension direction
- **`Input`** (ui) — always includes `text-gray-900` and `placeholder:text-gray-400` for readable text

## Tailwind / CSS

Tailwind v4 is used with `@theme inline` in `globals.css` — there is no `tailwind.config.ts`. Custom colors (`poker-green`, `card-red`, `card-black`) and utility classes (`.no-select`, `.animate-bounce-subtle`, `.cards-scroll`) are defined directly in `globals.css`.

## TypeScript Path Aliases

`@/` maps to `src/` (configured in both `tsconfig.json` and `vitest.config.mts`).
