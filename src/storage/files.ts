import * as FileSystem from 'expo-file-system/legacy';

const VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;

export async function ensureVideoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
  }
}

export function videoPathFor(id: string): string {
  return `${VIDEO_DIR}${id}.mov`;
}

export function burnedVideoPathFor(id: string): string {
  return `${VIDEO_DIR}${id}-burned.mov`;
}

export async function moveRecordedVideo(
  sourceUri: string,
  id: string
): Promise<string> {
  await ensureVideoDir();
  const dest = videoPathFor(id);
  const normalizedSource = sourceUri.startsWith('file://')
    ? sourceUri
    : `file://${sourceUri}`;
  const sourceInfo = await FileSystem.getInfoAsync(normalizedSource);
  if (!sourceInfo.exists) {
    throw new Error(`Recorded video not found at ${normalizedSource}`);
  }
  // Copy then delete is more robust across sandbox boundaries than moveAsync.
  await FileSystem.copyAsync({ from: normalizedSource, to: dest });
  try {
    await FileSystem.deleteAsync(normalizedSource, { idempotent: true });
  } catch {
    // tmp cleanup is best-effort
  }
  return dest;
}

export async function deleteVideoFile(path: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  } catch {
    // best-effort cleanup; ignore
  }
}
