import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  visible: boolean;
  onAgree: () => void;
  onDecline: () => void;
};

export default function ConsentModal({ visible, onAgree, onDecline }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
      testID="consent-modal"
    >
      <Pressable style={styles.overlay} onPress={() => {}}>
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">Before you record</Text>
            <Text style={styles.intro}>
              To translate your speech, this app sends data to OpenAI. Please read the following before continuing.
            </Text>

            <Text style={styles.sectionTitle}>What data is sent</Text>
            <Text style={styles.body}>
              • Your audio recording is sent to OpenAI Whisper for speech-to-text transcription.{'\n'}
              • The transcribed text is sent to OpenAI GPT-4o-mini for translation.{'\n'}
              • The translated text is sent to OpenAI TTS to generate spoken audio.
            </Text>

            <Text style={styles.sectionTitle}>Who receives your data</Text>
            <Text style={styles.body}>
              All data is processed by OpenAI (openai.com). Your audio and text are not stored by this app or its backend after the translation is returned.
            </Text>

            <Text style={styles.sectionTitle}>Your privacy</Text>
            <Text style={styles.body}>
              No data is linked to your identity. No account is required. You can review our full privacy policy at:{'\n'}
              https://language-translator-apivercelapp.vercel.app/privacy
            </Text>

            <Text style={styles.footer}>
              By tapping Agree, you consent to your audio and text being sent to OpenAI for translation purposes.
            </Text>
          </ScrollView>

          <View style={styles.divider} />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              testID="consent-decline-button"
              accessibilityRole="button"
              accessibilityLabel="Decline"
              accessibilityHint="Closes this notice without recording"
              style={[styles.button, styles.buttonLeft]}
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineLabel}>Decline</Text>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity
              testID="consent-agree-button"
              accessibilityRole="button"
              accessibilityLabel="Agree"
              accessibilityHint="Agrees to send your audio to OpenAI and starts recording"
              style={[styles.button, styles.buttonRight]}
              onPress={onAgree}
              activeOpacity={0.7}
            >
              <Text style={styles.agreeLabel}>Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  body: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonLeft: {},
  buttonRight: {},
  declineLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  agreeLabel: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
