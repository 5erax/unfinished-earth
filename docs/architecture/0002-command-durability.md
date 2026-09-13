# ADR 0002 — Durable command admission for the prototype world actor

**Status:** Accepted for the architecture spike; snapshot/journal recovery is still pending.

## Context

The Game Design Bible requires an authoritative writer, durable acknowledgement, command deduplication, restart safety and an auditable event trail. The prototype therefore needs to prove that a client retry cannot spend or mutate state twice before broader gameplay systems are added.

## Decision

For the first persistence spike, every mutating command carries a client-generated `commandId`, an intent and a JSON payload. The server computes a request hash and executes the command inside one PostgreSQL transaction.

The transaction order is:

1. ensure the world row exists;
2. lock that world's row with `SELECT ... FOR UPDATE`;
3. look up the `(scope, commandId)` receipt;
4. return the stored result when the request hash matches;
5. reject the command ID when the hash differs;
6. execute the mutation handler;
7. increment the world revision;
8. persist the command receipt and one outbox event;
9. commit;
10. only then return the accepted result to the caller.

A handler exception rolls back the revision, receipt and outbox event together.

## Why PostgreSQL row locking instead of only an in-memory mutex

`WorldActor` still serializes commands inside one process, which keeps simulation code simple. The database row lock adds a second boundary that serializes durable commits for the same world if two server processes temporarily overlap during a restart or deployment. It does **not** yet solve ownership/fencing for long-lived in-memory simulation; fencing-token acquisition remains a later spike requirement.

## Why persist a receipt instead of only remembering recent command IDs in memory

An in-memory dedupe cache disappears on process restart, exactly when clients are most likely to retry after losing an acknowledgement. A durable receipt lets a restarted actor return the original result and revision without running the handler again.

## Why store an outbox event in the same transaction

The Chronicle and downstream projections must not observe an event for a mutation that later rolls back, and an acknowledged mutation must not disappear from the event stream. Writing the outbox row in the same transaction establishes that atomic boundary while keeping publication/projection asynchronous.

## What this proves now

CI runs PostgreSQL 18 and verifies four integration cases:

- same `commandId` + same request returns one durable result with one revision and one event;
- an acknowledged command survives closing and recreating the store/actor;
- same `commandId` + different request is rejected;
- a failing handler leaves revision, receipt and outbox unchanged.

## What remains unproven

This ADR does not yet prove:

- snapshot creation and journal replay after a real process crash;
- fencing-token ownership across competing world-actor processes;
- deterministic recovery of simulation PRNG/tick state;
- reconnect snapshot/delta protocol;
- performance under 8-player AOI load.

Issue #2 remains open until those recovery and ownership gates are measured.
