# ADR 0001 — Prototype technology stack

**Status:** Accepted for architecture spike; **not locked for 1.0**.

The Game Design Bible requires the prototype to prove persistence, bounded offline catch-up, one authoritative writer, transactional inventory/economy, WebSocket sessions, a browser 3D client, and the causal slice `building → water/road → food → NPC decision → Chronicle`. This ADR chooses the smallest stack that can test those requirements while keeping the simulation independent from presentation.

## Runtime and workspace: Node.js 24 LTS + TypeScript 7 + pnpm workspaces

**Why:** client, server, protocol and deterministic simulation can share one language and type model. Node 24 is LTS while the newer Node line is Current, so the spike favors the supported baseline over novelty. pnpm gives a lightweight workspace and strict dependency boundaries without adding another orchestration layer.

**Why not npm/Yarn:** both could work; neither gives enough benefit to justify changing the workspace choice after pnpm is selected.  
**Why not Turborepo/Nx yet:** four small packages do not need a build graph daemon or project framework. Add one only when CI measurements show the workspace scripts are becoming a bottleneck.

## Browser client: Vite + React DOM + direct Three.js WebGLRenderer

**Why:** Vite keeps the browser spike close to the platform. React is used for HTML HUD, menus and accessibility, while Three.js owns the 3D scene directly. That separation matches the Bible's requirement that menus/inventory/journal be accessible HTML while the world remains a 3D canvas. WebGLRenderer is the conservative renderer for the first measurement gate.

**Why not Next.js:** the prototype's hard problem is a persistent realtime world, not SSR/SEO or server-rendered pages. A full-stack web framework would blur the boundary between disposable web delivery and the authoritative world process.  
**Why not react-three-fiber initially:** it is productive, but it adds a React reconciliation layer to the exact rendering path we need to benchmark. Start with direct Three.js; adopt a renderer abstraction later if profiling says the added layer is acceptable.  
**Why not WebGPU-first:** Three.js still treats WebGPU rendering as an evolving path, while the documented prototype specifically needs a broad desktop-browser capability check. WebGL 2 is a clearer baseline for the first spike.  
**Why not Unity/Godot:** exporting a separate engine runtime would reduce direct control over the browser/HTML accessibility boundary and diverge from the Bible's web-first TypeScript architecture proposal before that proposal has been disproved.

## Authoritative server: Fastify + `@fastify/websocket`

**Why:** the Bible wants a long-lived, single-writer world actor, explicit command admission and a simple gateway—not a large application framework. Fastify supplies a small HTTP/WebSocket shell, schema-friendly request handling and low ceremony. The world actor is project code and remains framework-independent.

**Why not Express:** it is viable but provides less structure for schema-driven validation and modern TypeScript out of the box.  
**Why not NestJS:** dependency injection/modules are useful in large business applications, but would add architecture before the simulation boundaries are measured.  
**Why not Socket.IO:** the protocol needs explicit revisions, command IDs, snapshots and deltas. Raw WebSocket keeps that contract visible and avoids a second event/transport semantics layer.  
**Why not microservices/Kubernetes:** the Bible explicitly starts with one world actor and one database. Distribution is a response to measured load, not a prerequisite.

## State: PostgreSQL 18 + `pg` + Drizzle ORM stable

**Why:** inventory, ownership, receipts, fencing tokens, journal/outbox rows and snapshot manifests need transactions, unique constraints and recovery semantics. PostgreSQL fits those invariants directly. `pg` keeps database behavior visible; Drizzle provides typed schema/migrations without hiding SQL transaction boundaries.

**Why not SQLite:** excellent for local/single-process software, but the architecture spike specifically needs concurrent sessions, fencing and a server-owned durable state boundary that should resemble deployment.  
**Why not MongoDB:** document storage is not the hard requirement; multi-record invariants and ledger-like transactions are.  
**Why not Prisma:** strong application ORM, but its higher-level data model is less useful here than keeping SQL/revision/locking behavior explicit.  
**Why not raw SQL only:** possible, but typed schema/migrations reduce accidental drift while still allowing explicit `pg` transactions where invariants matter.  
**Why stable Drizzle instead of the 1.0 RC:** the spike does not need release-candidate churn.

## Wire validation: JSON + Zod

**Why:** protocol fields are still changing during the spike. JSON is easy to inspect in traces and Zod provides runtime validation at the trust boundary.

**Why not Protobuf/FlatBuffers yet:** binary schemas become valuable only after bandwidth/CPU measurements show JSON is a real bottleneck. Premature binary encoding would slow iteration and debugging.

## Tests: Vitest now, Playwright when interaction flows exist

**Why:** deterministic simulation rules need fast unit/property-style tests immediately. Browser E2E becomes valuable once the first interactive build exists.

**Why not Jest/Cypress:** both can work; Vitest aligns with the Vite/ESM toolchain and Playwright gives multi-browser automation when the prototype reaches that gate.

## Deployment boundary

Vercel is suitable for the static/client build and later stateless web endpoints. The authoritative world actor should **not** initially live in a request-scoped/serverless function: the prototype requires one writer with in-memory scheduling, durable fencing and long-lived realtime connections. We will select long-lived compute only after the actor spike proves its runtime and resource profile.

## Review gate

Revisit this ADR after issues #1 and #2 produce measurements for:

- browser compatibility and frame time on the reference integrated GPU,
- server tick/queue behavior,
- reconnect and command dedupe,
- PostgreSQL recovery and transaction behavior,
- memory/CPU profile of one active world.

A stack decision becomes “locked” only after these measurements; until then it is an intentionally testable hypothesis.
