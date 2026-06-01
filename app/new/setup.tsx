import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getDefaultSetsByCategory,
  isBuiltInSetId,
  type BuiltInCardSet,
} from '../../src/ai/defaultSets';
import { generateQuestions } from '../../src/ai/generate';
import { categoryById, type CategoryId } from '../../src/categories';
import { Button } from '../../src/components/Button';
import { CategoryPickerSheet } from '../../src/components/CategoryPickerSheet';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { ProfilePickerSheet } from '../../src/components/ProfilePickerSheet';
import { WheelPickerModal } from '../../src/components/WheelPickerModal';
import {
  listCardSetsByCategory,
  markCardSetUsed,
  type CardSet,
} from '../../src/db/cardSets';
import {
  listProfiles,
  updateProfile,
  type Profile,
} from '../../src/db/profiles';
import { setDraft } from '../../src/state/draft';
import {
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  MAX_TARGET_AGE,
  MIN_QUESTION_COUNT,
  MIN_TARGET_AGE,
  getActiveProfileId,
  getQuestionCount,
  setActiveProfileId,
  setQuestionCount,
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
  const [count, setCountLocal] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [pickerOpen, setPickerOpen] = useState<
    'age' | 'count' | 'topic' | 'profile' | null
  >(null);

  const targetAge = activeProfile?.targetAge ?? null;

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [allProfiles, activeId, c] = await Promise.all([
          listProfiles(db),
          getActiveProfileId(),
          getQuestionCount(),
        ]);
        if (!active) return;
        setProfiles(allProfiles);
        setCountLocal(c);
        const fallback = allProfiles[0] ?? null;
        const found =
          allProfiles.find((p) => p.id === activeId) ?? fallback;
        setActiveProfile(found);
      })().catch(() => undefined);
      return () => {
        active = false;
      };
    }, [db])
  );

  async function applyAge(value: string) {
    setPickerOpen(null);
    if (!activeProfile) return;
    const newAge =
      value === 'any'
        ? null
        : Number.isFinite(Number.parseInt(value, 10))
          ? Number.parseInt(value, 10)
          : null;
    setActiveProfile({ ...activeProfile, targetAge: newAge });
    try {
      await updateProfile(db, activeProfile.id, { targetAge: newAge });
    } catch {
      /* ignore */
    }
  }

  async function handleSelectProfile(id: string) {
    const profile = profiles.find((p) => p.id === id) ?? null;
    setActiveProfile(profile);
    await setActiveProfileId(id);
  }

  function applyCount(value: string) {
    setPickerOpen(null);
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    setCountLocal(n);
    setQuestionCount(n).catch(() => undefined);
  }

  const ageOptions = [
    { label: 'Any age', value: 'any' },
    ...Array.from({ length: MAX_TARGET_AGE - MIN_TARGET_AGE + 1 }, (_, i) => {
      const age = MIN_TARGET_AGE + i;
      return { label: `${age} years old`, value: String(age) };
    }),
  ];

  const countOptions = Array.from(
    { length: MAX_QUESTION_COUNT - MIN_QUESTION_COUNT + 1 },
    (_, i) => {
      const c = MIN_QUESTION_COUNT + i;
      return { label: `${c} questions`, value: String(c) };
    }
  );

  function handleUseSet(set: CardSet | BuiltInCardSet) {
    if (!isBuiltInSetId(set.id)) {
      markCardSetUsed(db, set.id).catch(() => undefined);
    }
    setDraft({
      category: set.category,
      context: context.trim().length > 0 ? context.trim() : null,
      prompts: set.prompts.slice(),
      profileId: activeProfile?.id ?? null,
    });
    router.push('/new/edit');
  }

  const builtInSets = getDefaultSetsByCategory(category);
  const selectedCategory = categoryById(category);
  const totalSets = builtInSets.length + savedSets.length;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const trimmedContext = context.trim().length > 0 ? context.trim() : null;
      const result = await generateQuestions({
        category,
        context: trimmedContext,
        count,
        targetAge,
      });
      setDraft({
        category,
        context: trimmedContext,
        prompts: result.questions,
        profileId: activeProfile?.id ?? null,
      });
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
      profileId: activeProfile?.id ?? null,
    });
    router.push('/new/edit');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.heading}>New interview</Text>
            <Text style={styles.subheading}>
              Pick a topic and a few options. We&apos;ll generate cue cards you can
              edit before recording.
            </Text>
          </View>

          {activeProfile ? (
            <Pressable
              onPress={() => setPickerOpen('profile')}
              style={({ pressed }) => [
                styles.profileChip,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ProfileAvatar profile={activeProfile} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileChipLabel}>For</Text>
                <Text style={styles.profileChipName} numberOfLines={1}>
                  {activeProfile.name}
                </Text>
              </View>
              {profiles.length > 1 ? (
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              ) : null}
            </Pressable>
          ) : null}

          <View style={styles.optionsRow}>
            <Pressable
              onPress={() => setPickerOpen('count')}
              style={({ pressed }) => [
                styles.optionPill,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="list" size={14} color={colors.accent} />
              <Text style={styles.optionPillValue}>{count}</Text>
              <Text style={styles.optionPillLabel}>cards</Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setPickerOpen('age')}
              style={({ pressed }) => [
                styles.optionPill,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="person" size={14} color={colors.accent} />
              <Text style={styles.optionPillValue}>
                {targetAge != null ? targetAge : 'Any'}
              </Text>
              <Text style={styles.optionPillLabel}>
                {targetAge != null ? 'yrs old' : 'age'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.label}>Topic</Text>
          <Pressable
            onPress={() => setPickerOpen('topic')}
            style={({ pressed }) => [
              styles.topicRow,
              pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
            ]}
          >
            <View style={styles.topicIcon}>
              <Ionicons
                name={categoryIcon[category]}
                size={22}
                color={colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.topicLabel}>{selectedCategory.label}</Text>
              <Text style={styles.topicBlurb} numberOfLines={2}>
                {selectedCategory.blurb}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          </Pressable>

          {totalSets > 0 ? (
            <View style={styles.savedSection}>
              <View style={styles.savedHeader}>
                <Text style={styles.label}>Use a saved set</Text>
                <Text style={styles.savedCount}>
                  {totalSets} {totalSets === 1 ? 'set' : 'sets'}
                </Text>
              </View>
              <Text style={styles.helper}>
                Skip generation and reuse a ready-made set of cue cards.
              </Text>
              <View style={styles.savedList}>
                {builtInSets.map((set) => (
                  <Pressable
                    key={set.id}
                    onPress={() => handleUseSet(set)}
                    style={({ pressed }) => [
                      styles.savedCard,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View style={styles.savedIcon}>
                      <Ionicons name="sparkles" size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.savedNameRow}>
                        <Text style={styles.savedName} numberOfLines={1}>
                          {set.name}
                        </Text>
                        <View style={styles.builtInBadge}>
                          <Text style={styles.builtInBadgeText}>Starter</Text>
                        </View>
                      </View>
                      <Text style={styles.savedMeta}>
                        {set.prompts.length}{' '}
                        {set.prompts.length === 1 ? 'card' : 'cards'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
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
                        {set.prompts.length}{' '}
                        {set.prompts.length === 1 ? 'card' : 'cards'}
                        {set.lastUsedAt
                          ? ` · used ${formatRelative(set.lastUsedAt)}`
                          : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.contextSection}>
            <Text style={styles.label}>Anything specific about today?</Text>
            <Text style={styles.helper}>
              Optional context for the AI — e.g. &quot;hit two homers, lost 4-3,
              pitched 4 innings.&quot;
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
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label={generating ? 'Generating…' : 'Generate Questions'}
            onPress={handleGenerate}
            loading={generating}
          />
          <Button label="Skip — write my own" variant="ghost" onPress={handleSkip} />
        </View>
      </KeyboardAvoidingView>
      <CategoryPickerSheet
        visible={pickerOpen === 'topic'}
        selected={category}
        onSelect={setCategory}
        onClose={() => setPickerOpen(null)}
      />
      <ProfilePickerSheet
        visible={pickerOpen === 'profile'}
        profiles={profiles}
        activeProfileId={activeProfile?.id ?? null}
        onSelect={handleSelectProfile}
        onManage={() => router.push('/profiles')}
        onClose={() => setPickerOpen(null)}
      />
      <WheelPickerModal
        visible={pickerOpen === 'count'}
        title="Number of questions"
        options={countOptions}
        selectedValue={String(count)}
        onConfirm={applyCount}
        onClose={() => setPickerOpen(null)}
      />
      <WheelPickerModal
        visible={pickerOpen === 'age'}
        title="Target age"
        options={ageOptions}
        selectedValue={targetAge != null ? String(targetAge) : 'any'}
        onConfirm={applyAge}
        onClose={() => setPickerOpen(null)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    kav: { flex: 1 },
    scrollFlex: { flex: 1 },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.xs,
    },
    intro: { marginBottom: spacing.md },
    heading: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
    profileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    profileChipLabel: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    profileChipName: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
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
    optionsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    optionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.pill,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionPillValue: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    optionPillLabel: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.accent,
      ...shadow.card,
    },
    topicIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topicLabel: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: '800',
      marginBottom: 2,
    },
    topicBlurb: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
    savedSection: { marginTop: spacing.lg },
    savedHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    savedCount: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
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
    savedName: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      flexShrink: 1,
    },
    savedNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    builtInBadge: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    builtInBadgeText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
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
