import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { burnIn } from '../../modules/video-overlay';
import { categoryById } from '../../src/categories';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import {
  deleteSession,
  getSession,
  markExported,
  setBurnedVideoPath,
  type Cue,
  type SessionWithPrompts,
} from '../../src/db/sessions';
import {
  burnedVideoFilenameFor,
  deleteVideoFile,
  newBurnedVideoAbsolutePath,
  resolveVideoPath,
  videoFileExists,
} from '../../src/storage/files';
import { getBurnIn, getOverlayPosition } from '../../src/storage/keychain';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

function distributeCues(prompts: string[], durationMs: number): Cue[] {
  if (prompts.length === 0 || durationMs <= 0) return [];
  const slice = Math.floor(durationMs / prompts.length);
  return prompts.map((text, i) => ({
    text,
    startMs: i * slice,
    endMs: i === prompts.length - 1 ? durationMs : (i + 1) * slice,
  }));
}

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [session, setSession] = useState<SessionWithPrompts | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [burning, setBurning] = useState(false);
  const [showBurned, setShowBurned] = useState(true);
  const [videoMissing, setVideoMissing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) return;
    (async () => {
      try {
        const s = await getSession(db, id);
        if (!active) return;
        setSession(s);
        if (s) {
          const exists = await videoFileExists(s.videoPath);
          if (active) setVideoMissing(!exists);
        }
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, id]);

  const hasBurned = Boolean(session?.burnedVideoPath);
  const resolvedClean = resolveVideoPath(session?.videoPath ?? null);
  const resolvedBurned = resolveVideoPath(session?.burnedVideoPath ?? null);
  const videoSource =
    session && hasBurned && showBurned ? resolvedBurned : resolvedClean;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
  });

  async function handleExport() {
    if (!session) return;
    setExporting(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Allow access to Photos in iOS Settings to export.'
        );
        return;
      }

      const wantBurnIn = await getBurnIn();
      const sourceAbsPath = resolveVideoPath(session.videoPath);
      if (!sourceAbsPath) {
        Alert.alert('Cannot export', 'Original video path is missing.');
        return;
      }
      let exportPath = sourceAbsPath;
      let updatedSession = session;

      if (wantBurnIn) {
        const cuesForBurn: Cue[] =
          session.cues.length > 0
            ? session.cues
            : distributeCues(session.prompts, session.durationMs);

        if (cuesForBurn.length === 0) {
          // No prompts/timing — fall through and export clean.
        } else if (session.burnedVideoPath) {
          const resolvedBurnedAbs = resolveVideoPath(session.burnedVideoPath);
          if (resolvedBurnedAbs) exportPath = resolvedBurnedAbs;
        } else {
          // Need to burn first.
          setExportProgress('Burning prompts…');
          const overlayPos = await getOverlayPosition();
          const burnedAbs = newBurnedVideoAbsolutePath(session.id);
          await burnIn({
            sourceUri: sourceAbsPath,
            destinationUri: burnedAbs,
            cues: cuesForBurn.map((c) => ({
              text: c.text,
              startMs: c.startMs,
              endMs: c.endMs,
            })),
            position: overlayPos,
          });
          await setBurnedVideoPath(db, session.id, burnedVideoFilenameFor(session.id));
          const refreshed = await getSession(db, session.id);
          if (refreshed) {
            setSession(refreshed);
            updatedSession = refreshed;
          }
          exportPath = burnedAbs;
        }
      }

      setExportProgress('Saving to Photos…');
      await MediaLibrary.createAssetAsync(exportPath);
      await markExported(db, session.id);
      setSession({ ...updatedSession, exportedToPhotos: true });
      Alert.alert(
        'Exported',
        wantBurnIn
          ? 'Saved to Photos with prompts burned in.'
          : 'Saved to Photos.'
      );
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  async function handleReBurn() {
    if (!session) return;
    setBurning(true);
    try {
      const cuesForBurn: Cue[] =
        session.cues.length > 0
          ? session.cues
          : distributeCues(session.prompts, session.durationMs);
      if (cuesForBurn.length === 0) {
        Alert.alert(
          'Nothing to burn',
          'This session has no prompts or timing data. Re-record to use burn-in.'
        );
        return;
      }
      const overlayPos = await getOverlayPosition();
      const burnedAbs = newBurnedVideoAbsolutePath(session.id);
      const sourceAbs = resolveVideoPath(session.videoPath);
      if (!sourceAbs) {
        Alert.alert('Cannot burn', 'Original video path is missing.');
        return;
      }
      if (session.burnedVideoPath) {
        await deleteVideoFile(session.burnedVideoPath);
      }
      await burnIn({
        sourceUri: sourceAbs,
        destinationUri: burnedAbs,
        cues: cuesForBurn.map((c) => ({
          text: c.text,
          startMs: c.startMs,
          endMs: c.endMs,
        })),
        position: overlayPos,
      });
      await setBurnedVideoPath(db, session.id, burnedVideoFilenameFor(session.id));
      const refreshed = await getSession(db, session.id);
      if (refreshed) setSession(refreshed);
      Alert.alert(
        'Burned in',
        `Used ${cuesForBurn.length} cue${cuesForBurn.length === 1 ? '' : 's'}, position: ${overlayPos}.`
      );
    } catch (err) {
      Alert.alert(
        'Burn-in failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setBurning(false);
    }
  }

  function handleDelete() {
    if (!session) return;
    Alert.alert(
      'Delete session?',
      'This deletes the video and the questions. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const removed = await deleteSession(db, session.id);
              if (removed) {
                await deleteVideoFile(removed.videoPath);
                if (removed.burnedVideoPath) {
                  await deleteVideoFile(removed.burnedVideoPath);
                }
              }
              router.back();
            } catch (err) {
              setDeleting(false);
              Alert.alert(
                'Delete failed',
                err instanceof Error ? err.message : String(err)
              );
            }
          },
        },
      ]
    );
  }

  if (!loaded) return <Screen><View /></Screen>;
  if (!session) {
    return (
      <Screen>
        <View style={styles.missingWrap}>
          <Ionicons name="alert-circle-outline" size={42} color={colors.danger} />
          <Text style={styles.missing}>Session not found.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: categoryById(session.category).label }} />
      <View style={styles.videoWrap}>
        {videoMissing ? (
          <View style={styles.videoMissingOverlay}>
            <Ionicons name="cloud-offline" size={32} color={colors.textMuted} />
            <Text style={styles.videoMissingTitle}>Video file unavailable</Text>
            <Text style={styles.videoMissingBody}>
              The recording file is no longer on this device. iOS clears
              files between certain reinstalls. The session metadata is intact.
            </Text>
          </View>
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            nativeControls
            contentFit="contain"
          />
        )}
      </View>

      {hasBurned ? (
        <View style={styles.burnedToggle}>
          <Pressable
            onPress={() => setShowBurned(true)}
            style={({ pressed }) => [
              styles.burnedChip,
              showBurned && styles.burnedChipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.burnedChipText,
                showBurned && styles.burnedChipTextActive,
              ]}
            >
              With prompts
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowBurned(false)}
            style={({ pressed }) => [
              styles.burnedChip,
              !showBurned && styles.burnedChipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.burnedChipText,
                !showBurned && styles.burnedChipTextActive,
              ]}
            >
              Clean version
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.metaCard}>
        <Text style={styles.metaPrimary}>{formatDateLong(session.createdAt)}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="albums" size={12} color={colors.accent} />
            <Text style={styles.metaPillText}>
              {categoryById(session.category).label}
            </Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="time" size={12} color={colors.accent} />
            <Text style={styles.metaPillText}>
              {formatDuration(session.durationMs)}
            </Text>
          </View>
          {session.exportedToPhotos ? (
            <View style={[styles.metaPill, styles.exportedMeta]}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
              <Text style={[styles.metaPillText, styles.exportedMetaText]}>
                Exported
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {session.context ? (
        <View style={styles.contextBox}>
          <Text style={styles.contextLabel}>Context</Text>
          <Text style={styles.contextText}>{session.context}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>Questions</Text>
      <View style={styles.qList}>
        {session.prompts.map((q, i) => (
          <View key={i} style={styles.qItem}>
            <View style={styles.qNumPill}>
              <Text style={styles.qNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.qText}>{q}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: spacing.lg }} />
      <Button
        label={
          burning
            ? 'Burning…'
            : hasBurned
              ? 'Re-burn prompts into video'
              : 'Burn prompts into video'
        }
        variant="secondary"
        onPress={handleReBurn}
        loading={burning}
        icon={<Ionicons name="flame" size={18} color={colors.text} />}
        style={{ marginBottom: spacing.sm }}
      />
      <Button
        label={
          exportProgress
            ? exportProgress
            : session.exportedToPhotos
              ? 'Export to Photos again'
              : 'Export to Photos'
        }
        variant="secondary"
        onPress={handleExport}
        loading={exporting}
        icon={<Ionicons name="cloud-upload" size={18} color={colors.text} />}
      />
      <Button
        label="Delete session"
        variant="danger"
        onPress={handleDelete}
        loading={deleting}
        icon={<Ionicons name="trash" size={18} color={colors.danger} />}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    videoWrap: {
      backgroundColor: '#000',
      borderRadius: radius.lg,
      overflow: 'hidden',
      aspectRatio: 9 / 16,
      maxHeight: 480,
      alignSelf: 'stretch',
      ...shadow.card,
    },
    video: { flex: 1 },
    videoMissingOverlay: {
      flex: 1,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    videoMissingTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      textAlign: 'center',
    },
    videoMissingBody: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      textAlign: 'center',
      lineHeight: fontSize.sm * 1.4,
    },
    burnedToggle: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.sm,
      alignSelf: 'center',
      backgroundColor: colors.bgElevated,
      padding: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    burnedChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    burnedChipActive: { backgroundColor: colors.accent },
    burnedChipText: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    burnedChipTextActive: { color: colors.accentText },
    metaCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metaPrimary: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
    metaRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    metaPillText: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '700' },
    exportedMeta: { backgroundColor: colors.successSoft },
    exportedMetaText: { color: colors.success },
    contextBox: {
      marginTop: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contextLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '800',
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    contextText: {
      color: colors.text,
      fontSize: fontSize.md,
      lineHeight: fontSize.md * 1.4,
    },
    section: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: '800',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    qList: { gap: spacing.xs },
    qItem: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.sm,
      padding: spacing.md,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    qNumPill: {
      backgroundColor: colors.accent,
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qNumText: {
      color: colors.accentText,
      fontWeight: '800',
      fontSize: fontSize.xs,
    },
    qText: {
      color: colors.text,
      fontSize: fontSize.md,
      flex: 1,
      lineHeight: fontSize.md * 1.4,
    },
    missingWrap: {
      paddingVertical: spacing.xxxl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    missing: { color: colors.textMuted, fontSize: fontSize.md },
  });
};
