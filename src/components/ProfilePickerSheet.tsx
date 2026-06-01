import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Profile } from '../db/profiles';
import { fontSize, radius, spacing, useColors, useThemedStyles, type Palette } from '../theme';
import { ProfileAvatar } from './ProfileAvatar';

type Props = {
  visible: boolean;
  profiles: Profile[];
  activeProfileId: string | null;
  /** When true, also show an "All kids" option above the profile list. */
  showAllOption?: boolean;
  allSelected?: boolean;
  onSelect: (id: string) => void;
  onSelectAll?: () => void;
  onManage: () => void;
  onClose: () => void;
};

export function ProfilePickerSheet({
  visible,
  profiles,
  activeProfileId,
  showAllOption,
  allSelected,
  onSelect,
  onSelectAll,
  onManage,
  onClose,
}: Props) {
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
          <Text style={styles.title}>Choose a profile</Text>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
          {showAllOption ? (
            <Pressable
              onPress={() => {
                onSelectAll?.();
                onClose();
              }}
              style={({ pressed }) => [
                styles.row,
                allSelected && styles.rowSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.allIcon}>
                <Ionicons name="people" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>All kids</Text>
                <Text style={styles.rowMeta}>Show every profile&apos;s sessions</Text>
              </View>
              {allSelected ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              ) : null}
            </Pressable>
          ) : null}
          {profiles.map((p) => {
            const isSelected = !allSelected && p.id === activeProfileId;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  onSelect(p.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <ProfileAvatar profile={p} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{p.name}</Text>
                  <Text style={styles.rowMeta}>
                    {p.targetAge != null ? `${p.targetAge} years old` : 'Any age'}
                  </Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              onManage();
              onClose();
            }}
            style={({ pressed }) => [
              styles.manageRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="settings-outline" size={18} color={colors.accent} />
            <Text style={styles.manageText}>Manage profiles</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
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
    scrollInner: { padding: spacing.lg, gap: spacing.xs },
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
    rowLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    rowMeta: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: 2,
    },
    allIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    manageText: {
      color: colors.accent,
      fontSize: fontSize.md,
      fontWeight: '700',
      flex: 1,
    },
  });
