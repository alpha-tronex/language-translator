import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SUPPORTED_LANGUAGES, Language } from '../lib/languages';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  visible: boolean;
  selected: Language | null;
  onSelect: (lang: Language) => void;
  onClose: () => void;
};

export default function LanguageModal({ visible, selected, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Dim overlay — tap to dismiss */}
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.heading}>Select language</Text>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selected?.code === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => { onSelect(lang); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.label, isSelected && styles.labelSelected]}>
                  {lang.label}
                </Text>
                <Text style={styles.nativeLabel}>{lang.nativeLabel}</Text>
              </TouchableOpacity>
            );
          })}
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
  heading: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: `${colors.accent}18`,
  },
  label: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  labelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  nativeLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
