import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { categories, categoryById } from '../../src/categories';
import { Screen } from '../../src/components/Screen';
import {
  deleteCardSet,
  listCardSets,
  type CardSet,
} from '../../src/db/cardSets';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

function formatRelative(ms: number | null): string {
  if (!ms) return 'never used';
  const diff = Date.now() - ms;
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

export default function SavedSetsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const [sets, setSets] = useState<CardSet[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCardSets(db)
        .then((rows) => active && setSets(rows))
        .catch(() => active && setSets([]));
      return () => {
        active = false;
      };
    }, [db])
  );

  function handleDelete(set: CardSet) {
    Alert.alert(
      `Delete "${set.name}"?`,
      'This removes the saved set. Sessions you already recorded with it are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCardSet(db, set.id);
              const rows = await listCardSets(db);
              setSets(rows);
            } catch (err) {
              Alert.alert('Could not delete', err instanceof Error ? err.message : String(err));
            }
          },
        },
      ]
    );
  }

  if (sets === null) return <Screen><View /></Screen>;

  const grouped = categories.map((c) => ({
    category: c,
    sets: sets.filter((s) => s.category === c.id),
  }));

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <View style={styles.heading}>
        <Text style={styles.title}>Saved sets</Text>
        <Text style={styles.subtitle}>
          {sets.length === 0
            ? 'You haven’t saved any cue-card sets yet. Save one from the Edit Cards screen.'
            : `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} across ${grouped.filter((g) => g.sets.length > 0).length} ${grouped.filter((g) => g.sets.length > 0).length === 1 ? 'category' : 'categories'}.`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xxl }}>
        {grouped
          .filter((g) => g.sets.length > 0)
          .map(({ category, sets: catSets }) => (
            <View key={category.id} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <Ionicons
                    name={categoryIcon[category.id]}
                    size={14}
                    color={colors.accent}
                  />
                </View>
                <Text style={styles.groupLabel}>{category.label}</Text>
              </View>
              {catSets.map((set) => (
                <View key={set.id} style={styles.setCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.setName} numberOfLines={1}>
                      {set.name}
                    </Text>
                    <Text style={styles.setMeta}>
                      {set.prompts.length} {set.prompts.length === 1 ? 'card' : 'cards'} · {formatRelative(set.lastUsedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(set)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Ionicons name="trash" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    heading: { marginBottom: spacing.md },
    title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
    subtitle: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: spacing.xs,
      lineHeight: fontSize.sm * 1.4,
    },
    group: { gap: spacing.xs },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    groupIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    setCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    setName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    setMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    deleteBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.dangerSoft,
    },
  });
};
