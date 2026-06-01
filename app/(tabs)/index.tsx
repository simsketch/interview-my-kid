import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryById } from '../../src/categories';
import { listProfiles, type Profile } from '../../src/db/profiles';
import { listSessions, type Session } from '../../src/db/sessions';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { ProfilePickerSheet } from '../../src/components/ProfilePickerSheet';
import {
  getActiveProfileId,
  getSessionsProfileFilter,
  setActiveProfileId,
  setSessionsProfileFilter,
} from '../../src/storage/keychain';
import {
  fontSize,
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [allProfiles, activeId, filter] = await Promise.all([
          listProfiles(db),
          getActiveProfileId(),
          getSessionsProfileFilter(),
        ]);
        if (!active) return;
        setProfiles(allProfiles);
        setActiveProfileIdState(activeId);
        setShowAll(filter === 'all');

        const sessionFilter: { profileId?: string | null } | undefined =
          filter === 'all'
            ? undefined
            : activeId
              ? { profileId: activeId }
              : undefined;
        try {
          const rows = await listSessions(db, sessionFilter);
          if (active) setSessions(rows);
        } catch {
          if (active) setSessions([]);
        }
      })();
      return () => {
        active = false;
      };
    }, [db])
  );

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? null;

  async function handleSelectProfile(id: string) {
    setActiveProfileIdState(id);
    setShowAll(false);
    await Promise.all([
      setActiveProfileId(id),
      setSessionsProfileFilter('active'),
    ]);
    try {
      const rows = await listSessions(db, { profileId: id });
      setSessions(rows);
    } catch {
      setSessions([]);
    }
  }

  async function handleSelectAll() {
    setShowAll(true);
    await setSessionsProfileFilter('all');
    try {
      const rows = await listSessions(db);
      setSessions(rows);
    } catch {
      setSessions([]);
    }
  }

  const empty = sessions !== null && sessions.length === 0;
  const hasMultipleProfiles = profiles.length > 1;
  const filterLabel = showAll
    ? 'All kids'
    : activeProfile?.name ?? 'No profile';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessions</Text>
        {profiles.length > 0 ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setPickerOpen(true);
            }}
            style={({ pressed }) => [
              styles.profileChip,
              pressed && { opacity: 0.85 },
            ]}
          >
            {showAll ? (
              <View style={styles.allChipIcon}>
                <Ionicons name="people" size={14} color={colors.accent} />
              </View>
            ) : (
              <ProfileAvatar profile={activeProfile} size={22} />
            )}
            <Text style={styles.profileChipText}>{filterLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Text style={styles.subtitle}>
            Recorded interviews with cue-card prompts
          </Text>
        )}
      </View>

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
                {showAll || !activeProfile
                  ? 'Tap the camera button in the menu to record your first session.'
                  : `Tap the camera button to record ${activeProfile.name}'s first session.`}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const sessionProfile =
            (showAll &&
              profiles.find((p) => p.id === item.profileId)) ||
            null;
          return (
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
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemSecondary}>
                    {formatDate(item.createdAt)}
                  </Text>
                  {sessionProfile ? (
                    <View style={styles.profileBadge}>
                      <Text style={styles.profileBadgeEmoji}>
                        {sessionProfile.emoji ?? '🧒'}
                      </Text>
                      <Text style={styles.profileBadgeText} numberOfLines={1}>
                        {sessionProfile.name}
                      </Text>
                    </View>
                  ) : null}
                </View>
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
          );
        }}
      />

      <ProfilePickerSheet
        visible={pickerOpen}
        profiles={profiles}
        activeProfileId={activeProfileId}
        showAllOption={hasMultipleProfiles}
        allSelected={showAll}
        onSelect={handleSelectProfile}
        onSelectAll={handleSelectAll}
        onManage={() => router.push('/profiles')}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

const makeStyles = (colors: Palette) => {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800' },
    subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    profileChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    profileChipText: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    allChipIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
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
    itemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    itemSecondary: { color: colors.textMuted, fontSize: fontSize.xs },
    profileBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      maxWidth: 120,
    },
    profileBadgeEmoji: { fontSize: 10 },
    profileBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '700',
    },
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
