# ADR 0003 — World recovery snapshots and fencing epochs

**Status:** Accepted for the architecture spike; timed leases and deterministic simulation state are still pending.

## Context

The persistence design requires an authoritative world actor, ordered durable state, restart recovery, and a clear failure mode when an actor loses ownership. A database transaction alone prevents simultaneous row updates, but it does not prevent an older process from continuing to issue valid-looking commands after a replacement process has started.

The same design also requires persistent simulation to resume from committed state rather than recomputing the entire history on every restart. The prototype therefore needs two separate primitives:

1. a monotonically increasing fencing epoch that makes stale writers detectable;
2. a snapshot plus ordered journal tail that can reconstruct committed state after restart.

## Decision: monotonic fencing epoch

Each `WorldActor.create()` acquires a new ownership epoch by atomically incrementing `worlds.fencing_token` and recording an `owner_id`.

Every mutating command carries the actor's fencing token. Inside the same PostgreSQL transaction used for command admission, the store locks the world row and verifies that the token still matches. A stale actor fails with `STALE_WORLD_OWNER` before its handler can mutate durable state. The final revision update also includes the fencing token in its `WHERE` clause as a second guard.

Snapshots use the same fencing check, so a superseded actor cannot publish a stale snapshot after another actor has taken ownership.

### Why a fencing token instead of only a process-local mutex

The process-local queue still serializes commands inside one actor, but it cannot coordinate two server processes. A monotonically increasing database token survives process death and gives every durable write an ownership epoch that PostgreSQL can validate.

### Why this is not yet called a complete lease system

The current spike intentionally allows a newly started actor to acquire the next epoch immediately. It proves stale-writer rejection, not liveness policy. Production ownership still needs a timed lease/heartbeat or equivalent orchestration rule so healthy actors are not replaced accidentally. The fencing token remains useful even after that lease policy is added.

## Decision: snapshot plus journal tail

`world_snapshots` stores immutable recovery points keyed by `(world_id, world_revision)` with the fencing token that produced the snapshot and a JSON state payload.

For the spike, `event_outbox` is also the ordered durable journal because each accepted command already writes one event in the same transaction as its revision and receipt. `loadRecoveryBundle()` loads the latest snapshot at or before the world's committed revision, then reads only events with revisions after the snapshot through the current world revision.

A snapshot can only be stored when:

- the actor still owns the current fencing epoch; and
- the requested snapshot revision exactly equals the current committed world revision.

This prevents an older in-memory state from being labeled as a newer durable revision.

### Why reuse the outbox as the first journal

The prototype already guarantees that an acknowledged mutation and its event commit atomically. Reusing that stream is enough to test replay ordering without adding a second write path. If later gameplay needs a richer event-sourcing model, Chronicle projection and recovery journal can be split after measurements show the requirement.

## What CI now proves

The PostgreSQL integration suite covers these recovery boundaries:

- duplicate command retry remains idempotent;
- a commit survives process/store recreation and an ACK-loss retry;
- command-ID reuse with a different request is rejected;
- handler failure rolls back revision, receipt and event together;
- two competing actors acquire different fencing epochs and the stale actor cannot write or snapshot;
- a world can restart from a snapshot and replay only the journal tail to the current committed revision.

## What remains unproven

This spike does **not** yet prove:

- timed lease renewal, expiry or graceful ownership handoff;
- persistence of simulation tick, PRNG state, scheduled work queues or macro-simulation watermark inside snapshots;
- byte-identical deterministic replay of the real water/food/NPC simulation;
- recovery after forcibly killing a process during a database operation rather than modeling the transaction boundary in tests;
- reconnect snapshot/delta transfer to clients;
- snapshot retention, compaction or journal pruning policy.

The next recovery gate should persist deterministic simulation metadata (`serverTick`, PRNG state and catch-up watermark) and verify continuous simulation against snapshot + replay + offline catch-up before broad gameplay systems are added.
