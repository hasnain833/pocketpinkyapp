import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme';

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'dark' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  glow?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { bg?: string; text: string; gradient?: readonly [string, string, ...string[]]; border?: string }> = {
  primary: { gradient: colors.gradients.primary, text: colors.textOnDark },
  secondary: { bg: colors.primaryLight, text: colors.textOnDark },
  accent: { gradient: colors.gradients.gold, text: colors.dark },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  dark: { bg: colors.dark, text: colors.textOnDark },
  ghost: { bg: 'transparent', text: colors.primary },
};

export function Button({ title, onPress, variant = 'primary', disabled, glow, style, textStyle }: ButtonProps) {
  const { bg, text, gradient, border } = variantStyles[variant];

  const content = (
    <View style={[
      styles.content,
      { backgroundColor: bg, borderWidth: border ? 2 : 0, borderColor: border },
      style,
    ]}>
      <Text style={[styles.text, { color: text }, textStyle]}>{title}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        glow && styles.glow,
        disabled && { opacity: 0.6 },
      ]}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, style]}
        >
          <Text style={[styles.text, { color: text }, textStyle]}>{title}</Text>
        </LinearGradient>
      ) : content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.button,
    minHeight: 48,
    overflow: 'hidden',
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

