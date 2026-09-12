# ADR 0005 — Durable simulation boundary replay

**Status:** Accepted for the architecture spike; stable domain-event projection is the next refinement.

## Context

The persistence spike already guarantees command idempotency, ACK-after-commit, fencing, snapshots and ordered journal-tail recovery. The simulation spike separately proves deterministic clock/PRNG metadata and a finite water → crop → food slice.

Those two paths must meet before gameplay breadth grows. A deterministic simulation that only exists in process memory cannot satisfy restart/offline requirements, while a durable command journal that cannot reconstruct domain state is not enough to prove the world simulation survives process loss.

## Decision: commit simulation boundaries as durable world commands

The first integration step uses the existing transactional command envelope with the intent `simulation.boundary.commit`.

Each accepted boundary result contains:

- the complete post-boundary domain state for the spike;
- a stable `boundaryId` such as `hour:42`;
- the resulting `serverTick`.

Because the result is stored in the command receipt and the same command envelope is written to `event_outbox` in the same PostgreSQL transaction as the world revision, the boundary is either fully durable or absent. Retrying the same `commandId` returns the committed result without running the boundary handler or creating another event.

This is deliberately a transitional integration shape. It lets snapshot + journal recovery prove exact domain-state reconstruction before introducing a richer event-sourcing model.

## Decision: replay from snapshot plus simulation boundary tail

`replaySimulationState()` starts from the latest durable world snapshot and scans the ordered journal tail. It applies only `simulation.boundary.commit` entries and validates that every applied entry contains a non-empty boundary ID, a safe integer server tick and a state payload.

Malformed boundary entries fail replay instead of being guessed or silently skipped.

The reducer records applied boundary IDs and rejects a repeated boundary ID in the same replay tail. Command-level idempotency should already prevent this at write time; the replay assertion is a second diagnostic guard.

## What the integration test proves

The PostgreSQL integration test now verifies:

1. boundary 1 commits as world revision 1;
2. revision 1 can be snapshotted;
3. boundary 2 commits as world revision 2;
4. retrying boundary 2 with the same command ID returns the prior result and does not add another outbox event;
5. after actor/store restart, snapshot revision 1 plus the journal tail reconstructs the exact boundary-2 domain state;
6. malformed simulation boundary payloads are rejected by replay.

The test state includes server tick, PRNG state, upstream/downstream water quantities, downstream crop progress and food reserve so the recovery path is exercised with the same categories of state that the MVP causal chain needs.

## Why not call the command envelope the final domain-event format

Chronicle, replication and long-term replay should not depend on opaque transport commands forever. They need stable domain event types, cause IDs, locations/entities and versioned payload contracts.

The current envelope is kept only long enough to prove the transaction/recovery boundary. The next refinement should project committed simulation results into explicit domain events while retaining the same command receipt, fencing and revision guarantees.

## Follow-up gates

Tracked separately so they do not disappear inside issue #2:

- #14 durable simulation boundary event projection/replay;
- #15 timed ownership lease + heartbeat;
- #16 forced process-death durability test;
- #17 reconnect snapshot + delta replication;
- #18 settlement food reserve ledger;
- #19 deterministic weather + evaporation boundary.
