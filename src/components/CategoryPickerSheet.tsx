import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  categories,
  categoryGroups,
  type CategoryId,
} from '../categories';
import { fontSize, radius, spacing, useColors, useThemedStyles, type Palette } from '../theme';

const icons: Record<CategoryId, keyof typeof Ionicons.glyphMap> = {
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

type Props = {
  visible: boolean;
  selected: CategoryId;
  onSelect: (id: CategoryId) => void;
  onClose: () => void;
};

export function CategoryPickerSheet({ visible, selected, onSelect, onClose }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Pressable hitSlop={8} onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Choose a topic</Text>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
          {categoryGroups
            .map((g) => ({ group: g, items: categories.filter((c) => c.group === g.id) }))
            .filter((g) => g.items.length > 0)
            .map(({ group, items }) => (
              <View key={group.id} style={styles.groupBlock}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {items.map((c) => {
                  const isSelected = c.id === selected;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        onSelect(c.id);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        isSelected && styles.rowSelected,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View
                        style={[
                          styles.icon,
                          isSelected && { backgroundColor: colors.accent },
                        ]}
                      >
                        <Ionicons
                          name={icons[c.id]}
                          size={18}
                          color={isSelected ? colors.accentText : colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowLabel}>{c.label}</Text>
                        <Text style={styles.rowBlurb} numberOfLines={2}>
                          {c.blurb}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingBottom: spacing.xl,
      maxHeight: '85%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    cancel: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      fontWeight: '600',
      width: 56,
    },
    scroll: { maxHeight: '100%' },
    scrollInner: { padding: spacing.lg, gap: spacing.md },
    groupBlock: { gap: spacing.xs },
    groupLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.bg,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    rowSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    rowBlurb: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
  });
