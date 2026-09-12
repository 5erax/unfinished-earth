CREATE TABLE IF NOT EXISTS cloud_worlds (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, state TEXT NOT NULL, stamp TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cloud_receipts (player TEXT NOT NULL, id TEXT NOT NULL, status INTEGER NOT NULL, payload TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(player,id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cloud_sessions (token TEXT PRIMARY KEY, player TEXT NOT NULL, expires INTEGER NOT NULL);
