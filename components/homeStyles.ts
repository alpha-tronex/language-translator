// @testability-exempt: style sheet only, no logic
import { StyleSheet } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

export const homeStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    width: '100%',
    alignSelf: 'center',
  },
  containerTablet: {
    maxWidth: 480,
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  swap: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    paddingBottom: 14,
  },
  panelArea: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  spinnerArea: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  spacer: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  reRecordBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reRecordLabel: {
    color: colors.destructive,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  translateBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  playBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  recordArea: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  recordLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  swapDisabled: {
    opacity: 0.3,
  },
  detectedChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detectedLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
