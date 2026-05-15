import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export default function RecordButton({ isRecording, onPress, disabled }: Props) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0, duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glow.stopAnimation();
      glow.setValue(0);
    }
  }, [isRecording]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  const glowScale  = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.button, disabled && styles.disabled]}
    >
      {isRecording && (
        <Animated.View
          style={[
            styles.glow,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />
      )}
      <Text style={styles.icon}>{isRecording ? '■' : '⏺'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  glow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.teal,
  },
  icon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
});
