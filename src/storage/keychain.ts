import * as SecureStore from 'expo-secure-store';

const API_KEY = 'openrouter_api_key';
const MODEL_KEY = 'openrouter_model';
const KID_NAME_KEY = 'kid_name';
const PROVIDER_KEY = 'ai_provider';
const OVERLAY_POS_KEY = 'overlay_position';
const BURN_IN_KEY = 'burn_in_enabled';
const THEME_KEY = 'theme_name';
const TARGET_AGE_KEY = 'target_age';
const QUESTION_COUNT_KEY = 'question_count';
const ACTIVE_PROFILE_ID_KEY = 'active_profile_id';
const SESSIONS_PROFILE_FILTER_KEY = 'sessions_profile_filter';

export const DEFAULT_QUESTION_COUNT = 7;
export const MIN_QUESTION_COUNT = 3;
export const MAX_QUESTION_COUNT = 15;
export const MIN_TARGET_AGE = 3;
export const MAX_TARGET_AGE = 17;

export async function getThemeName(): Promise<string | null> {
  return SecureStore.getItemAsync(THEME_KEY);
}

export async function setThemeName(name: string): Promise<void> {
  await SecureStore.setItemAsync(THEME_KEY, name);
}

export const DEFAULT_MODEL = 'anthropic/claude-haiku-4-5';

export type ProviderPreference = 'auto' | 'on_device' | 'cloud' | 'static';
export const DEFAULT_PROVIDER: ProviderPreference = 'auto';

export type OverlayPosition = 'top' | 'middle' | 'bottom';
export const DEFAULT_OVERLAY_POSITION: OverlayPosition = 'top';

const VALID_PROVIDERS: ProviderPreference[] = [
  'auto',
  'on_device',
  'cloud',
  'static',
];

const VALID_POSITIONS: OverlayPosition[] = ['top', 'middle', 'bottom'];

export async function getOverlayPosition(): Promise<OverlayPosition> {
  const v = await SecureStore.getItemAsync(OVERLAY_POS_KEY);
  if (v && (VALID_POSITIONS as string[]).includes(v)) {
    return v as OverlayPosition;
  }
  return DEFAULT_OVERLAY_POSITION;
}

export async function setOverlayPosition(pos: OverlayPosition): Promise<void> {
  await SecureStore.setItemAsync(OVERLAY_POS_KEY, pos);
}

export async function getBurnIn(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(BURN_IN_KEY);
  return v === '1';
}

export async function setBurnIn(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BURN_IN_KEY, enabled ? '1' : '0');
}

export async function getProvider(): Promise<ProviderPreference> {
  const v = await SecureStore.getItemAsync(PROVIDER_KEY);
  if (v && (VALID_PROVIDERS as string[]).includes(v)) {
    return v as ProviderPreference;
  }
  return DEFAULT_PROVIDER;
}

export async function setProvider(p: ProviderPreference): Promise<void> {
  await SecureStore.setItemAsync(PROVIDER_KEY, p);
}

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY);
}

export async function getModel(): Promise<string> {
  const m = await SecureStore.getItemAsync(MODEL_KEY);
  return m && m.trim().length > 0 ? m : DEFAULT_MODEL;
}

export async function setModel(model: string): Promise<void> {
  const trimmed = model.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(MODEL_KEY);
    return;
  }
  await SecureStore.setItemAsync(MODEL_KEY, trimmed);
}

export async function getKidName(): Promise<string | null> {
  return SecureStore.getItemAsync(KID_NAME_KEY);
}

export async function setKidName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(KID_NAME_KEY);
    return;
  }
  await SecureStore.setItemAsync(KID_NAME_KEY, trimmed);
}

export async function getTargetAge(): Promise<number | null> {
  const v = await SecureStore.getItemAsync(TARGET_AGE_KEY);
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  if (n < MIN_TARGET_AGE || n > MAX_TARGET_AGE) return null;
  return n;
}

export async function setTargetAge(age: number | null): Promise<void> {
  if (age == null) {
    await SecureStore.deleteItemAsync(TARGET_AGE_KEY);
    return;
  }
  const clamped = Math.max(MIN_TARGET_AGE, Math.min(MAX_TARGET_AGE, Math.round(age)));
  await SecureStore.setItemAsync(TARGET_AGE_KEY, String(clamped));
}

export async function getQuestionCount(): Promise<number> {
  const v = await SecureStore.getItemAsync(QUESTION_COUNT_KEY);
  if (!v) return DEFAULT_QUESTION_COUNT;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, n));
}

export async function setQuestionCount(count: number): Promise<void> {
  const clamped = Math.max(
    MIN_QUESTION_COUNT,
    Math.min(MAX_QUESTION_COUNT, Math.round(count))
  );
  await SecureStore.setItemAsync(QUESTION_COUNT_KEY, String(clamped));
}

export async function getActiveProfileId(): Promise<string | null> {
  return SecureStore.getItemAsync(ACTIVE_PROFILE_ID_KEY);
}

export async function setActiveProfileId(id: string | null): Promise<void> {
  if (id == null) {
    await SecureStore.deleteItemAsync(ACTIVE_PROFILE_ID_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACTIVE_PROFILE_ID_KEY, id);
}

/**
 * Sessions list filter: 'all' shows every kid's sessions, otherwise we use
 * the active profile id. Stored separately from the active profile so a user
 * can flip to "All kids" view without losing which kid the New Interview
 * flow is creating for.
 */
export type SessionsProfileFilter = 'active' | 'all';

export async function getSessionsProfileFilter(): Promise<SessionsProfileFilter> {
  const v = await SecureStore.getItemAsync(SESSIONS_PROFILE_FILTER_KEY);
  return v === 'all' ? 'all' : 'active';
}

export async function setSessionsProfileFilter(
  value: SessionsProfileFilter
): Promise<void> {
  await SecureStore.setItemAsync(SESSIONS_PROFILE_FILTER_KEY, value);
}
