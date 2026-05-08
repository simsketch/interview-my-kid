import * as FileSystem from 'expo-file-system/legacy';

// We store only the filename in SQLite. The container UUID changes between
// installs (dev / TestFlight / App Store), so absolute paths go stale after a
// reinstall. resolveVideoPath() rebuilds the absolute path against the current
// documentDirectory at read time.

function videoDir(): string {
  return `${FileSystem.documentDirectory}videos/`;
}

export async function ensureVideoDir(): Promise<void> {
  const dir = videoDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/** Filename to store in SQLite (relative to videos/ dir). */
export function videoFilenameFor(id: string): string {
  return `${id}.mov`;
}

export function burnedVideoFilenameFor(id: string): string {
  return `${id}-burned.mov`;
}

/**
 * Resolve a stored value (which may be a filename or a legacy absolute path
 * pointing to an old container UUID) into a CURRENT absolute path. Returns
 * null if the input is null/empty.
 */
export function resolveVideoPath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  // Trim known prefixes and extract the trailing filename component.
  const filename = stored.split('/').pop();
  if (!filename) return null;
  return `${videoDir()}${filename}`;
}

/** Check whether the file behind a stored path actually exists on disk. */
export async function videoFileExists(stored: string | null | undefined): Promise<boolean> {
  const resolved = resolveVideoPath(stored);
  if (!resolved) return false;
  try {
    const info = await FileSystem.getInfoAsync(resolved);
    return info.exists;
  } catch {
    return false;
  }
}

/** Build the absolute path for a NEW recording (used by record screen). */
export function newVideoAbsolutePath(id: string): string {
  return `${videoDir()}${videoFilenameFor(id)}`;
}

export function newBurnedVideoAbsolutePath(id: string): string {
  return `${videoDir()}${burnedVideoFilenameFor(id)}`;
}

export async function moveRecordedVideo(
  sourceUri: string,
  id: string
): Promise<string> {
  await ensureVideoDir();
  const dest = newVideoAbsolutePath(id);
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
  // Return the FILENAME for storage in SQLite, not the absolute path.
  return videoFilenameFor(id);
}

export async function deleteVideoFile(stored: string | null | undefined): Promise<void> {
  const resolved = resolveVideoPath(stored);
  if (!resolved) return;
  try {
    const info = await FileSystem.getInfoAsync(resolved);
    if (info.exists) {
      await FileSystem.deleteAsync(resolved, { idempotent: true });
    }
  } catch {
    // best-effort cleanup; ignore
  }
}
