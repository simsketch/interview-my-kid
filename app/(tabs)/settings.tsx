import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generate as fmGenerate } from '../../modules/foundation-models';
import {
  foundationUnavailableReason,
  isFoundationAvailable,
} from '../../src/ai/foundation';
import { Button } from '../../src/components/Button';
import {
  DEFAULT_MODEL,
  clearApiKey,
  getApiKey,
  getBurnIn,
  getKidName,
  getModel,
  getOverlayPosition,
  getProvider,
  setApiKey,
  setBurnIn,
  setKidName,
  setModel,
  setOverlayPosition,
  setProvider,
  type OverlayPosition,
  type ProviderPreference,
} from '../../src/storage/keychain';
import {
  fontSize,
  radius,
  spacing,
  themes,
  useColors,
  useTheme,
  useThemedStyles,
  type Palette,
  type ThemeName,
} from '../../src/theme';

const providerOptions: {
  id: ProviderPreference;
  label: string;
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'auto', label: 'Auto', blurb: 'Try on-device first, then OpenRouter, then built-in.', icon: 'flash' },
  { id: 'on_device', label: 'On-device only', blurb: 'Apple Intelligence. Works offline.', icon: 'phone-portrait' },
  { id: 'cloud', label: 'OpenRouter only', blurb: 'Cloud model via your API key.', icon: 'cloud' },
  { id: 'static', label: 'Built-in only', blurb: 'Curated questions, no AI.', icon: 'library' },
];

const positionOptions: {
  id: OverlayPosition;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'top', label: 'Top', icon: 'arrow-up' },
  { id: 'middle', label: 'Middle', icon: 'remove' },
  { id: 'bottom', label: 'Bottom', icon: 'arrow-down' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { theme, themeName, setTheme } = useTheme();

  const [apiKey, setApiKeyLocal] = useState('');
  const [model, setModelLocal] = useState('');
  const [kidName, setKidNameLocal] = useState('');
  const [provider, setProviderLocal] = useState<ProviderPreference>('auto');
  const [overlayPos, setOverlayPosLocal] = useState<OverlayPosition>('top');
  const [burnIn, setBurnInLocal] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fmStatus, setFmStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [fmReason, setFmReason] = useState<string | null>(null);
  const [fmTesting, setFmTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const [k, m, n, p, op, bi] = await Promise.all([
        getApiKey(),
        getModel(),
        getKidName(),
        getProvider(),
        getOverlayPosition(),
        getBurnIn(),
      ]);
      setHasExistingKey(Boolean(k && k.length > 0));
      setModelLocal(m);
      setKidNameLocal(n ?? '');
      setProviderLocal(p);
      setOverlayPosLocal(op);
      setBurnInLocal(bi);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const ok = await isFoundationAvailable();
      if (!active) return;
      if (ok) {
        setFmStatus('available');
        setFmReason(null);
      } else {
        setFmStatus('unavailable');
        setFmReason(await foundationUnavailableReason());
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      if (apiKey.trim().length > 0) {
        await setApiKey(apiKey.trim());
        setApiKeyLocal('');
        setHasExistingKey(true);
      }
      await setModel(model);
      await setKidName(kidName);
      await setProvider(provider);
      await setOverlayPosition(overlayPos);
      await setBurnIn(burnIn);
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleClearKey() {
    Alert.alert('Clear API key?', 'You can paste a new one any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearApiKey();
          setHasExistingKey(false);
          setApiKeyLocal('');
        },
      },
    ]);
  }

  async function handleTestOnDevice() {
    setFmTesting(true);
    try {
      const out = await fmGenerate(
        'Reply with the single word READY and nothing else.',
        'Are you ready?'
      );
      Alert.alert('On-device test', `Response:\n${out.trim()}`);
    } catch (err) {
      Alert.alert(
        'On-device test failed',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setFmTesting(false);
    }
  }

  if (!loaded) {
    return <SafeAreaView style={styles.safe} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Settings</Text>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Section label="Profiles" sub="One profile per kid">
            <Pressable
              onPress={() => router.push('/profiles')}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.linkIcon}>
                <Ionicons name="people" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkText}>Manage profiles</Text>
                <Text style={styles.linkSub}>
                  Add or edit kids, set target ages, pick a photo or emoji
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </Section>

          <Section label="Theme" sub={`Currently: ${theme.label}`}>
            <View style={styles.themeGrid}>
              {(Object.values(themes) as (typeof themes)[ThemeName][]).map((t) => {
                const selected = t.id === themeName;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTheme(t.id)}
                    style={({ pressed }) => [
                      styles.themeCard,
                      selected && styles.themeCardSelected,
                      pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                    ]}
                  >
                    <View style={[styles.themePreview, { backgroundColor: t.colors.bg }]}>
                      <View style={[styles.themeSwatch, { backgroundColor: t.colors.accent }]} />
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: t.colors.accentSecondary },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatch,
                          { backgroundColor: t.colors.accentTertiary },
                        ]}
                      />
                    </View>
                    <View style={styles.themeMeta}>
                      <Text style={styles.themeLabel}>{t.label}</Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color={colors.accent}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.themeDesc}>{t.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section
            label="AI Provider"
            sub={`Apple Intelligence: ${
              fmStatus === 'checking'
                ? 'checking…'
                : fmStatus === 'available'
                  ? 'available ✓'
                  : `unavailable — ${fmReason ?? 'unknown'}`
            }`}
          >
            <View style={styles.providerList}>
              {providerOptions.map((opt) => {
                const selected = opt.id === provider;
                const disabled = opt.id === 'on_device' && fmStatus === 'unavailable';
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => !disabled && setProviderLocal(opt.id)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.providerCard,
                      selected && styles.providerCardSelected,
                      pressed && !disabled && { opacity: 0.7 },
                      disabled && { opacity: 0.5 },
                    ]}
                  >
                    <View
                      style={[
                        styles.providerIconWrap,
                        selected && { backgroundColor: colors.accent },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={selected ? colors.accentText : colors.accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.providerLabel}>{opt.label}</Text>
                      <Text style={styles.providerBlurb}>{opt.blurb}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={fmTesting ? 'Testing…' : 'Test on-device model'}
              variant="secondary"
              onPress={handleTestOnDevice}
              loading={fmTesting}
              disabled={fmStatus !== 'available'}
            />
          </Section>

          <Section
            label="Cue Card Overlay"
            sub="Where the prompt sits on screen while you record."
          >
            <View style={styles.row}>
              {positionOptions.map((opt) => {
                const selected = opt.id === overlayPos;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setOverlayPosLocal(opt.id)}
                    style={({ pressed }) => [
                      styles.posChip,
                      selected && styles.posChipSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={selected ? colors.accentText : colors.text}
                    />
                    <Text
                      style={[
                        styles.posChipText,
                        selected && styles.posChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Burn prompts on export</Text>
                <Text style={styles.toggleSub}>
                  When you export to Photos, bake the question text into the video. Recording itself is always saved clean so you can review it right away.
                </Text>
              </View>
              <Switch
                value={burnIn}
                onValueChange={setBurnInLocal}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </Section>

          <Section
            label="OpenRouter API Key"
            sub={
              hasExistingKey
                ? 'A key is saved. Leave blank to keep it.'
                : 'Get a key from openrouter.ai/keys.'
            }
          >
            <TextInput
              value={apiKey}
              onChangeText={setApiKeyLocal}
              placeholder={hasExistingKey ? '•••••••• (saved)' : 'sk-or-...'}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            {hasExistingKey ? (
              <Button label="Clear saved key" variant="ghost" onPress={handleClearKey} />
            ) : null}
          </Section>

          <Section label="Model" sub={`Default: ${DEFAULT_MODEL}`}>
            <TextInput
              value={model}
              onChangeText={setModelLocal}
              placeholder={DEFAULT_MODEL}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Section>

          <Section label="Kid's name" sub="Used in the AI prompt for personalization.">
            <TextInput
              value={kidName}
              onChangeText={setKidNameLocal}
              placeholder="e.g. Sam"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="words"
            />
          </Section>

          <Button
            label={saving ? 'Saving…' : 'Save settings'}
            onPress={handleSave}
            loading={saving}
          />
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      {children}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
    screenTitle: {
      color: colors.text,
      fontSize: fontSize.display,
      fontWeight: '800',
      marginBottom: spacing.sm,
    },
    section: { gap: spacing.sm, marginBottom: spacing.md },
    sectionLabel: { color: colors.text, fontSize: fontSize.lg, fontWeight: '800' },
    sectionSub: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: -spacing.xs,
      marginBottom: spacing.xs,
      lineHeight: fontSize.sm * 1.4,
    },
    input: {
      backgroundColor: colors.bgInput,
      color: colors.text,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: fontSize.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    themeCard: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    themeCardSelected: {
      borderColor: colors.accent,
    },
    themePreview: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
    },
    themeSwatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    themeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    themeLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '800',
    },
    themeDesc: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: 2,
      lineHeight: fontSize.xs * 1.45,
    },
    providerList: { gap: spacing.sm },
    providerCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    providerCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    providerIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    providerLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    providerBlurb: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
    row: { flexDirection: 'row', gap: spacing.sm },
    posChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    posChipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    posChipText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
    posChipTextSelected: { color: colors.accentText },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.bgElevated,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    toggleSub: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginTop: 2,
      lineHeight: fontSize.xs * 1.45,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.bgElevated,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkText: {
      flex: 1,
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
    },
    linkSub: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      marginTop: 2,
      lineHeight: fontSize.sm * 1.4,
    },
  });
