/**
 * Typography from design brief:
 * Headlines: Elegant serif (Playfair Display / Cormorant)
 * Body: Clean sans (Inter / DM Sans)
 * Accent: Script for "Pinky" (Allura / Great Vibes)
 * Using system equivalents until custom fonts loaded.
 */
export const typography = {
  display: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 48,
    fontWeight: '900' as const,
    letterSpacing: -1,
    lineHeight: 52,
  },
  headline: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  headlineSmall: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySemiBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelCaps: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  script: {
    fontFamily: 'Allura_400Regular',
    fontSize: 40,
    fontWeight: '400' as const,
  },
} as const;

