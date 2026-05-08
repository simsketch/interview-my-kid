import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fontSize,
  makeShadow,
  radius,
  spacing,
  themes,
  useColors,
  useThemedStyles,
  type Palette,
} from '../../src/theme';

export default function HelpScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBubble}>
            <Ionicons name="chatbubble-ellipses" size={32} color={colors.accent} />
          </View>
          <Text style={styles.heroTitle}>How it works</Text>
          <Text style={styles.heroBody}>
            A guided way to record short video interviews with your kid using
            AI-prompted cue cards. Everything stays on your device.
          </Text>
          <Pressable
            onPress={() => router.push('/new/setup')}
            style={({ pressed }) => [
              styles.heroCta,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add" size={20} color={colors.accentText} />
            <Text style={styles.heroCtaText}>Start your first interview</Text>
          </Pressable>
        </View>

        {/* Step 1 */}
        <Step number={1} icon="albums" title="Pick a topic">
          <Text style={styles.stepBody}>
            Choose a category that fits the moment. Categories are grouped by
            type — sports, school, daily life, special moments, and free-form.
          </Text>
          <View style={styles.demoCategoryGrid}>
            <DemoCategoryCard
              icon="sunny"
              label="Pre-game"
              blurb="Mood, expectations, what they're working on."
              selected={false}
            />
            <DemoCategoryCard
              icon="school"
              label="After school"
              blurb="What stood out, what was hard."
              selected={true}
            />
          </View>
        </Step>

        {/* Step 2 */}
        <Step number={2} icon="sparkles" title="Generate cue cards">
          <Text style={styles.stepBody}>
            The AI writes seven warm, age-appropriate questions you can edit,
            reorder, or regenerate. Or skip the AI entirely and use the curated
            built-in question bank.
          </Text>
          <View style={styles.demoCardList}>
            <DemoCueCard
              number={1}
              text="What was your favorite moment from today?"
              focused={true}
            />
            <DemoCueCard
              number={2}
              text="Tell me about a play you want to remember."
              focused={false}
            />
            <DemoCueCard
              number={3}
              text="What's one thing you're proud of?"
              focused={false}
            />
          </View>
          <View style={styles.inlineHint}>
            <Ionicons name="information-circle" size={14} color={colors.textMuted} />
            <Text style={styles.inlineHintText}>
              Long-press the handle on the left of any card to drag and reorder.
            </Text>
          </View>
        </Step>

        {/* Step 3 */}
        <Step number={3} icon="videocam" title="Record">
          <Text style={styles.stepBody}>
            The rear camera fills the screen. The cue card sits over the camera
            preview as a teleprompter only YOU see — read it aloud while your
            kid answers. Tap Next/Prev to move through the cards.
          </Text>
          <DemoRecordingOverlay />
        </Step>

        {/* Step 4 */}
        <Step number={4} icon="save" title="Save and replay">
          <Text style={styles.stepBody}>
            Stop the recording — the session saves automatically with the
            questions you used. The Sessions tab shows your full library.
          </Text>
          <DemoSessionRow />
        </Step>

        {/* Step 5 */}
        <Step number={5} icon="bookmark" title="Save sets you love">
          <Text style={styles.stepBody}>
            Tap "Save this set" on the Edit Cards screen to keep a set you
            generated. Reuse it anytime from the Sets tab or the Setup screen.
          </Text>
          <DemoSavedSetCard />
        </Step>

        {/* AI Providers */}
        <SectionHeader>AI providers</SectionHeader>
        <View style={styles.providerList}>
          <ProviderCard
            icon="phone-portrait"
            label="On-device"
            chip="Apple Intelligence"
            body="Free, fast, fully offline. iPhone 15 Pro+ on iOS 26 with Apple Intelligence enabled."
          />
          <ProviderCard
            icon="cloud"
            label="OpenRouter"
            chip="Cloud · top quality"
            body="Bring your own key from openrouter.ai/keys. Best question quality across providers."
          />
          <ProviderCard
            icon="library"
            label="Built-in bank"
            chip="No setup"
            body="360+ hand-curated questions across 11 categories. Always works, always free."
          />
        </View>

        {/* Themes */}
        <SectionHeader>Six themes</SectionHeader>
        <Text style={styles.sectionBody}>
          Tap Settings → Theme. Camera-screen text stays readable on every theme.
        </Text>
        <View style={styles.themeGrid}>
          {Object.values(themes).map((t) => (
            <View key={t.id} style={styles.themeChip}>
              <View style={[styles.themeBg, { backgroundColor: t.colors.bg }]}>
                <View style={[styles.themeDot, { backgroundColor: t.colors.accent }]} />
                <View
                  style={[
                    styles.themeDot,
                    { backgroundColor: t.colors.accentSecondary },
                  ]}
                />
                <View
                  style={[
                    styles.themeDot,
                    { backgroundColor: t.colors.accentTertiary },
                  ]}
                />
              </View>
              <Text style={styles.themeName}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* Burn-in */}
        <SectionHeader>Burn-in (optional)</SectionHeader>
        <Text style={styles.sectionBody}>
          When you export to Photos, the app can bake the question text into the
          video so it shows up alongside the answer. Toggle this in Settings →
          "Burn prompts on export". The in-app player lets you switch between
          burned and clean versions.
        </Text>
        <DemoBurnedToggle />

        {/* Tips */}
        <SectionHeader>Tips</SectionHeader>
        <View style={styles.tipsCard}>
          {[
            'Long-press the handle on a card to drag and reorder.',
            'Save a set you use often, then reuse it from the Sets tab.',
            'Switch overlay position in Settings if the camera angle is unusual.',
            'The clean video is always preserved — burning in is non-destructive.',
            'Set your kid\'s name in Settings to make AI questions feel personal.',
          ].map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <SectionHeader>FAQ</SectionHeader>
        <FAQ
          q="Does any data leave my phone?"
          a="No videos, prompts, or personal info are sent anywhere. The only outbound traffic is to OpenRouter — and only when you've added an API key and chosen Cloud generation."
        />
        <FAQ
          q="Can I record without an internet connection?"
          a="Yes. Use the on-device Apple Intelligence provider, or the built-in question bank. Recording itself never needs the internet."
        />
        <FAQ
          q="Where are my videos stored?"
          a="In the app's private Documents directory on this device. Delete a session and the video file is removed."
        />
        <FAQ
          q="What happens to my saved sets if I reinstall the app?"
          a="Reinstalls clear app data. To preserve sets, save the videos to Photos before uninstalling, and screenshot any saved sets you want to recreate."
        />

        <Text style={styles.footer}>
          A personal app · Made for capturing your kid&apos;s answers, on your terms.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ children }: { children: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Step({
  number,
  icon,
  title,
  children,
}: {
  number: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{number}</Text>
        </View>
        <Ionicons name={icon} size={20} color={colors.accent} />
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <View style={styles.stepBodyWrap}>{children}</View>
    </View>
  );
}

// ── Inline UI demo components ──────────────────────────────────────────────

function DemoCategoryCard({
  icon,
  label,
  blurb,
  selected,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  blurb: string;
  selected: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.demoCatCard,
        selected && {
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
      ]}
    >
      <View
        style={[
          styles.demoCatIcon,
          selected && { backgroundColor: colors.accent },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={selected ? colors.accentText : colors.accent}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.demoCatLabel}>{label}</Text>
        <Text style={styles.demoCatBlurb} numberOfLines={2}>
          {blurb}
        </Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
      ) : null}
    </View>
  );
}

function DemoCueCard({
  number,
  text,
  focused,
}: {
  number: number;
  text: string;
  focused: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.demoCueCard,
        focused && { borderColor: colors.accent, borderWidth: 1.5 },
      ]}
    >
      <View style={styles.demoCueHandle}>
        <View style={styles.demoNumberPill}>
          <Text style={styles.demoNumberText}>{number}</Text>
        </View>
        <Ionicons
          name="reorder-three"
          size={14}
          color={colors.textMuted}
          style={{ marginTop: 2 }}
        />
      </View>
      <Text style={styles.demoCueText}>{text}</Text>
    </View>
  );
}

function DemoRecordingOverlay() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.demoPhone}>
      {/* Fake camera feed gradient */}
      <View style={styles.demoCameraFeed}>
        <View style={styles.demoCameraSubject} />
      </View>
      {/* Top bar */}
      <View style={styles.demoTopBar}>
        <View style={styles.demoGlassPill}>
          <Ionicons name="close" size={12} color="#ffffff" />
          <Text style={styles.demoGlassText}>End</Text>
        </View>
        <View style={[styles.demoGlassPill, { gap: 6 }]}>
          <View style={styles.demoRecDot} />
          <Text style={styles.demoGlassText}>0:42</Text>
        </View>
        <View style={styles.demoGlassPill}>
          <Ionicons name="camera-reverse" size={12} color="#ffffff" />
        </View>
      </View>
      {/* Teleprompter card */}
      <View style={styles.demoTeleprompter}>
        <Text style={styles.demoTeleprompterCount}>CARD 2 OF 7</Text>
        <Text style={styles.demoTeleprompterText}>
          What was your favorite moment from today?
        </Text>
      </View>
      {/* Bottom controls */}
      <View style={styles.demoControls}>
        <View style={styles.demoNavBtn}>
          <Ionicons name="chevron-back" size={12} color="#ffffff" />
          <Text style={styles.demoGlassText}>Prev</Text>
        </View>
        <View style={styles.demoRecordBtn}>
          <View style={styles.demoRecordSquare} />
        </View>
        <View style={styles.demoNavBtn}>
          <Text style={styles.demoGlassText}>Next</Text>
          <Ionicons name="chevron-forward" size={12} color="#ffffff" />
        </View>
      </View>
    </View>
  );
}

function DemoSessionRow() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.demoSession}>
      <View style={styles.demoSessionIcon}>
        <Ionicons name="moon" size={16} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.demoSessionPrimary}>
          Post-game · hit 2 homers
        </Text>
        <Text style={styles.demoSessionSecondary}>Today, 7:24 PM</Text>
      </View>
      <Text style={styles.demoSessionDuration}>3:42</Text>
    </View>
  );
}

function DemoSavedSetCard() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.demoSetCard}>
      <View style={styles.demoSetIcon}>
        <Ionicons name="bookmark" size={14} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.demoSetName}>End-of-day check-in</Text>
        <Text style={styles.demoSetMeta}>7 cards · used yesterday</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </View>
  );
}

function DemoBurnedToggle() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.demoToggleWrap}>
      <View style={[styles.demoToggleChip, styles.demoToggleChipActive]}>
        <Text style={styles.demoToggleTextActive}>With prompts</Text>
      </View>
      <View style={styles.demoToggleChip}>
        <Text style={styles.demoToggleText}>Clean version</Text>
      </View>
    </View>
  );
}

function ProviderCard({
  icon,
  label,
  chip,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  chip: string;
  body: string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.providerCard}>
      <View style={styles.providerIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.providerHeaderRow}>
          <Text style={styles.providerTitle}>{label}</Text>
          <View style={styles.providerChip}>
            <Text style={styles.providerChipText}>{chip}</Text>
          </View>
        </View>
        <Text style={styles.providerBody}>{body}</Text>
      </View>
    </View>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.faqCard}>
      <Text style={styles.faqQ}>{q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) => {
  const shadow = makeShadow(colors);
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

    // Hero
    hero: {
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    heroBubble: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    heroTitle: {
      color: colors.text,
      fontSize: fontSize.display,
      fontWeight: '800',
    },
    heroBody: {
      color: colors.textMuted,
      fontSize: fontSize.md,
      lineHeight: fontSize.md * 1.4,
    },
    heroCta: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      ...shadow.pill,
    },
    heroCtaText: {
      color: colors.accentText,
      fontSize: fontSize.sm,
      fontWeight: '800',
    },

    // Step
    stepCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      ...shadow.card,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeText: {
      color: colors.accentText,
      fontWeight: '800',
      fontSize: fontSize.sm,
    },
    stepTitle: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: '700',
      flex: 1,
    },
    stepBody: {
      color: colors.textSubtle,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.5,
    },
    stepBodyWrap: { gap: spacing.sm },
    inlineHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    inlineHintText: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      flex: 1,
    },

    // Demo: category card
    demoCategoryGrid: { gap: spacing.xs },
    demoCatCard: {
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    demoCatIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoCatLabel: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    demoCatBlurb: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginTop: 1,
    },

    // Demo: cue card list
    demoCardList: { gap: spacing.xs },
    demoCueCard: {
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    demoCueHandle: {
      alignItems: 'center',
      gap: 2,
    },
    demoNumberPill: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoNumberText: {
      color: colors.accent,
      fontSize: fontSize.xs,
      fontWeight: '800',
    },
    demoCueText: {
      color: colors.text,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      flex: 1,
    },

    // Demo: phone-frame recording overlay
    demoPhone: {
      backgroundColor: '#0c0c14',
      borderRadius: radius.lg,
      overflow: 'hidden',
      alignSelf: 'center',
      width: 220,
      height: 380,
      borderWidth: 6,
      borderColor: '#1c1c28',
      position: 'relative',
    },
    demoCameraFeed: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#3b3b50',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    demoCameraSubject: {
      width: 90,
      height: 130,
      borderRadius: 45,
      backgroundColor: '#5c5c7a',
      marginBottom: 60,
      opacity: 0.7,
    },
    demoTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    demoGlassPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(15, 15, 26, 0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    demoGlassText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '700',
    },
    demoRecDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.recording,
    },
    demoTeleprompter: {
      position: 'absolute',
      top: 50,
      left: 12,
      right: 12,
      backgroundColor: 'rgba(15, 15, 26, 0.92)',
      borderRadius: radius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    demoTeleprompterCount: {
      color: colors.accent,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 4,
    },
    demoTeleprompterText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
    },
    demoControls: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    demoNavBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(15, 15, 26, 0.85)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    demoRecordBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: 2,
      borderColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoRecordSquare: {
      width: 14,
      height: 14,
      borderRadius: 2,
      backgroundColor: colors.recording,
    },

    // Demo: session row
    demoSession: {
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    demoSessionIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoSessionPrimary: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '700',
    },
    demoSessionSecondary: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      marginTop: 1,
    },
    demoSessionDuration: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },

    // Demo: saved set card
    demoSetCard: {
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    demoSetIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoSetName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
    demoSetMeta: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 1 },

    // Demo: burned toggle
    demoToggleWrap: {
      flexDirection: 'row',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: colors.bgElevated,
      padding: 4,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    demoToggleChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    demoToggleChipActive: { backgroundColor: colors.accent },
    demoToggleText: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '700',
    },
    demoToggleTextActive: {
      color: colors.accentText,
      fontSize: fontSize.xs,
      fontWeight: '700',
    },

    // Section headers + body
    sectionLabel: {
      color: colors.textMuted,
      fontSize: fontSize.xs,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    sectionBody: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.5,
    },

    // Provider cards
    providerList: { gap: spacing.sm },
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
    providerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 2,
    },
    providerTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
    providerChip: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    providerChipText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    providerBody: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
    },

    // Theme grid
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    themeChip: {
      width: 88,
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    themeBg: {
      height: 36,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
    },
    themeDot: { width: 10, height: 10, borderRadius: 5 },
    themeName: {
      color: colors.text,
      fontSize: fontSize.xs,
      fontWeight: '700',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },

    // Tips
    tipsCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    tipText: {
      color: colors.textSubtle,
      fontSize: fontSize.sm,
      flex: 1,
      lineHeight: fontSize.sm * 1.4,
    },

    // FAQ
    faqCard: {
      backgroundColor: colors.bgElevated,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xs,
    },
    faqQ: {
      color: colors.text,
      fontSize: fontSize.sm,
      fontWeight: '800',
      marginBottom: spacing.xs,
    },
    faqA: {
      color: colors.textMuted,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
    },

    footer: {
      color: colors.textDim,
      fontSize: fontSize.xs,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
};
