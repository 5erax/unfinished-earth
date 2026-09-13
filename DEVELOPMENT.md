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

The committed `pnpm-lock.yaml` is the dependency source of truth for the spike. pnpm supply-chain policy checks remain enabled; do not regenerate the lockfile casually or disable those checks globally.

## Run the spikes

```bash
pnpm dev:server
pnpm dev:client
```

The client defaults to Vite's local URL. The world server listens on `127.0.0.1:8787` unless overridden.

The first world-server process that starts acquires an ownership epoch (`fencingToken`). Starting another actor for the same world advances that epoch; the older actor becomes a stale writer and PostgreSQL rejects its mutations and snapshots.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

CI additionally starts PostgreSQL 18 and runs the prototype migrations before typecheck/tests/build. The world-server integration suite currently verifies command dedupe, ACK-loss retry after restart, rollback, fencing of competing actors, and snapshot + journal-tail recovery.

## Persistence spike boundaries

The current recovery path stores explicit `world_snapshots` and reuses the transactional `event_outbox` as the first ordered journal. This proves a recovery primitive, not a complete production lease or simulation save format.

Still intentionally pending:

- timed lease/heartbeat and graceful ownership handoff;
- deterministic persistence of simulation tick, PRNG state and catch-up watermark;
- reconnect snapshot/delta transfer;
- forced-process-kill recovery testing;
- snapshot compaction/retention policy.

See `docs/architecture/0002-command-durability.md` and `docs/architecture/0003-world-recovery-and-fencing.md` before changing these invariants.

## Scope rule

The prototype must first prove the documented causal chain:

`building -> water/road -> food -> NPC decision -> Chronicle`

Do not add breadth merely because the framework makes it easy. Every new system should map to a Game Design Bible acceptance gate or a measured technical risk.
