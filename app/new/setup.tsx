import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { categories, type CategoryId } from '../../src/categories';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
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
};

function providerLabel(p: 'on_device' | 'cloud' | 'static'): string {
  if (p === 'on_device') return 'On-device · Apple Intelligence';
  if (p === 'cloud') return 'OpenRouter · Cloud';
  return 'Built-in question bank';
}

export default function NewSetupScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [category, setCategory] = useState<CategoryId>('post_game');
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);

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

        <View style={styles.categoryGrid}>
          {categories.map((c) => {
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
                  >
                    {c.blurb}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

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
