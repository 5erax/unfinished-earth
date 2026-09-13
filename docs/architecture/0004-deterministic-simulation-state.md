# ADR 0004 — Deterministic simulation state and offline watermark

**Status:** Accepted for the architecture spike; gameplay water/food rules are not implemented by this ADR.

## Context

The persistence spike can now store fenced snapshots and replay an ordered journal tail, but a persistent world is only recoverable if the simulation state itself is explicit. The Game Design Bible requires restart-safe persistent simulation, an original absence window that cannot be extended by worker restarts, and equivalent rules online and during catch-up.

The next foundation therefore needs a serializable deterministic state containing the minimum metadata required to resume the same discrete simulation sequence.

## Decision

`packages/sim` now defines a prototype deterministic state with:

- `simVersion`;
- `serverTick`;
- explicit 32-bit PRNG state;
- `absenceStartedAtRealSeconds`;
- `lastSimulatedAtRealSeconds`;
- `catchUpWatermarkRealSeconds`;
- an ordered queue of scheduled inputs;
- a synthetic accumulator used only to prove deterministic execution and recovery.

The prototype advances one discrete boundary per game hour. Because one game day is currently 30 real minutes, one game-hour boundary is 75 real seconds.

The PRNG is explicit xorshift32 state. It is intentionally small and inspectable for the spike. This is not a claim that xorshift32 is the final gameplay RNG; the important contract is that random state is explicit, serializable and advanced only by deterministic simulation code.

## Offline catch-up rule

Starting an absence records one immutable `absenceStartedAtRealSeconds`. Catch-up targets the earlier of:

- the requested real timestamp; or
- `absenceStartedAtRealSeconds + 72 real hours`.

Only whole game-hour boundaries are processed. The committed watermark advances with those boundaries. Repeating catch-up after a restart does not reset the original absence start and therefore cannot mint another 72-hour window.

The separate protected-homestead work-credit cap remains 8 real hours; this ADR does not merge the 8-hour production-credit rule with the 72-hour world-simulation rule.

## Deterministic equivalence gate

Tests now require:

1. same seed + same scheduled inputs => identical state and events;
2. continuous execution == JSON snapshot → restart → resume;
3. continuous execution == offline catch-up when both stop at the same discrete boundary;
4. repeated catch-up calls cannot extend the original 72-hour absence window;
5. PostgreSQL world snapshots preserve the deterministic simulation metadata fields across restart.

## Why use a synthetic accumulator first

The accumulator is a diagnostic reducer, not game design. It lets the project prove ordering, PRNG continuity, scheduled-input persistence and catch-up equivalence without coupling the recovery primitive to unfinished water/food/NPC formulas.

Once this foundation remains green, issue #3 can replace the diagnostic reducer with the first real `water → food → settlement reserve` chain while keeping the same deterministic state/replay contract.

## What remains unproven

This ADR does not yet prove:

- real water/food/NPC deterministic replay;
- journal events that encode simulation boundary results rather than command admissions;
- forced OS/process death during an in-flight database operation;
- timed lease/heartbeat ownership policy;
- reconnect snapshot/delta transfer;
- long-duration numerical drift or performance budgets.
