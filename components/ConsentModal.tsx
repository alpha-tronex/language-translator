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
            <Text style={styles.title} accessibilityRole="header">Before you start</Text>
            <Text style={styles.intro}>
              To translate and speak your phrases, this app sends them to online services. Please read the following before continuing.
            </Text>

            <Text style={styles.sectionTitle}>What data is sent</Text>
            <Text style={styles.body}>
              • Your voice recording (a phrase to translate, or a practice attempt) is sent to OpenAI to be turned into text.{'\n'}
              • The text you speak or type is sent to OpenAI for translation.{'\n'}
              • The translation is sent to OpenAI to generate spoken audio. For Wolof and Bambara, it is sent to our own voice server instead.
            </Text>

            <Text style={styles.sectionTitle}>Who receives your data</Text>
            <Text style={styles.body}>
              OpenAI (openai.com) and, for Wolof and Bambara audio, a server we operate. Your recordings and text are not saved by this app&apos;s backend after the result is returned.
            </Text>

            <Text style={styles.sectionTitle}>What stays on your device</Text>
            <Text style={styles.body}>
              Your practice list, scores and streak are stored only on this device.
            </Text>

            <Text style={styles.sectionTitle}>Your privacy</Text>
            <Text style={styles.body}>
              No data is linked to your identity. No account is required. You can review our full privacy policy at:{'\n'}
              https://language-translator-apivercelapp.vercel.app/privacy
            </Text>

            <Text style={styles.footer}>
              By tapping Agree, you consent to your recordings and text being sent to these services for translation and speech.
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
              accessibilityHint="Agrees to send your recordings and text for translation, then continues"
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
