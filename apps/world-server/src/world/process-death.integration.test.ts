import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.DATABASE_URL ?? '';
const databaseSuite = databaseUrl ? describe : describe.skip;
const fixture = fileURLToPath(new URL('./fixtures/process-death-worker.mjs', import.meta.url));

function start(mode: string, world: string, command: string) {
  return fork(fixture, [mode, world, command], {
    execArgv: ['--import', 'tsx'],
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
}
function checkpoint(child: ChildProcess): Promise<any> {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const capture = (chunk: Buffer) => { stderr += chunk.toString(); };
    const cleanup = () => {
      clearTimeout(timer); child.off('message', message); child.off('exit', exit);
      child.off('error', error); child.stderr?.off('data', capture);
    };
    const message = (value: any) => {
      cleanup();
      if (value.phase === 'error') reject(new Error(value.message)); else resolve(value);
    };
    const exit = (code: number | null, signal: string | null) => {
      cleanup(); reject(new Error(`Child exited before checkpoint: ${code}/${signal}: ${stderr}`));
    };
    const error = (err: Error) => { cleanup(); reject(err); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Checkpoint timed out: ${stderr}`)); }, 15000);
    child.on('message', message); child.on('exit', exit); child.on('error', error);
    child.stderr?.on('data', capture);
  });
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGKILL');
  await exited;
}

databaseSuite('PostgreSQL process-death durability (#16)', () => {
  beforeAll(async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      for (const name of ['0000_bootstrap.sql', '0001_world_ownership_and_snapshots.sql']) {
        await pool.query(await readFile(new URL(`../../../../packages/db/drizzle/${name}`, import.meta.url), 'utf8'));
      }
    } finally { await pool.end(); }
  });

  for (const phase of ['before-commit', 'after-commit']) {
    it(`recovers after SIGKILL ${phase} without duplicate revision or event`, async () => {
      const world = `death-${randomUUID()}`, command = randomUUID();
      const pool = new Pool({ connectionString: databaseUrl });
      const children: ChildProcess[] = [];
      try {
        const child = start(phase, world, command); children.push(child);
        expect((await checkpoint(child)).phase).toBe(phase);
        await stop(child);
        expect(child.signalCode).toBe('SIGKILL');
        const committed = phase === 'after-commit' ? 1 : 0;
        const rows = await pool.query('SELECT revision FROM worlds WHERE id=$1', [world]);
        expect(Number(rows.rows[0].revision)).toBe(committed);
        const receipts = await pool.query('SELECT * FROM command_receipts WHERE scope=$1', [`world:${world}`]);
        const events = await pool.query('SELECT event_id FROM event_outbox WHERE world_id=$1', [world]);
        expect(receipts.rowCount).toBe(committed); expect(events.rowCount).toBe(committed);

        const restarted = start('recover', world, command); children.push(restarted);
        const recovered = await checkpoint(restarted);
        expect(recovered.phase).toBe('recovered');
        expect(recovered.before.snapshot).toMatchObject({ revision: 0, state: { stock: 0 } });
        expect(recovered.before.journal).toHaveLength(committed);
        expect(recovered.calls).toBe(1 - committed);
        expect(recovered.result).toEqual({ revision: 1, result: { stock: 1 }, duplicate: Boolean(committed) });
        expect(recovered.retry).toEqual({ revision: 1, result: { stock: 1 }, duplicate: true });
        expect(recovered.recovery.worldRevision).toBe(1);
        expect(recovered.recovery.journal).toHaveLength(1);
        expect(recovered.recovery.journal[0].payload.result).toEqual({ stock: 1 });
        const finalEvents = await pool.query('SELECT event_id FROM event_outbox WHERE world_id=$1', [world]);
        expect(finalEvents.rowCount).toBe(1);
        if (committed) expect(finalEvents.rows).toEqual(events.rows);
        const finalReceipts = await pool.query('SELECT * FROM command_receipts WHERE scope=$1', [`world:${world}`]);
        expect(finalReceipts.rowCount).toBe(1);
      } finally {
        await Promise.all(children.map(stop));
        await pool.query('DELETE FROM event_outbox WHERE world_id=$1', [world]);
        await pool.query('DELETE FROM command_receipts WHERE scope=$1', [`world:${world}`]);
        await pool.query('DELETE FROM world_snapshots WHERE world_id=$1', [world]);
        await pool.query('DELETE FROM worlds WHERE id=$1', [world]);
        await pool.end();
      }
    }, 45000);
  }
});
