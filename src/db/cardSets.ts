import type { SQLiteDatabase } from 'expo-sqlite';
import type { CategoryId } from '../categories';
import { generateId } from './sessions';

export type CardSet = {
  id: string;
  name: string;
  category: CategoryId;
  prompts: string[];
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
};

type CardSetRow = {
  id: string;
  name: string;
  category: string;
  prompts_json: string;
  created_at: number;
  updated_at: number;
  last_used_at: number | null;
};

function rowToCardSet(row: CardSetRow): CardSet {
  let prompts: string[];
  try {
    const parsed = JSON.parse(row.prompts_json);
    prompts = Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    prompts = [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category as CategoryId,
    prompts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function listCardSets(db: SQLiteDatabase): Promise<CardSet[]> {
  const rows = await db.getAllAsync<CardSetRow>(
    `SELECT * FROM card_sets ORDER BY updated_at DESC`
  );
  return rows.map(rowToCardSet);
}

export async function listCardSetsByCategory(
  db: SQLiteDatabase,
  category: CategoryId
): Promise<CardSet[]> {
  const rows = await db.getAllAsync<CardSetRow>(
    `SELECT * FROM card_sets WHERE category = ? ORDER BY updated_at DESC`,
    category
  );
  return rows.map(rowToCardSet);
}

export async function getCardSet(
  db: SQLiteDatabase,
  id: string
): Promise<CardSet | null> {
  const row = await db.getFirstAsync<CardSetRow>(
    `SELECT * FROM card_sets WHERE id = ?`,
    id
  );
  return row ? rowToCardSet(row) : null;
}

export async function createCardSet(
  db: SQLiteDatabase,
  input: { name: string; category: CategoryId; prompts: string[] }
): Promise<string> {
  const id = generateId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO card_sets
     (id, name, category, prompts_json, created_at, updated_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    id,
    input.name.trim(),
    input.category,
    JSON.stringify(input.prompts),
    now,
    now
  );
  return id;
}

export async function updateCardSet(
  db: SQLiteDatabase,
  id: string,
  input: { name?: string; prompts?: string[] }
): Promise<void> {
  const existing = await getCardSet(db, id);
  if (!existing) throw new Error(`Card set ${id} not found`);
  const name = input.name?.trim() || existing.name;
  const prompts = input.prompts ?? existing.prompts;
  await db.runAsync(
    `UPDATE card_sets SET name = ?, prompts_json = ?, updated_at = ? WHERE id = ?`,
    name,
    JSON.stringify(prompts),
    Date.now(),
    id
  );
}

export async function markCardSetUsed(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(
    `UPDATE card_sets SET last_used_at = ? WHERE id = ?`,
    Date.now(),
    id
  );
}

export async function deleteCardSet(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync(`DELETE FROM card_sets WHERE id = ?`, id);
}
