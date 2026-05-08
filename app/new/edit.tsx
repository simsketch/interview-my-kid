import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { generateQuestions } from '../../src/ai/generate';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { getDraft, updatePrompts } from '../../src/state/draft';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

export default function EditCardsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const d = getDraft();
      if (!d) {
        router.replace('/new/setup');
        return;
      }
      setPrompts(d.prompts);
      setDraftLoaded(true);
    }, [router])
  );

  function commit(next: string[]) {
    setPrompts(next);
    updatePrompts(next);
  }

  function updateAt(i: number, text: string) {
    const next = prompts.slice();
    next[i] = text;
    commit(next);
  }

  function deleteAt(i: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = prompts.slice();
    next.splice(i, 1);
    commit(next);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    Haptics.selectionAsync();
    const next = prompts.slice();
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    commit(next);
  }

  function moveDown(i: number) {
    if (i === prompts.length - 1) return;
    Haptics.selectionAsync();
    const next = prompts.slice();
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    commit(next);
  }

  function addCard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commit([...prompts, '']);
  }

  async function handleRegenerate() {
    const d = getDraft();
    if (!d) return;
    setRegenerating(true);
    try {
      const fresh = await generateQuestions({
        category: d.category,
        context: d.context,
      });
      commit(fresh.questions);
    } catch (err) {
      Alert.alert(
        'Could not regenerate',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setRegenerating(false);
    }
  }

  function handleStartRecording() {
    const cleaned = prompts.map((p) => p.trim()).filter((p) => p.length > 0);
    if (cleaned.length === 0) {
      Alert.alert('Add at least one card', 'Write a question or generate some.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updatePrompts(cleaned);
    router.push('/new/record');
  }

  if (!draftLoaded) return <Screen><View /></Screen>;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Cue cards</Text>
          <Text style={styles.subtitle}>
            {prompts.length} {prompts.length === 1 ? 'card' : 'cards'} · tap to edit
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          {prompts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={48} color={colors.accent} />
              <Text style={styles.emptyText}>
                No cards yet. Add one manually or regenerate.
              </Text>
            </View>
          ) : (
            prompts.map((text, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardNumPill}>
                    <Text style={styles.cardNumText}>{i + 1}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => moveUp(i)}
                      disabled={i === 0}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        i === 0 && { opacity: 0.35 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="arrow-up" size={16} color={colors.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveDown(i)}
                      disabled={i === prompts.length - 1}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        i === prompts.length - 1 && { opacity: 0.35 },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="arrow-down" size={16} color={colors.text} />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteAt(i)}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="trash" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  value={text}
                  onChangeText={(t) => updateAt(i, t)}
                  placeholder="Question text…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  multiline
                />
              </View>
            ))
          )}
          <View style={styles.actionsRow}>
            <Button
              label="+ Add card"
              variant="secondary"
              onPress={addCard}
              style={{ flex: 1 }}
            />
            <Button
              label={regenerating ? '…' : 'Regenerate'}
              variant="secondary"
              onPress={handleRegenerate}
              loading={regenerating}
              style={{ flex: 1 }}
              icon={<Ionicons name="refresh" size={16} color={colors.text} />}
            />
          </View>
        </ScrollView>
        <Button
          label="Start recording"
          onPress={handleStartRecording}
          icon={<Ionicons name="videocam" size={18} color={colors.accentText} />}
          style={{ marginTop: spacing.sm }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    heading: { marginBottom: spacing.sm },
    title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
    subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    empty: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
      gap: spacing.md,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardNumPill: {
      backgroundColor: colors.accentSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    cardNumText: {
      color: colors.accent,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1,
    },
    cardActions: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.bgInput,
      minWidth: 32,
      alignItems: 'center',
    },
    input: {
      backgroundColor: colors.bgInput,
      color: colors.text,
      borderRadius: radius.sm,
      padding: spacing.sm,
      fontSize: fontSize.md,
      minHeight: 56,
      lineHeight: fontSize.md * 1.4,
    },
    actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  });
};
