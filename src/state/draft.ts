import type { CategoryId } from '../categories';

export type Draft = {
  category: CategoryId;
  context: string | null;
  prompts: string[];
};

let current: Draft | null = null;

export function setDraft(d: Draft): void {
  current = d;
}

export function updatePrompts(prompts: string[]): void {
  if (!current) return;
  current = { ...current, prompts };
}

export function getDraft(): Draft | null {
  return current;
}

export function clearDraft(): void {
  current = null;
}
