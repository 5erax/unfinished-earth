import { Pool } from 'pg';
import { PostgresWorldStore } from '../postgres-world-store.ts';
import { WorldActor } from '../world-actor.ts';

const [mode, worldId, commandId] = process.argv.slice(2);
const send = message => new Promise((resolve, reject) => process.send(message, error => error ? reject(error) : resolve()));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
let armed = false;
// Test-only interception around the real SQL COMMIT. No production hooks/mocks.
pool.on('connect', client => {
  const query = client.query.bind(client);
  client.query = async (...args) => {
    if (armed && args[0] === 'COMMIT') {
      if (mode === 'before-commit') {
        await send({ phase: mode });
        await new Promise(() => {});
      }
      const result = await query(...args);
      if (mode === 'after-commit') {
        await send({ phase: mode });
        await new Promise(() => {});
      }
      return result;
    }
    return query(...args);
  };
});
const store = new PostgresWorldStore(pool);
try {
  const actor = await WorldActor.create(worldId, store);
  const command = { commandId, intent: 'inventory.increment', payload: { amount: 1 } };
  if (mode !== 'recover') {
    await actor.saveSnapshot({ stock: 0 });
    armed = true;
    await actor.execute(command, () => ({ stock: 1 }));
    throw Error('Crash checkpoint was not reached');
  }
  const before = await store.loadRecoveryBundle(worldId);
  let stock = before.snapshot?.state.stock ?? 0;
  for (const event of before.journal) stock = event.payload.result.stock;
  let calls = 0;
  const result = await actor.execute(command, ({ amount }) => {
    calls++;
    return { stock: stock + amount };
  });
  const retry = await actor.execute(command, () => { throw Error('Duplicate invoked reducer'); });
  const recovery = await store.loadRecoveryBundle(worldId);
  await store.close();
  await send({ phase: 'recovered', before, result, retry, calls, recovery });
  process.disconnect();
} catch (error) {
  await send({ phase: 'error', message: String(error.stack || error) });
  await store.close();
  process.exitCode = 1;
  process.disconnect();
}
