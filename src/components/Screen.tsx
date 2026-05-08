import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, useThemedStyles, type Palette } from '../theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({ children, scroll, contentStyle, edges }: Props) {
  const styles = useThemedStyles(makeStyles);
  const inner = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ['top', 'bottom', 'left', 'right']}>
      {inner}
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: { flexGrow: 1, padding: spacing.lg },
  });
