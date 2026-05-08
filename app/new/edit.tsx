import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { generateQuestions } from '../../src/ai/generate';
import { Button } from '../../src/components/Button';
import { Screen } from '../../src/components/Screen';
import { createCardSet } from '../../src/db/cardSets';
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

type Card = { id: string; text: string };

let cardCounter = 0;
const newCardId = () => `c${++cardCounter}`;

export default function EditCardsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const [cards, setCards] = useState<Card[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const d = getDraft();
      if (!d) {
        router.replace('/new/setup');
        return;
      }
      setCards(d.prompts.map((text) => ({ id: newCardId(), text })));
      setDraftLoaded(true);
    }, [router])
  );

  function commit(next: Card[]) {
    setCards(next);
    updatePrompts(next.map((c) => c.text));
  }

  function updateAt(id: string, text: string) {
    commit(cards.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  function deleteCard(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commit(cards.filter((c) => c.id !== id));
  }

  function addCard() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const card = { id: newCardId(), text: '' };
    commit([...cards, card]);
    setFocusedId(card.id);
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
      commit(fresh.questions.map((text) => ({ id: newCardId(), text })));
    } catch (err) {
      Alert.alert(
        'Could not regenerate',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setRegenerating(false);
    }
  }

  function handleSaveSet() {
    const cleaned = cards.map((c) => c.text.trim()).filter((t) => t.length > 0);
    if (cleaned.length === 0) {
      Alert.alert('No cards to save', 'Add or generate at least one card first.');
      return;
    }
    const draft = getDraft();
    if (!draft) {
      Alert.alert('Cannot save', 'Lost draft state. Start a new interview to save sets.');
      return;
    }
    Alert.prompt(
      'Save card set',
      `Name this set so you can reuse it later. ${cleaned.length} ${cleaned.length === 1 ? 'card' : 'cards'} will be saved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name?: string) => {
            const trimmed = (name ?? '').trim();
            if (!trimmed) {
              Alert.alert('Name required', 'Give the set a short name.');
              return;
            }
            setSavingSet(true);
            try {
              await createCardSet(db, {
                name: trimmed,
                category: draft.category,
                prompts: cleaned,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Saved', `"${trimmed}" is in your saved sets.`);
            } catch (err) {
              Alert.alert(
                'Could not save',
                err instanceof Error ? err.message : String(err)
              );
            } finally {
              setSavingSet(false);
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  }

  function handleStartRecording() {
    const cleaned = cards.map((c) => c.text.trim()).filter((t) => t.length > 0);
    if (cleaned.length === 0) {
      Alert.alert('Add at least one card', 'Write a question or generate some.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updatePrompts(cleaned);
    router.push('/new/record');
  }

  if (!draftLoaded) return <Screen><View /></Screen>;

  function renderItem({ item, drag, isActive, getIndex }: RenderItemParams<Card>) {
    const index = getIndex() ?? 0;
    const isFocused = focusedId === item.id;
    return (
      <ScaleDecorator activeScale={1.03}>
        <View style={[
          styles.card,
          isActive && styles.cardActive,
          isFocused && styles.cardFocused,
        ]}>
          <Pressable
            onLongPress={drag}
            delayLongPress={200}
            disabled={isActive}
            style={styles.dragHandle}
            hitSlop={8}
          >
            <View style={styles.numberPill}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <Ionicons
              name="reorder-three"
              size={18}
              color={colors.textMuted}
              style={{ marginTop: 4 }}
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <TextInput
              value={item.text}
              onChangeText={(t) => updateAt(item.id, t)}
              onFocus={() => setFocusedId(item.id)}
              onBlur={() => setFocusedId((cur) => (cur === item.id ? null : cur))}
              placeholder="Question text…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              scrollEnabled={false}
            />
            <View style={styles.cardFooter}>
              <Text style={styles.charCount}>
                {item.text.length} {item.text.length === 1 ? 'char' : 'chars'}
              </Text>
              <Pressable
                onPress={() => deleteCard(item.id)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScaleDecorator>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Cue cards</Text>
          <Text style={styles.subtitle}>
            Tap to edit · long-press the handle to reorder
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {cards.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="albums-outline" size={36} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No cards yet</Text>
              <Text style={styles.emptyBody}>
                Add a question manually or regenerate with AI.
              </Text>
            </View>
          ) : (
            <DraggableFlatList
              data={cards}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                Haptics.selectionAsync();
                commit(data);
              }}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.sm }}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                <View style={styles.footerActions}>
                  <Pressable
                    onPress={addCard}
                    style={({ pressed }) => [
                      styles.addCardBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons name="add" size={20} color={colors.accent} />
                    <Text style={styles.addCardText}>Add card</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRegenerate}
                    disabled={regenerating}
                    style={({ pressed }) => [
                      styles.regenBtn,
                      regenerating && { opacity: 0.6 },
                      pressed && !regenerating && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons
                      name={regenerating ? 'hourglass' : 'refresh'}
                      size={18}
                      color={colors.textMuted}
                    />
                    <Text style={styles.regenText}>
                      {regenerating ? 'Regenerating…' : 'Regenerate all'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveSet}
                    disabled={savingSet}
                    style={({ pressed }) => [
                      styles.regenBtn,
                      savingSet && { opacity: 0.6 },
                      pressed && !savingSet && { opacity: 0.85 },
                    ]}
                  >
                    <Ionicons
                      name={savingSet ? 'hourglass' : 'bookmark-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                    <Text style={styles.regenText}>
                      {savingSet ? 'Saving…' : 'Save this set'}
                    </Text>
                  </Pressable>
                </View>
              }
            />
          )}
        </View>

        <Button
          label={`Start recording${cards.length ? ` · ${cards.filter((c) => c.text.trim().length > 0).length} cards` : ''}`}
          onPress={handleStartRecording}
          icon={<Ionicons name="videocam" size={18} color={colors.accentText} />}
          disabled={cards.length === 0}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    heading: { marginBottom: spacing.md },
    title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
    subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    empty: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    emptyTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
    emptyBody: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadow.card,
    },
    cardActive: {
      borderColor: colors.accent,
      ...shadow.pill,
    },
    cardFocused: {
      borderColor: colors.accent,
    },
    dragHandle: {
      alignItems: 'center',
      gap: 4,
      paddingTop: 2,
    },
    numberPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberText: {
      color: colors.accent,
      fontSize: fontSize.sm,
      fontWeight: '800',
    },
    input: {
      backgroundColor: 'transparent',
      color: colors.text,
      fontSize: fontSize.md,
      lineHeight: fontSize.md * 1.45,
      minHeight: 28,
      paddingVertical: 0,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    charCount: {
      color: colors.textDim,
      fontSize: fontSize.xs,
      fontVariant: ['tabular-nums'],
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.dangerSoft,
    },
    deleteText: {
      color: colors.danger,
      fontSize: fontSize.xs,
      fontWeight: '700',
    },
    footerActions: {
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    addCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    addCardText: {
      color: colors.accent,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    regenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    regenText: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      fontWeight: '600',
    },
  });
};
