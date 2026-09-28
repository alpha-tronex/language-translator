import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  // Single-button mode (default)
  buttonLabel?: string;
  onClose: () => void;
  // Confirm mode — shows Cancel + Confirm buttons
  confirmLabel?: string;
  onConfirm?: () => void;
};

export default function AlertModal({
  visible,
  title,
  message,
  buttonLabel = 'Got it',
  onClose,
  confirmLabel,
  onConfirm,
}: Props) {
  const isConfirmMode = !!onConfirm;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="alert-modal"
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.message} testID="alert-modal-message">{message}</Text>
          <View style={styles.divider} />

          {isConfirmMode ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                testID="alert-modal-cancel-button"
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityHint="Closes this message without making changes"
                style={[styles.button, styles.buttonLeft]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.verticalDivider} />
              <TouchableOpacity
                testID="alert-modal-confirm-button"
                accessibilityRole="button"
                accessibilityLabel={confirmLabel ?? 'Continue'}
                accessibilityHint="Confirms and continues"
                style={[styles.button, styles.buttonRight]}
                onPress={() => { onClose(); onConfirm(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmLabel}>{confirmLabel ?? 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              testID="alert-modal-close-button"
              accessibilityRole="button"
              accessibilityLabel={buttonLabel}
              accessibilityHint="Closes this message"
              style={styles.button}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonLabel}>{buttonLabel}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    overflow: 'hidden',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
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
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonLeft: {
    flex: 1,
  },
  buttonRight: {
    flex: 1,
  },
  buttonLabel: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cancelLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  confirmLabel: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
