import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useThemedStyles,
  type Palette,
} from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[`${variant}Base` as const],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styles[`${variant}Text` as const].color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, styles[`${variant}Text` as const]]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    base: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { fontSize: fontSize.md, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    primaryBase: { backgroundColor: colors.accent, ...shadow.pill },
    primaryText: { color: colors.accentText },
    secondaryBase: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: { color: colors.text },
    ghostBase: { backgroundColor: 'transparent' },
    ghostText: { color: colors.textMuted },
    dangerBase: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    dangerText: { color: colors.danger },
  });
};
