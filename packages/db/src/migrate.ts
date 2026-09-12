import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";

const defaultDatabaseUrl =
  "postgresql://unfinished:unfinished@localhost:5432/unfinished_earth";

export async function migratePrototypeDatabase(
  databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl,
) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const sql = await readFile(
      new URL("../drizzle/0000_bootstrap.sql", import.meta.url),
      "utf8",
    );
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await migratePrototypeDatabase();
}
