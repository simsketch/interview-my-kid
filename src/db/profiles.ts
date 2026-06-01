import type { SQLiteDatabase } from 'expo-sqlite';

export type Profile = {
  id: string;
  name: string;
  emoji: string | null;
  photoPath: string | null;
  targetAge: number | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

type ProfileRow = {
  id: string;
  name: string;
  emoji: string | null;
  photo_path: string | null;
  target_age: number | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
};

const DEFAULT_EMOJI = '🧒';

export const EMOJI_CHOICES = [
  '👧',
  '👦',
  '🧒',
  '👶',
  '🦄',
  '🐯',
  '🐶',
  '🐱',
  '🐼',
  '⚽',
  '🎨',
  '📚',
  '🎸',
  '🚀',
  '⭐',
  '🌈',
];

function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    photoPath: r.photo_path,
    targetAge: r.target_age,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function generateId(): string {
  return `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function listProfiles(db: SQLiteDatabase): Promise<Profile[]> {
  const rows = await db.getAllAsync<ProfileRow>(
    `SELECT * FROM profiles ORDER BY sort_order ASC, created_at ASC`
  );
  return rows.map(rowToProfile);
}

export async function getProfile(
  db: SQLiteDatabase,
  id: string
): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT * FROM profiles WHERE id = ?`,
    id
  );
  return row ? rowToProfile(row) : null;
}

export async function createProfile(
  db: SQLiteDatabase,
  input: {
    name: string;
    emoji?: string | null;
    photoPath?: string | null;
    targetAge?: number | null;
  }
): Promise<Profile> {
  const id = generateId();
  const now = Date.now();
  const lastSort = await db.getFirstAsync<{ m: number | null }>(
    `SELECT MAX(sort_order) as m FROM profiles`
  );
  const sortOrder = (lastSort?.m ?? -1) + 1;
  const name = input.name.trim();
  if (!name) throw new Error('Profile name is required');
  await db.runAsync(
    `INSERT INTO profiles (id, name, emoji, photo_path, target_age, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    input.emoji ?? DEFAULT_EMOJI,
    input.photoPath ?? null,
    input.targetAge ?? null,
    sortOrder,
    now,
    now
  );
  const created = await getProfile(db, id);
  if (!created) throw new Error('Failed to create profile');
  return created;
}

export async function updateProfile(
  db: SQLiteDatabase,
  id: string,
  patch: {
    name?: string;
    emoji?: string | null;
    photoPath?: string | null;
    targetAge?: number | null;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error('Profile name is required');
    fields.push('name = ?');
    values.push(trimmed);
  }
  if (patch.emoji !== undefined) {
    fields.push('emoji = ?');
    values.push(patch.emoji);
  }
  if (patch.photoPath !== undefined) {
    fields.push('photo_path = ?');
    values.push(patch.photoPath);
  }
  if (patch.targetAge !== undefined) {
    fields.push('target_age = ?');
    values.push(patch.targetAge);
  }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  await db.runAsync(
    `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
    ...values
  );
}

/**
 * Delete a profile. If sessions reference it, they're reassigned to
 * `reassignTo` (or set to NULL if not provided). Returns the photo path
 * so the caller can clean it up from disk.
 */
export async function deleteProfile(
  db: SQLiteDatabase,
  id: string,
  reassignTo: string | null
): Promise<{ photoPath: string | null }> {
  const profile = await getProfile(db, id);
  if (!profile) return { photoPath: null };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET profile_id = ? WHERE profile_id = ?`,
      reassignTo,
      id
    );
    await db.runAsync(`DELETE FROM profiles WHERE id = ?`, id);
  });
  return { photoPath: profile.photoPath };
}

export async function reorderProfiles(
  db: SQLiteDatabase,
  orderedIds: string[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.runAsync(
        `UPDATE profiles SET sort_order = ?, updated_at = ? WHERE id = ?`,
        i,
        Date.now(),
        orderedIds[i]
      );
    }
  });
}

export async function countSessionsForProfile(
  db: SQLiteDatabase,
  profileId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM sessions WHERE profile_id = ?`,
    profileId
  );
  return row?.n ?? 0;
}
