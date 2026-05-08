import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

type Step = { title: string; body: string; icon: keyof typeof Ionicons.glyphMap };

const steps: Step[] = [
  {
    icon: 'add-circle',
    title: 'Start a new interview',
    body: 'Tap "New interview" on the Sessions tab. Pick a category — pre-game, post-game, a specific moment, or season-level.',
  },
  {
    icon: 'sparkles',
    title: 'Generate the cue cards',
    body: 'Type any context about today (optional), then tap Generate. The AI writes 7 short questions you can edit, reorder, or regenerate.',
  },
  {
    icon: 'videocam',
    title: 'Record',
    body: 'The rear camera records. The cue card sits on YOUR screen as a teleprompter — read it aloud to your kid. Tap Next/Prev to move through cards while recording.',
  },
  {
    icon: 'save',
    title: 'Save and replay',
    body: 'Stop the recording — the session saves automatically with the questions you used. Tap any session to replay the video, see the prompts, or export to Photos.',
  },
];

type Provider = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

const providers: Provider[] = [
  {
    icon: 'phone-portrait',
    title: 'On-device (Apple Intelligence)',
    body: 'Free, fast, fully offline. Requires iOS 26+ on a supported iPhone. If unavailable, enable it in iOS Settings → Apple Intelligence & Siri.',
  },
  {
    icon: 'cloud',
    title: 'OpenRouter (cloud)',
    body: 'Best quality. Needs an API key from openrouter.ai/keys, pasted into Settings. Works on any iPhone but requires internet.',
  },
  {
    icon: 'library',
    title: 'Built-in question bank',
    body: 'A curated set of questions per category. No AI, no key, no network. Always available as a fallback.',
  },
];

const tips = [
  'Tap a card on the recording screen to see it bigger if you need to.',
  'You can edit a generated card directly — tap the text and type.',
  'Switch overlay position in Settings if the camera is filming overhead.',
  'Burn-in mode bakes the question text into the saved video — handy for sharing.',
];

export default function HelpScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>How it works</Text>
          <Text style={styles.subtitle}>
            A guided way to record interviews with your kid using AI-generated cue cards
          </Text>
        </View>

        <Text style={styles.sectionLabel}>The flow</Text>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{i + 1}</Text>
              </View>
              <Ionicons name={s.icon} size={20} color={colors.accent} />
              <Text style={styles.stepTitle}>{s.title}</Text>
            </View>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>AI providers</Text>
        {providers.map((p) => (
          <View key={p.title} style={styles.providerCard}>
            <View style={styles.providerIcon}>
              <Ionicons name={p.icon} size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.providerTitle}>{p.title}</Text>
              <Text style={styles.providerBody}>{p.body}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Tips</Text>
        <View style={styles.tipsCard}>
          {tips.map((t) => (
            <View key={t} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>{t}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          A personal app · Made for capturing your kid&apos;s answers, on your terms.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.sm },
    header: { marginBottom: spacing.md },
    title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800' },
    subtitle: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      marginTop: spacing.xs,
      lineHeight: fontSize.md * 1.4,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    stepCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    stepBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: {
      color: colors.accentText,
      fontWeight: '800',
      fontSize: fontSize.sm,
    },
    stepTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
    stepBody: {
      color: colors.textSubtle,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      marginLeft: 26 + spacing.sm + 20 + spacing.sm,
    },
    providerCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
    },
    providerIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    providerTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    providerBody: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      marginTop: 2,
    },
    tipsCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.card,
    },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    tipText: {
      color: colors.textSubtle,
      fontSize: fontSize.sm,
      flex: 1,
      lineHeight: fontSize.sm * 1.4,
    },
    footer: {
      color: colors.textDim,
      fontSize: fontSize.xs,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
};
