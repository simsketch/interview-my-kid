import * as SecureStore from 'expo-secure-store';

const API_KEY = 'openrouter_api_key';
const MODEL_KEY = 'openrouter_model';
const KID_NAME_KEY = 'kid_name';
const PROVIDER_KEY = 'ai_provider';
const OVERLAY_POS_KEY = 'overlay_position';
const BURN_IN_KEY = 'burn_in_enabled';
const THEME_KEY = 'theme_name';

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
