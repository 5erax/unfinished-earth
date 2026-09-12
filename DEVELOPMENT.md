# Development

This repository now contains the architecture-spike scaffold for **The Unfinished Earth**. It is not yet a playable build.

## Requirements

- Node.js 24 LTS
- pnpm 12.3.4
- Docker with Compose support
- A browser with WebGL 2 support

## First setup

```bash
corepack enable
pnpm install
docker compose up -d postgres
cp .env.example .env
```

The first registry-enabled install should generate `pnpm-lock.yaml`. Commit that lockfile once generated and then switch CI to `pnpm install --frozen-lockfile`.

## Run the spikes

```bash
pnpm dev:server
pnpm dev:client
```

The client defaults to Vite's local URL. The world server listens on `127.0.0.1:8787` unless overridden.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Scope rule

The prototype must first prove the documented causal chain:

`building -> water/road -> food -> NPC decision -> Chronicle`

Do not add breadth merely because the framework makes it easy. Every new system should map to a Game Design Bible acceptance gate or a measured technical risk.
