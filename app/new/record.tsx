import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createSession, generateId, type Cue } from '../../src/db/sessions';
import { clearDraft, getDraft } from '../../src/state/draft';
import { moveRecordedVideo } from '../../src/storage/files';
import {
  getOverlayPosition,
  type OverlayPosition,
} from '../../src/storage/keychain';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');

  const [prompts, setPrompts] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [overlayPosition, setOverlayPositionLocal] =
    useState<OverlayPosition>('top');
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cuesRef = useRef<{ promptIndex: number; startMs: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      const d = getDraft();
      if (!d || d.prompts.length === 0) {
        router.replace('/');
        return;
      }
      setPrompts(d.prompts);
    }, [router])
  );

  useEffect(() => {
    (async () => {
      setOverlayPositionLocal(await getOverlayPosition());
    })();
  }, []);

  useEffect(() => {
    if (camPerm && !camPerm.granted && camPerm.canAskAgain) {
      requestCam();
    }
  }, [camPerm, requestCam]);

  useEffect(() => {
    if (micPerm && !micPerm.granted && micPerm.canAskAgain) {
      requestMic();
    }
  }, [micPerm, requestMic]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function recordCueChange(promptIndex: number) {
    if (!recording) return;
    const startMs = Date.now() - startedAtRef.current;
    cuesRef.current.push({ promptIndex, startMs });
  }

  function handleNext() {
    if (atLast) return;
    Haptics.selectionAsync();
    const next = Math.min(prompts.length - 1, index + 1);
    setIndex(next);
    recordCueChange(next);
  }

  function handlePrev() {
    if (atFirst) return;
    Haptics.selectionAsync();
    const next = Math.max(0, index - 1);
    setIndex(next);
    recordCueChange(next);
  }

  async function handleStart() {
    if (!cameraRef.current || recording || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRecording(true);
    setElapsed(0);
    startedAtRef.current = Date.now();
    cuesRef.current = [{ promptIndex: index, startMs: 0 }];
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 250);
    let result: { uri: string } | undefined;
    try {
      result = await cameraRef.current.recordAsync({ maxDuration: 60 * 30 });
    } catch (err) {
      clearTimer();
      setRecording(false);
      Alert.alert(
        'Recording failed',
        err instanceof Error ? err.message : String(err)
      );
      return;
    }
    clearTimer();
    const durationMs = Date.now() - startedAtRef.current;
    setRecording(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!result?.uri) {
      Alert.alert(
        'Recording did not save',
        'iOS returned no video file. Try recording for at least a couple of seconds before stopping.'
      );
      return;
    }
    await persistSession(result.uri, durationMs);
  }

  function handleStop() {
    if (!cameraRef.current || !recording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      cameraRef.current.stopRecording();
    } catch (err) {
      Alert.alert('Stop failed', err instanceof Error ? err.message : String(err));
    }
  }

  async function persistSession(sourceUri: string, durationMs: number) {
    const draft = getDraft();
    if (!draft) {
      Alert.alert(
        'Save failed',
        'Lost the question set before saving. Please start a new interview.'
      );
      router.replace('/');
      return;
    }
    setSaving(true);
    let videoPath: string | null = null;
    let id: string | null = null;
    try {
      id = generateId();
      videoPath = await moveRecordedVideo(sourceUri, id);
      const cues = buildCues(cuesRef.current, draft.prompts, durationMs);
      await createSession(db, {
        id,
        category: draft.category,
        context: draft.context,
        videoPath,
        durationMs,
        prompts: draft.prompts,
        cues,
        profileId: draft.profileId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert(
        'Save failed',
        `${msg}\n\nSource: ${sourceUri}${videoPath ? `\nDest: ${videoPath}` : ''}`
      );
      setSaving(false);
      return;
    }

    clearDraft();
    setSaving(false);
    if (id) {
      router.replace(`/session/${id}`);
    } else {
      router.replace('/');
    }
  }

  function handleCancel() {
    if (recording) {
      Alert.alert('Stop recording?', 'Stop and discard this take?', [
        { text: 'Keep recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            try {
              cameraRef.current?.stopRecording();
            } catch {
              // ignore
            }
            clearDraft();
            router.replace('/');
          },
        },
      ]);
      return;
    }
    clearDraft();
    router.replace('/');
  }

  if (!camPerm || !micPerm) {
    return <View style={styles.fillBg} />;
  }

  if (!camPerm.granted || !micPerm.granted) {
    return (
      <SafeAreaView style={styles.permRoot}>
        <Ionicons name="videocam-outline" size={64} color={colors.accent} />
        <Text style={styles.permTitle}>Camera & Microphone</Text>
        <Text style={styles.permBody}>
          Recording interviews needs both. Open iOS Settings → Interview My Kid
          to enable them, then come back.
        </Text>
        <Pressable
          onPress={() => {
            if (camPerm.canAskAgain) requestCam();
            if (micPerm.canAskAgain) requestMic();
          }}
          style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.permBtnText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.permCancel}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const promptText = prompts[index] ?? '';
  const atFirst = index === 0;
  const atLast = index >= prompts.length - 1;

  const overlayJustify =
    overlayPosition === 'middle'
      ? 'center'
      : overlayPosition === 'bottom'
        ? 'flex-end'
        : 'flex-start';

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
        videoQuality="1080p"
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.glassBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons
              name={recording ? 'close' : 'chevron-back'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.glassBtnText}>{recording ? 'End' : 'Back'}</Text>
          </Pressable>
          {recording ? (
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{formatElapsed(elapsed)}</Text>
            </View>
          ) : (
            <View style={{ width: 88 }} />
          )}
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={({ pressed }) => [
              styles.glassBtn,
              pressed && { opacity: 0.7 },
              recording && { opacity: 0.4 },
            ]}
            hitSlop={8}
            disabled={recording}
          >
            <Ionicons name="camera-reverse" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <View
          style={[styles.cardArea, { justifyContent: overlayJustify }]}
          pointerEvents="none"
        >
          <View style={styles.card}>
            <Text style={styles.cardCount}>
              {prompts.length === 0
                ? '–'
                : `Card ${index + 1} of ${prompts.length}`}
            </Text>
            <Text style={styles.cardText}>{promptText}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={handlePrev}
            disabled={atFirst}
            style={({ pressed }) => [
              styles.navBtn,
              atFirst && styles.navBtnDisabled,
              pressed && !atFirst && styles.navBtnPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color="#ffffff" />
            <Text style={styles.navBtnText}>Prev</Text>
          </Pressable>

          {recording ? (
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [styles.recordBtn, pressed && { opacity: 0.85 }]}
              disabled={saving}
            >
              <View style={styles.recordSquare} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [styles.recordBtn, pressed && { opacity: 0.85 }]}
              disabled={saving}
            >
              <View style={styles.recordCircle} />
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            disabled={atLast}
            style={({ pressed }) => [
              styles.navBtn,
              atLast && styles.navBtnDisabled,
              pressed && !atLast && styles.navBtnPressed,
            ]}
          >
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color="#ffffff" />
          </Pressable>
        </View>
        {saving ? (
          <View style={styles.saving} pointerEvents="auto">
            <View style={styles.savingCard}>
              <Ionicons name="cloud-upload" size={32} color={colors.accent} />
              <Text style={styles.savingText}>Saving session…</Text>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function buildCues(
  raw: { promptIndex: number; startMs: number }[],
  prompts: string[],
  durationMs: number
): Cue[] {
  if (raw.length === 0) {
    if (prompts.length === 0) return [];
    return [{ text: prompts[0], startMs: 0, endMs: durationMs }];
  }
  const out: Cue[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    const next = raw[i + 1];
    const endMs = next ? next.startMs : durationMs;
    const text = prompts[cur.promptIndex] ?? '';
    if (!text) continue;
    out.push({ text, startMs: cur.startMs, endMs });
  }
  return out;
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    fillBg: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1 },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    glassBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.overlayStrong,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 40,
    },
    glassBtnText: {
      color: '#ffffff',
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    recBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.overlayStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    recDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.recording,
    },
    recTime: {
      color: '#ffffff',
      fontSize: fontSize.md,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    cardArea: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    card: {
      backgroundColor: colors.overlayStrong,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      ...shadow.card,
    },
    cardCount: {
      color: colors.accent,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    cardText: {
      color: '#ffffff',
      fontSize: fontSize.xxl,
      fontWeight: '700',
      lineHeight: fontSize.xxl * 1.25,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    navBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.overlayStrong,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    navBtnPressed: { opacity: 0.7 },
    navBtnDisabled: { opacity: 0.35 },
    navBtnText: { color: '#ffffff', fontSize: fontSize.md, fontWeight: '700' },
    recordBtn: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 4,
      borderColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.recording,
    },
    recordSquare: {
      width: 28,
      height: 28,
      borderRadius: 4,
      backgroundColor: colors.recording,
    },
    saving: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    savingCard: {
      backgroundColor: colors.bgElevated,
      padding: spacing.xl,
      borderRadius: radius.lg,
      alignItems: 'center',
      gap: spacing.md,
      minWidth: 220,
    },
    savingText: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
    permRoot: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: spacing.xl,
      gap: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permTitle: {
      color: colors.text,
      fontSize: fontSize.xl,
      fontWeight: '800',
      textAlign: 'center',
    },
    permBody: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      textAlign: 'center',
      lineHeight: fontSize.md * 1.4,
    },
    permBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    permBtnText: {
      color: colors.accentText,
      fontSize: fontSize.md,
      fontWeight: '800',
    },
    permCancel: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      marginTop: spacing.sm,
    },
  });
};
