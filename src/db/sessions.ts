import type { SQLiteDatabase } from 'expo-sqlite';
import type { CategoryId } from '../categories';

export type Cue = { text: string; startMs: number; endMs: number };

export type Session = {
  id: string;
  createdAt: number;
  category: CategoryId;
  context: string | null;
  videoPath: string;
  burnedVideoPath: string | null;
  durationMs: number;
  exportedToPhotos: boolean;
  cues: Cue[];
  profileId: string | null;
};

export type SessionWithPrompts = Session & { prompts: string[] };

type SessionRow = {
  id: string;
  created_at: number;
  category: string;
  context: string | null;
  video_path: string;
  burned_video_path: string | null;
  duration_ms: number;
  exported_to_photos: number;
  cues_json: string | null;
  profile_id: string | null;
};

type PromptRow = { text: string };

function parseCues(json: string | null): Cue[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is Cue =>
          c &&
          typeof c === 'object' &&
          typeof c.text === 'string' &&
          typeof c.startMs === 'number' &&
          typeof c.endMs === 'number'
      )
      .map((c) => ({ text: c.text, startMs: c.startMs, endMs: c.endMs }));
  } catch {
    return [];
  }
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    createdAt: row.created_at,
    category: row.category as CategoryId,
    context: row.context,
    videoPath: row.video_path,
    burnedVideoPath: row.burned_video_path,
    durationMs: row.duration_ms,
    exportedToPhotos: row.exported_to_photos === 1,
    cues: parseCues(row.cues_json),
    profileId: row.profile_id,
  };
}

export function generateId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}

export async function listSessions(
  db: SQLiteDatabase,
  filter?: { profileId?: string | null }
): Promise<Session[]> {
  let rows: SessionRow[];
  if (filter && filter.profileId !== undefined) {
    if (filter.profileId === null) {
      rows = await db.getAllAsync<SessionRow>(
        `SELECT * FROM sessions WHERE profile_id IS NULL ORDER BY created_at DESC`
      );
    } else {
      rows = await db.getAllAsync<SessionRow>(
        `SELECT * FROM sessions WHERE profile_id = ? ORDER BY created_at DESC`,
        filter.profileId
      );
    }
  } else {
    rows = await db.getAllAsync<SessionRow>(
      `SELECT * FROM sessions ORDER BY created_at DESC`
    );
  }
  return rows.map(rowToSession);
}

export async function getSession(
  db: SQLiteDatabase,
  id: string
): Promise<SessionWithPrompts | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM sessions WHERE id = ?`,
    id
  );
  if (!row) return null;
  const prompts = await db.getAllAsync<PromptRow>(
    `SELECT text FROM prompts WHERE session_id = ? ORDER BY ordinal ASC`,
    id
  );
  return { ...rowToSession(row), prompts: prompts.map((p) => p.text) };
}

export async function createSession(
  db: SQLiteDatabase,
  input: {
    id?: string;
    category: CategoryId;
    context: string | null;
    videoPath: string;
    durationMs: number;
    prompts: string[];
    cues: Cue[];
    profileId: string | null;
  }
): Promise<string> {
  const id = input.id ?? generateId();
  const createdAt = Date.now();
  const cuesJson = input.cues.length > 0 ? JSON.stringify(input.cues) : null;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sessions
       (id, created_at, category, context, video_path, duration_ms, exported_to_photos, cues_json, profile_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      createdAt,
      input.category,
      input.context,
      input.videoPath,
      input.durationMs,
      cuesJson,
      input.profileId
    );
    for (let i = 0; i < input.prompts.length; i++) {
      await db.runAsync(
        `INSERT INTO prompts (id, session_id, ordinal, text) VALUES (?, ?, ?, ?)`,
        generateId(),
        id,
        i,
        input.prompts[i]
      );
    }
  });
  return id;
}

export async function setBurnedVideoPath(
  db: SQLiteDatabase,
  id: string,
  path: string | null
): Promise<void> {
  await db.runAsync(
    `UPDATE sessions SET burned_video_path = ? WHERE id = ?`,
    path,
    id
  );
}

export async function markExported(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE sessions SET exported_to_photos = 1 WHERE id = ?`,
    id
  );
}

export async function deleteSession(
  db: SQLiteDatabase,
  id: string
): Promise<{ videoPath: string; burnedVideoPath: string | null } | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT * FROM sessions WHERE id = ?`,
    id
  );
  if (!row) return null;
  await db.runAsync(`DELETE FROM sessions WHERE id = ?`, id);
  return {
    videoPath: row.video_path,
    burnedVideoPath: row.burned_video_path,
  };
}
