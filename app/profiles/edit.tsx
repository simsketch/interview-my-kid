import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { Button } from '../../src/components/Button';
import { WheelPickerModal } from '../../src/components/WheelPickerModal';
import {
  EMOJI_CHOICES,
  createProfile,
  getProfile,
  updateProfile,
  type Profile,
} from '../../src/db/profiles';
import {
  MAX_TARGET_AGE,
  MIN_TARGET_AGE,
  setActiveProfileId,
} from '../../src/storage/keychain';
import {
  fontSize,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

export default function ProfileEditScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string>('🧒');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [targetAge, setTargetAge] = useState<number | null>(null);
  const [agePickerOpen, setAgePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getProfile(db, id)
      .then((p) => {
        if (!active || !p) return;
        setProfile(p);
        setName(p.name);
        setEmoji(p.emoji ?? '🧒');
        setPhotoPath(p.photoPath);
        setTargetAge(p.targetAge);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [db, id]);

  async function handlePickPhoto() {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Photo access denied',
        'Allow Photos access in Settings to pick a profile picture.'
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    try {
      const dir = `${FileSystem.documentDirectory}profiles/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const dest = `${dir}${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      setPhotoPath(dest);
    } catch (err) {
      Alert.alert(
        'Could not save photo',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function handleClearPhoto() {
    setPhotoPath(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Enter a name for the profile.');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createProfile(db, {
          name: trimmed,
          emoji,
          photoPath,
          targetAge,
        });
        await setActiveProfileId(created.id);
      } else if (profile) {
        // If photo changed, clean up old file
        if (profile.photoPath && profile.photoPath !== photoPath) {
          FileSystem.deleteAsync(profile.photoPath, { idempotent: true }).catch(
            () => undefined
          );
        }
        await updateProfile(db, profile.id, {
          name: trimmed,
          emoji,
          photoPath,
          targetAge,
        });
      }
      router.back();
    } catch (err) {
      Alert.alert(
        'Save failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSaving(false);
    }
  }

  const ageOptions = [
    { label: 'Any age', value: 'any' },
    ...Array.from({ length: MAX_TARGET_AGE - MIN_TARGET_AGE + 1 }, (_, i) => {
      const age = MIN_TARGET_AGE + i;
      return { label: `${age} years old`, value: String(age) };
    }),
  ];

  function applyAge(value: string) {
    setAgePickerOpen(false);
    if (value === 'any') {
      setTargetAge(null);
      return;
    }
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) setTargetAge(n);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarRow}>
            {photoPath ? (
              <Image source={{ uri: photoPath }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarEmoji}>
                <Text style={{ fontSize: 64 }}>{emoji}</Text>
              </View>
            )}
            <View style={styles.avatarActions}>
              <Pressable
                onPress={handlePickPhoto}
                style={({ pressed }) => [
                  styles.avatarBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons name="image" size={16} color={colors.accent} />
                <Text style={styles.avatarBtnLabel}>
                  {photoPath ? 'Change photo' : 'Use photo'}
                </Text>
              </Pressable>
              {photoPath ? (
                <Pressable
                  onPress={handleClearPhoto}
                  style={({ pressed }) => [
                    styles.avatarBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.textMuted}
                  />
                  <Text style={styles.avatarBtnLabel}>Remove photo</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {!photoPath ? (
            <View style={styles.section}>
              <Text style={styles.label}>Emoji</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_CHOICES.map((e) => {
                  const selected = e === emoji;
                  return (
                    <Pressable
                      key={e}
                      onPress={() => setEmoji(e)}
                      style={({ pressed }) => [
                        styles.emojiBtn,
                        selected && styles.emojiBtnSelected,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="What do you call them?"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Target age</Text>
            <Text style={styles.helper}>
              Helps the AI pick vocabulary and tone. You can leave it as Any.
            </Text>
            <Pressable
              onPress={() => setAgePickerOpen(true)}
              style={({ pressed }) => [
                styles.ageRow,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="person" size={16} color={colors.accent} />
              <Text style={styles.ageValue}>
                {targetAge != null ? `${targetAge} years old` : 'Any age'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label={saving ? 'Saving…' : isNew ? 'Add profile' : 'Save'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
      <WheelPickerModal
        visible={agePickerOpen}
        title="Target age"
        options={ageOptions}
        selectedValue={targetAge != null ? String(targetAge) : 'any'}
        onConfirm={applyAge}
        onClose={() => setAgePickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    avatarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatarImage: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.bgElevated,
    },
    avatarEmoji: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarActions: {
      flex: 1,
      gap: spacing.xs,
    },
    avatarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.bgElevated,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarBtnLabel: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    section: { gap: spacing.xs },
    label: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    helper: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    emojiBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgElevated,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    emojiBtnSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    emojiText: { fontSize: 24 },
    input: {
      backgroundColor: colors.bgInput,
      color: colors.text,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: fontSize.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.bgElevated,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ageValue: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      flex: 1,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
  });
