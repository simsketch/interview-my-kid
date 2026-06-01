import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import {
  countSessionsForProfile,
  deleteProfile,
  listProfiles,
  type Profile,
} from '../../src/db/profiles';
import {
  getActiveProfileId,
  setActiveProfileId,
} from '../../src/storage/keychain';
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

export default function ProfilesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [all, active] = await Promise.all([
      listProfiles(db),
      getActiveProfileId(),
    ]);
    setProfiles(all);
    setActiveIdState(active);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh])
  );

  async function handleDelete(p: Profile) {
    const sessionCount = await countSessionsForProfile(db, p.id).catch(() => 0);
    const others = profiles.filter((x) => x.id !== p.id);
    const message =
      sessionCount > 0
        ? `${p.name} has ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}. What should we do with them?`
        : `Delete ${p.name}? This can't be undone.`;
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => Promise<void> | void;
    }[] = [{ text: 'Cancel', style: 'cancel' }];

    if (sessionCount > 0 && others.length > 0) {
      buttons.push({
        text: `Move to ${others[0].name}`,
        onPress: async () => {
          await doDelete(p, others[0].id);
        },
      });
      buttons.push({
        text: 'Keep sessions (unassigned)',
        onPress: async () => {
          await doDelete(p, null);
        },
      });
    } else {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await doDelete(p, null);
        },
      });
    }

    Alert.alert(`Delete ${p.name}?`, message, buttons);
  }

  async function doDelete(p: Profile, reassignTo: string | null) {
    const { photoPath } = await deleteProfile(db, p.id, reassignTo);
    if (photoPath) {
      FileSystem.deleteAsync(photoPath, { idempotent: true }).catch(() => undefined);
    }
    if (activeId === p.id) {
      const remaining = profiles.filter((x) => x.id !== p.id);
      const nextActive = remaining[0]?.id ?? null;
      await setActiveProfileId(nextActive);
      setActiveIdState(nextActive);
    }
    await refresh();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.intro}>
          Each profile holds its own sessions and target age. Card sets are shared
          across all kids.
        </Text>

        {profiles.map((p) => (
          <Pressable
            key={p.id}
            onPress={() =>
              router.push({ pathname: '/profiles/edit', params: { id: p.id } })
            }
            style={({ pressed }) => [
              styles.row,
              pressed && { opacity: 0.85 },
            ]}
          >
            <ProfileAvatar profile={p} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>
                {p.name}
                {p.id === activeId ? (
                  <Text style={styles.activeTag}>  · active</Text>
                ) : null}
              </Text>
              <Text style={styles.rowMeta}>
                {p.targetAge != null ? `${p.targetAge} years old` : 'Any age'}
              </Text>
            </View>
            <Pressable
              hitSlop={12}
              onPress={() => handleDelete(p)}
              style={styles.trash}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}

        <Pressable
          onPress={() => router.push('/profiles/edit')}
          style={({ pressed }) => [
            styles.addRow,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.addIcon}>
            <Ionicons name="add" size={22} color={colors.accent} />
          </View>
          <Text style={styles.addLabel}>Add a profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, gap: spacing.sm },
    intro: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.5,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowName: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    activeTag: {
      color: colors.accent,
      fontSize: fontSize.xs,
      fontWeight: '700',
    },
    rowMeta: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    trash: {
      padding: 4,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      marginTop: spacing.sm,
    },
    addIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLabel: {
      color: colors.accent,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
  });
