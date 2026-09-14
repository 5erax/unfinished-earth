# PostgreSQL process-death acceptance (#16)

The world-server integration suite launches a separate Node process using the real
`WorldActor`, `PostgresWorldStore` and PostgreSQL connection. Each scenario uses a
unique world and command ID and deletes only its own rows afterward.

The test fixture intercepts the connection's COMMIT call, not the reducer or
storage implementation. An IPC checkpoint stops execution at a known boundary:

- Before COMMIT: the revision, receipt and outbox inserts have executed inside the
  transaction. The parent sends SIGKILL and waits for process termination. A new
  connection must see revision zero, no receipt and no event.
- After COMMIT, before the actor returns its result: the parent sends SIGKILL.
  A new connection must see revision one, one receipt and one event.

A replacement process acquires a new fencing epoch, loads the revision-zero
snapshot plus journal tail, and retries the original command. Pre-commit recovery
runs the handler once; post-commit recovery must not run it. A further duplicate
retry must not invoke the handler in either case. The final snapshot/journal
recovery yields stock one at revision one, with exactly one receipt/event. The
post-commit event ID must remain unchanged.

Run with a dedicated migrated PostgreSQL database:

```sh
pnpm --filter @unfinished-earth/world-server test
```

Set `DATABASE_URL` for that test database. Without it, PostgreSQL integration
suites are explicitly skipped. Repository CI supplies PostgreSQL 18, applies
migrations, and runs this suite through `pnpm test:workspace` together with frozen
installation, type checking and builds. Checkpoint and test timeouts bound failures;
all spawned children are terminated during cleanup.

This gate tests abrupt application-process termination. It does not simulate
PostgreSQL host/power loss, storage hardware failure, production simulation
integration (#20), or lease availability policy (#15). It changes no game UI.
