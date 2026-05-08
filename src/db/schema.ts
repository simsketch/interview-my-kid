import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'interviews.db';

const TARGET_VERSION = 2;

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const current = row?.user_version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL,
        category TEXT NOT NULL,
        context TEXT,
        video_path TEXT NOT NULL,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        exported_to_photos INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

      CREATE TABLE IF NOT EXISTS prompts (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_prompts_session ON prompts(session_id, ordinal);
    `);
  }

  if (current < 2) {
    await tryAddColumn(db, 'sessions', 'burned_video_path', 'TEXT');
    await tryAddColumn(db, 'sessions', 'cues_json', 'TEXT');
  }

  if (current < TARGET_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
  }
}

async function tryAddColumn(
  db: SQLiteDatabase,
  table: string,
  column: string,
  type: string
): Promise<void> {
  try {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/duplicate column name/i.test(msg)) {
      throw err;
    }
  }
}
