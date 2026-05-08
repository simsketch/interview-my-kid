import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryById } from '../../src/categories';
import { listSessions, type Session } from '../../src/db/sessions';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

function formatDate(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString([], {
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

const categoryIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  pre_game: 'sunny',
  post_game: 'moon',
  moment: 'flash',
  season: 'calendar',
  before_school: 'partly-sunny',
  after_school: 'school',
  end_of_day: 'bed',
  big_feeling: 'heart',
  milestone: 'trophy',
  trip: 'airplane',
  open: 'sparkles',
};

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listSessions(db)
        .then((rows) => active && setSessions(rows))
        .catch(() => active && setSessions([]));
      return () => {
        active = false;
      };
    }, [db])
  );

  const empty = sessions !== null && sessions.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
        <Text style={styles.subtitle}>
          Recorded interviews with cue-card prompts
        </Text>
      </View>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/new/setup');
        }}
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.ctaIconBox}>
          <Ionicons name="add" size={28} color={colors.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>New interview</Text>
          <Text style={styles.ctaSub}>Pick a topic, generate cards, record</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.accentText} />
      </Pressable>

      {sessions !== null && sessions.length > 0 ? (
        <Text style={styles.sectionLabel}>Recent</Text>
      ) : null}

      <FlatList
        data={sessions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          empty ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={42} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No interviews yet</Text>
              <Text style={styles.emptyBody}>
                Tap "New interview" above to record your first session.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/session/${item.id}`);
            }}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <View style={styles.itemIconWrap}>
              <Ionicons
                name={categoryIcon[item.category] ?? 'film'}
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={styles.itemMain}>
              <Text style={styles.itemPrimary} numberOfLines={1}>
                {categoryById(item.category).label}
                {item.context ? ` · ${truncate(item.context, 32)}` : ''}
              </Text>
              <Text style={styles.itemSecondary}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
            <View style={styles.itemMeta}>
              <Text style={styles.itemDuration}>{formatDuration(item.durationMs)}</Text>
              {item.exportedToPhotos ? (
                <View style={styles.exportedPill}>
                  <Ionicons name="cloud-upload" size={11} color={colors.success} />
                  <Text style={styles.exportedText}>Exported</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800' },
    subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    cta: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.md,
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      ...shadow.card,
    },
    ctaIconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaTitle: {
      color: colors.accentText,
      fontSize: fontSize.lg,
      fontWeight: '800',
    },
    ctaSub: {
      color: colors.accentText,
      opacity: 0.75,
      fontSize: fontSize.sm,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
    empty: { paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.sm },
    emptyIcon: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
    emptyBody: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    item: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    itemIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemMain: { flex: 1, gap: 2 },
    itemPrimary: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    itemSecondary: { color: colors.textMuted, fontSize: fontSize.xs },
    itemMeta: { alignItems: 'flex-end', gap: 4 },
    itemDuration: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    exportedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    exportedText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  });
};
