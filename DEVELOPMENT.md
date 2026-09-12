# Development

This repository contains the architecture-spike scaffold for **The Unfinished Earth**. It is not yet a playable build.

## Requirements

- Node.js 24 LTS
- pnpm 12.3.4
- Docker with Compose support
- A browser with WebGL 2 support

## First setup

```bash
corepack enable
pnpm install --frozen-lockfile
docker compose up -d postgres
cp .env.example .env
pnpm db:migrate
```

The lockfile is committed and CI uses `pnpm install --frozen-lockfile`. pnpm build scripts remain allow-listed narrowly; the current release-age exception is pinned to one reviewed `@types/three` version instead of disabling the supply-chain policy globally.

## Run the spikes

```bash
pnpm dev:server
pnpm dev:client
```

The client defaults to Vite's local URL. The world server listens on `127.0.0.1:8787` unless overridden.

The current WebSocket persistence spike accepts a `spike-write` message with a client-generated `commandId`. Retrying the same command ID with the same request returns the committed receipt; reusing it with a different request is rejected.

## Verification

With PostgreSQL running and `DATABASE_URL` set:

```bash
pnpm db:migrate
pnpm typecheck
pnpm test
pnpm build
```

CI starts PostgreSQL 18, applies the bootstrap migration, then runs the same typecheck/test/build gates. The world-server integration suite currently verifies:

- retrying one command does not create a second revision, receipt, or outbox event;
- an acknowledged command survives a store/actor restart;
- reusing a command ID with a different request is rejected;
- handler failure rolls back revision, receipt, and outbox writes together.

## Scope rule

The prototype must first prove the documented causal chain:

`building -> water/road -> food -> NPC decision -> Chronicle`

Do not add breadth merely because the framework makes it easy. Every new system should map to a Game Design Bible acceptance gate or a measured technical risk.
