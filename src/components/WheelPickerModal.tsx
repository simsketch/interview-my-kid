import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing, useColors, useThemedStyles, type Palette } from '../theme';

export type WheelPickerOption = {
  label: string;
  value: string;
};

type Props = {
  visible: boolean;
  title: string;
  options: WheelPickerOption[];
  selectedValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function WheelPickerModal({
  visible,
  title,
  options,
  selectedValue,
  onConfirm,
  onClose,
}: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState(selectedValue);

  useEffect(() => {
    if (visible) setDraft(selectedValue);
  }, [visible, selectedValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <Pressable hitSlop={8} onPress={onClose}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable hitSlop={8} onPress={() => onConfirm(draft)}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <Picker
          selectedValue={draft}
          onValueChange={(v) => setDraft(String(v))}
          itemStyle={{ color: colors.text, fontSize: fontSize.lg }}
        >
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
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
    },
    done: {
      color: colors.accent,
      fontSize: fontSize.md,
      fontWeight: '800',
    },
  });
