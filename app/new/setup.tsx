import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { generateQuestions } from '../../src/ai/generate';
import {
  categories,
  categoryGroups,
  type CategoryGroup,
  type CategoryId,
} from '../../src/categories';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import {
  listCardSetsByCategory,
  markCardSetUsed,
  type CardSet,
} from '../../src/db/cardSets';
import { setDraft } from '../../src/state/draft';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

const categoryIcon: Record<CategoryId, keyof typeof Ionicons.glyphMap> = {
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

function providerLabel(p: 'on_device' | 'cloud' | 'static'): string {
  if (p === 'on_device') return 'On-device · Apple Intelligence';
  if (p === 'cloud') return 'OpenRouter · Cloud';
  return 'Built-in question bank';
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NewSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const [category, setCategory] = useState<CategoryId>('post_game');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savedSets, setSavedSets] = useState<CardSet[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCardSetsByCategory(db, category)
        .then((sets) => active && setSavedSets(sets))
        .catch(() => active && setSavedSets([]));
      return () => {
        active = false;
      };
    }, [db, category])
  );

  function handleUseSet(set: CardSet) {
    markCardSetUsed(db, set.id).catch(() => undefined);
    setDraft({
      category: set.category,
      context: context.trim().length > 0 ? context.trim() : null,
      prompts: set.prompts.slice(),
    });
    router.push('/new/edit');
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const trimmedContext = context.trim().length > 0 ? context.trim() : null;
      const result = await generateQuestions({
        category,
        context: trimmedContext,
      });
      setDraft({ category, context: trimmedContext, prompts: result.questions });
      router.push('/new/edit');
      if (result.notice) {
        setTimeout(() => {
          Alert.alert(providerLabel(result.provider), result.notice);
        }, 300);
      }
    } catch (err) {
      Alert.alert(
        'Could not generate',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setGenerating(false);
    }
  }

  function handleSkip() {
    setDraft({
      category,
      context: context.trim().length > 0 ? context.trim() : null,
      prompts: [],
    });
    router.push('/new/edit');
  }

  return (
    <Screen scroll edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.intro}>
          <Text style={styles.heading}>What kind of interview?</Text>
          <Text style={styles.subheading}>
            Pick a topic. We&apos;ll generate cue cards you can edit before recording.
          </Text>
        </View>

        {categoryGroups
          .map((g) => ({ group: g, items: categories.filter((c) => c.group === g.id) }))
          .filter((g) => g.items.length > 0)
          .map(({ group, items }) => (
            <View key={group.id} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.categoryGrid}>
                {items.map((c) => {
                  const selected = c.id === category;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategory(c.id)}
                      style={({ pressed }) => [
                        styles.catCard,
                        selected && styles.catCardSelected,
                        pressed && styles.catCardPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.catIcon,
                          selected && { backgroundColor: colors.accent },
                        ]}
                      >
                        <Ionicons
                          name={categoryIcon[c.id]}
                          size={20}
                          color={selected ? colors.accentText : colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.catLabel, selected && styles.catLabelSelected]}
                        >
                          {c.label}
                        </Text>
                        <Text
                          style={[styles.catBlurb, selected && styles.catBlurbSelected]}
                          numberOfLines={2}
                        >
                          {c.blurb}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.accent}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

        {savedSets.length > 0 ? (
          <View style={styles.savedSection}>
            <Text style={styles.label}>Saved sets</Text>
            <Text style={styles.helper}>
              Reuse a set you saved for {categories.find((c) => c.id === category)?.label.toLowerCase()}.
            </Text>
            <View style={styles.savedList}>
              {savedSets.map((set) => (
                <Pressable
                  key={set.id}
                  onPress={() => handleUseSet(set)}
                  style={({ pressed }) => [
                    styles.savedCard,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <View style={styles.savedIcon}>
                    <Ionicons name="bookmark" size={16} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedName} numberOfLines={1}>
                      {set.name}
                    </Text>
                    <Text style={styles.savedMeta}>
                      {set.prompts.length} {set.prompts.length === 1 ? 'card' : 'cards'}
                      {set.lastUsedAt
                        ? ` · used ${formatRelative(set.lastUsedAt)}`
                        : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.contextSection}>
          <Text style={styles.label}>Anything specific about today?</Text>
          <Text style={styles.helper}>
            Optional context for the AI — e.g. "hit two homers, lost 4-3, pitched 4 innings."
          </Text>
          <TextInput
            value={context}
            onChangeText={setContext}
            placeholder="What happened today?"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: spacing.lg }} />
        <Button
          label={generating ? 'Generating…' : 'Generate Questions'}
          onPress={handleGenerate}
          loading={generating}
        />
        <Button label="Skip — write my own" variant="ghost" onPress={handleSkip} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    intro: { marginBottom: spacing.lg },
    heading: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
    subheading: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      marginTop: spacing.xs,
      lineHeight: fontSize.md * 1.4,
    },
    label: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    helper: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginBottom: spacing.sm,
      lineHeight: fontSize.sm * 1.4,
    },
    groupBlock: { marginBottom: spacing.md, gap: spacing.xs },
    groupLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    categoryGrid: { gap: spacing.sm },
    catCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      ...shadow.card,
    },
    catCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    catCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      marginBottom: 2,
    },
    catLabelSelected: { color: colors.text },
    catBlurb: { color: colors.textMuted, fontSize: fontSize.sm },
    catBlurbSelected: { color: colors.textSubtle },
    savedSection: { marginTop: spacing.lg },
    savedList: { gap: spacing.xs },
    savedCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    savedIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    savedName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    savedMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
    contextSection: { marginTop: spacing.lg },
    input: {
      backgroundColor: colors.bgInput,
      color: colors.text,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: fontSize.md,
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
};
