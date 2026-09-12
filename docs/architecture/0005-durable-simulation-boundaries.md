# ADR 0005 — Durable simulation boundaries and domain-event projection

**Status:** Accepted for the architecture spike; wiring the real `packages/sim` reducer remains pending.

## Context

The persistence spike already guarantees command idempotency, ACK-after-commit, fencing, snapshots and ordered journal-tail recovery. The simulation spike separately proves deterministic clock/PRNG metadata and a finite water → crop → food slice.

Those two paths must meet before gameplay breadth grows. A deterministic simulation that only exists in process memory cannot satisfy restart/offline requirements, while a durable command journal that cannot reconstruct domain state is not enough to prove the world simulation survives process loss.

## Decision: commands may atomically project explicit domain events

`PostgresWorldStore.executeCommand()` accepts an optional domain-event projector. The command handler computes the accepted result, then the projector maps that result to one or more events with:

- a stable `eventType`;
- a JSON payload;
- explicit `causeIds`.

The projected events are validated before the durable revision is advanced. World revision, command receipt and every projected event are then written in the same PostgreSQL transaction.

If the handler or projector fails, the transaction rolls back. A duplicate retry with the same `commandId` returns the prior durable receipt before either the handler or projector is invoked, so it cannot project an event twice.

Commands that do not provide a projector retain the earlier command-envelope journal event for compatibility with the first persistence tests. New simulation work should prefer explicit domain-event projection.

## Decision: simulation boundary command and event are separate contracts

The command intent remains `simulation.boundary.commit`. Its durable projected event is `simulation.boundary.committed`.

For the current spike the event payload contains:

- the complete post-boundary domain state;
- a stable `boundaryId` such as `hour:42`;
- the resulting `serverTick`.

The full state payload is intentionally temporary. It proves exact snapshot + journal-tail reconstruction without requiring a second event-sourcing architecture. Once the actual domain reducer is wired through this path, later work can split coarse recovery events from smaller Chronicle/replication projections if measurements justify it.

## Decision: replay from snapshot plus explicit simulation event tail

`replaySimulationState()` starts from the latest durable world snapshot and scans the ordered journal tail. It applies only `simulation.boundary.committed` events and validates that every applied entry contains a non-empty boundary ID, a safe non-negative integer server tick and a state payload.

Malformed boundary events fail replay instead of being guessed or silently repaired. The reducer also records applied boundary IDs and rejects a repeated boundary ID in the replay tail. Command-level idempotency should already prevent this at write time; the replay assertion is a second diagnostic guard.

## What the integration tests prove

The PostgreSQL integration suite now verifies:

1. a projected simulation boundary commits with the world revision and command receipt;
2. a durable snapshot can be taken at boundary N;
3. boundary N+1 projects `simulation.boundary.committed` with explicit cause IDs;
4. retrying N+1 with the same command ID returns the prior result without invoking the projector or adding another event;
5. after actor/store restart, snapshot N plus the projected event tail reconstructs the exact N+1 domain state;
6. malformed simulation boundary events are rejected by replay;
7. a projector failure leaves revision, receipt and outbox unchanged.

The test state includes server tick, PRNG state, upstream/downstream water quantities, downstream crop progress and food reserve so the recovery path is exercised with the same categories of state that the MVP causal chain needs.

## Current boundary of proof

This ADR proves the durable **transport/recovery contract** for domain events. It does not yet prove that the production water/crop reducer from `packages/sim` is the code being executed inside `WorldActor`; the integration test currently uses a simulation-shaped prototype reducer in the server test package to avoid introducing a workspace dependency without updating the frozen lockfile.

Therefore the next gameplay-facing gate is to wire the real simulation package through the same command/projector path, then compare continuous execution with snapshot → restart → projected-event replay and offline catch-up using the actual water/crop state.

## Follow-up gates

Tracked separately so they do not disappear inside issue #2:

- #14 durable simulation boundary event projection/replay — this ADR implements the infrastructure portion;
- #15 timed ownership lease + heartbeat;
- #16 forced process-death durability test;
- #17 reconnect snapshot + delta replication;
- #18 settlement food reserve ledger;
- #19 deterministic weather + evaporation boundary.
