import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '../theme';
import { PageHeader, Toast } from '../components';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

const SERVICES = [
  {
    id: '1',
    icon: 'search' as const,
    title: 'Vet Him Fast',
    desc: 'Instant read on his true intentions. Background check meets intuition.',
    price: '$29',
    color: colors.accent,
  },
  {
    id: '2',
    icon: 'message-circle' as const,
    title: 'Decode the BS',
    desc: 'What he really meant when he said that. Translation service for mixed signals.',
    price: '$19',
    color: colors.primary,
  },
  {
    id: '3',
    icon: 'edit-3' as const,
    title: 'The Script',
    desc: 'Exact words that work. Pre-written responses for every situation.',
    price: '$24',
    color: colors.secondary,
  },
  {
    id: '4',
    icon: 'heart' as const,
    title: 'Swirl Dating',
    desc: 'Dating without borders. Premium interracial dating strategies.',
    price: '$34',
    color: colors.accent,
  },
  {
    id: '5',
    icon: 'file-text' as const,
    title: 'Full Report',
    desc: 'Data-driven vetting results. Complete compatibility analysis.',
    price: '$49',
    color: colors.primary,
  },
  {
    id: '6',
    icon: 'star' as const,
    title: 'Personal Coach',
    desc: '1-on-1 clarity session. Direct access to your digital big sister.',
    price: '$99',
    color: colors.secondary,
  },
];

const PRICING = [
  { id: 'free', name: 'FREE', price: '$0', sub: 'Kickstart your journey.', color: colors.light, icon: 'gift' as const },
  { id: 'basic', name: 'BASIC', price: '$14.97', period: '/mo', sub: 'Unlimited decoding.', color: colors.accent, icon: 'zap' as const },
  { id: 'premium', name: 'PREMIUM', price: '$24.97', period: '/mo', sub: 'Priority support.', color: colors.primary, popular: true, icon: 'star' as const },
  { id: 'annual', name: 'ANNUAL', price: '$247', period: '/yr', sub: 'Save 17% yearly.', color: colors.secondary, icon: 'award' as const },
];

export function ServicesScreen() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) setToast({ message: error.message, type: 'error', visible: true });
  }

  return (
    <View style={{ flex: 1 }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <PageHeader
        title="Services"
        rightIcon="log-out"
        onRightPress={handleLogout}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Header */}
        <View style={styles.header}>
          <Text style={styles.displayTitle}>
            YOUR <Text style={{ color: colors.primary }}>TOOLKIT</Text>
          </Text>
          <Text style={styles.subtitle}>
            Elite services for modern dating. No fluff, just results.
          </Text>
        </View>

        {/* Glassmorphic Service Cards */}
        <View style={styles.servicesGrid}>
          {SERVICES.map((service, index) => (
            <TouchableOpacity
              key={service.id}
              activeOpacity={0.9}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={['rgba(45, 27, 61, 0.4)', 'rgba(15, 8, 20, 0.6)']}
                style={styles.cardGradient}
              >
                <BlurView intensity={20} tint="dark" style={styles.glassCard}>
                  {/* Neon Glow Border */}
                  <View style={[styles.glowBorder, { borderColor: service.color }]} />

                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: service.color + '20' }]}>
                      <Feather name={service.icon} size={24} color={service.color} />
                    </View>
                    <Text style={styles.price}>{service.price}</Text>
                  </View>

                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.serviceTitle}>{service.title}</Text>
                    <Text style={styles.serviceDesc}>{service.desc}</Text>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.labelCaps}>STEP.0{index + 1}</Text>
                    <Feather name="arrow-right" size={16} color={service.color} />
                  </View>
                </BlurView>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>



        {/* Glassmorphic Pricing Cards */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>
            CHOOSE <Text style={{ color: colors.primary }}>YOUR LEVEL</Text>
          </Text>

          <View style={styles.pricingGrid}>
            {PRICING.map((tier) => (
              <TouchableOpacity
                key={tier.id}
                activeOpacity={0.9}
                style={styles.tierCardWrapper}
              >
                <LinearGradient
                  colors={['rgba(45, 27, 61, 0.3)', 'rgba(15, 8, 20, 0.5)']}
                  style={styles.tierCardGradient}
                >
                  <BlurView intensity={20} tint="dark" style={styles.tierCard}>
                    {tier.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>POPULAR</Text>
                      </View>
                    )}

                    <View style={[styles.tierGlow, { borderColor: tier.color }]} />

                    <View style={styles.tierHeader}>
                      <View style={[styles.tierIconCircle, { backgroundColor: tier.color + '20' }]}>
                        <Feather name={tier.icon} size={20} color={tier.color} />
                      </View>
                      <Text style={styles.tierName}>{tier.name}</Text>
                    </View>

                    <View style={styles.tierPricing}>
                      <Text style={styles.tierPrice}>{tier.price}</Text>
                      {tier.period && <Text style={styles.tierPeriod}>{tier.period}</Text>}
                    </View>

                    <Text style={styles.tierDesc}>{tier.sub}</Text>
                  </BlurView>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Premium CTA */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>UNLOCK ALL ACCESS</Text>
            <Text style={styles.ctaSubtitle}>Get unlimited vetting, decoding, and coaching</Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>START FREE TRIAL</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  content: {
    padding: spacing.xl,
    paddingTop: 100,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  displayTitle: {
    ...typography.display,
    fontSize: 42,
    color: colors.textOnDark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textOnDark,
    opacity: 0.6,
    fontSize: 16,
  },
  servicesGrid: {
    gap: spacing.lg,
  },
  cardWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  cardGradient: {
    borderRadius: 30,
  },
  glassCard: {
    padding: spacing.xl,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  price: {
    ...typography.headline,
    fontSize: 28,
    color: colors.textOnDark,
  },
  cardContent: {
    marginBottom: spacing.lg,
  },
  serviceTitle: {
    ...typography.headlineSmall,
    color: colors.textOnDark,
    marginBottom: spacing.xs,
  },
  serviceDesc: {
    ...typography.bodySmall,
    color: colors.textOnDark,
    opacity: 0.6,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  labelCaps: {
    ...typography.labelCaps,
    color: colors.accent,
    fontSize: 9,
    letterSpacing: 3,
  },
  ctaSection: {
    marginTop: spacing.xxl,
    borderRadius: 30,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  ctaTitle: {
    ...typography.headline,
    color: colors.textOnDark,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    ...typography.body,
    color: colors.textOnDark,
    opacity: 0.8,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.textOnDark,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 30,
  },
  ctaButtonText: {
    ...typography.labelCaps,
    color: colors.dark,
    fontSize: 12,
  },
  bottomSpacer: {
    height: spacing.xxl * 3,
  },

  // Pricing Section
  pricingSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.display,
    fontSize: 32,
    color: colors.textOnDark,
    marginBottom: spacing.xl,
  },
  pricingGrid: {
    gap: spacing.md,
  },
  tierCardWrapper: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  tierCardGradient: {
    borderRadius: 25,
  },
  tierCard: {
    padding: spacing.lg,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    ...typography.labelCaps,
    color: colors.textOnDark,
    fontSize: 8,
    letterSpacing: 2,
  },
  tierGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    borderWidth: 1.5,
    opacity: 0.2,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tierIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierName: {
    ...typography.labelCaps,
    color: colors.textOnDark,
    fontSize: 12,
    letterSpacing: 3,
  },
  tierPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  tierPrice: {
    ...typography.headline,
    fontSize: 32,
    color: colors.textOnDark,
  },
  tierPeriod: {
    ...typography.body,
    color: colors.textOnDark,
    opacity: 0.5,
    marginLeft: spacing.xs,
  },
  tierDesc: {
    ...typography.bodySmall,
    color: colors.textOnDark,
    opacity: 0.6,
  },
});
