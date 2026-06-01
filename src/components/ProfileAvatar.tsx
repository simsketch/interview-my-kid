import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Profile } from '../db/profiles';
import { useColors } from '../theme';

type Props = {
  profile: Profile | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function ProfileAvatar({ profile, size = 32, style }: Props) {
  const colors = useColors();
  const radius = size / 2;
  const emojiSize = Math.round(size * 0.55);

  if (profile?.photoPath) {
    return (
      <Image
        source={{ uri: profile.photoPath }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.bgElevated,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.accentSoft,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{profile?.emoji ?? '🧒'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
