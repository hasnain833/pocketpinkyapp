import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  dark?: boolean;
  glass?: boolean;
  glow?: boolean;
}

export function Card({ children, style, dark, glass, glow }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: dark ? colors.dark : glass ? colors.glass : colors.card,
          borderColor: dark ? colors.darkLight : colors.border,
          borderWidth: 1,
        },
        glow && {
          shadowColor: colors.primary,
          shadowOpacity: 0.2,
          shadowRadius: 15,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
});

