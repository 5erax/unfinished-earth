# The Unfinished Earth

**A browser co-op sandbox in which ecology, communities and history evolve together.**

[Tiếng Việt](README.md) · [Design documents](docs/README.md)

## Concept

Set roughly 300 years after civilization collapsed, The Unfinished Earth puts each player in control of one character within a persistent world. Exploration, construction and logistics connect ecological change with NPC livelihoods. A road, cleared forest or irrigation project can shape a community and leave a record in world history.

The working target is solo play and 1–8-player co-op PvE in private worlds. Combat supports the experience; the central activity is understanding and changing interconnected systems.

## Current status

**Playable technical prototype 0.1 on this branch. The complete MVP and performance gates are not yet met.**

Run with Node.js 24+: `npm ci`, then `npm start`, and open `http://127.0.0.1:3000`. The prototype includes orthographic 3D greybox movement, gathering, bridge repair, irrigation, harvests, logistics, 24 persistent named NPCs, causal events, and a SQLite-backed authoritative Node server.

The default prototype clock runs at ×30 (one real minute per game day); use `SIM_SPEED=1` for design timing. Save data lives in `data/world.sqlite`. Run `npm test` for simulation and HTTP integration checks. See [implementation, deployment and remaining gates](docs/06-playable-prototype.md). No hosted deployment or browser visual QA has been verified in this delivery.

Game Design Bible v0.1 now covers 117 sections, 20 emergent scenarios, explicit system contracts, a bounded MVP, technical risks and validation criteria. Capacity, schedules and performance figures remain unvalidated design targets.

The repository and its initial READMEs were published before detailed design authoring began. Vietnamese is the primary language of the full Bible.

## Design direction

- Persistent state and a chronicle of consequential events.
- Construction that changes water, resources, livelihoods and relationships.
- Simulation at different levels of detail for NPCs, wildlife and distant regions.
- Protection for absent players and strictly bounded offline production.
- A small prototype proving causal interactions before expanding content.

Persistent does not mean simulating every individual continuously. Server authority, regional updates and bounded catch-up will be considered. Infinite content, an infinite map and perpetual hosting are not promises of this project.

## Repository

Vietnamese is the primary design language. Start with [the documentation index](docs/README.md). See [contribution guidance](CONTRIBUTING.md) and [the change log](CHANGELOG.md).

No redistribution license has been selected.
