import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';

const UPGRADE_URL = process.env.EXPO_PUBLIC_UPGRADE_URL || 'https://pocket-pinky-vetting-app.vercel.app/#pricing';

export function ProfileScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    avatarUrl: '',
    age: '',
    subscriptionTier: 'free', // 'free', 'premium', 'annual'
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If no profile table entry yet, fall back to metadata
      if (error && error.code === 'PGRST116') {
        setProfile({
          id: user.id,
          name: user.user_metadata?.full_name || 'Queen',
          email: user.email || '',
          avatarUrl: user.user_metadata?.avatar_url || '',
          age: '',
          subscriptionTier: 'free',
        });
      } else if (data) {
        setProfile({
          id: user.id,
          name: data.full_name || user.user_metadata?.full_name || 'Queen',
          email: user.email || '',
          avatarUrl: data.avatar_url || '',
          age: data.age || '',
          subscriptionTier: data.plan || 'free',
        });
      }
    } catch (error) {
      console.log('Error fetching profile:', error);
    }
  }

  async function handleUpdateProfile() {
    setLoading(true);
    try {
      let userId = profile.id;

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          setProfile(prev => ({ ...prev, id: user.id }));
        }
      }

      if (!userId) throw new Error('User ID not found');

      const updates = {
        id: userId,
        full_name: profile.name,
        age: profile.age,
        avatar_url: profile.avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      // Also update auth metadata for name
      await supabase.auth.updateUser({
        data: { full_name: profile.name, avatar_url: profile.avatarUrl }
      });

      setIsEditing(false);
      setToast({ message: 'Profile updated!', type: 'success', visible: true });
    } catch (error: any) {
      setToast({ message: error?.message ?? 'Something went wrong', type: 'error', visible: true });
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setToast({ message: 'Allow access to photos to change your avatar.', type: 'error', visible: true });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await uploadImage(result.assets[0].base64);
      }
    } catch (error: any) {
      setToast({ message: error?.message ?? 'Could not open image picker', type: 'error', visible: true });
    }
  }

  async function uploadImage(base64Image: string) {
    if (!base64Image?.length || !profile.id) return;
    setUploading(true);
    try {
      const buffer = decode(base64Image);
      const fileName = `${profile.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
    } catch (error: any) {
      setToast({ message: error?.message ?? 'Upload failed', type: 'error', visible: true });
    } finally {
      setUploading(false);
    }
  }

  const handleUpgrade = async () => {
    try {
      const canOpen = await Linking.canOpenURL(UPGRADE_URL);
      if (canOpen) await Linking.openURL(UPGRADE_URL);
    } catch (error) {
      setToast({ message: 'Could not open upgrade page', type: 'error', visible: true });
    }
  };

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) setToast({ message: error.message, type: 'error', visible: true });
  }

  const getSubscriptionDisplay = () => {
    switch (profile.subscriptionTier) {
      case 'premium':
        return { name: 'Premium', price: '$24.97/month', color: colors.cyberGold };
      case 'annual':
        return { name: 'Annual', price: '$247/year', color: colors.secondary };
      default:
        return { name: 'Free Trial', price: '3 questions included', color: colors.light };
    }
  };

  const subscription = getSubscriptionDisplay();

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <PageHeader
        leftIcon="menu"
        onLeftPress={() => (navigation as any).openDrawer()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + moderateScale(80),
            paddingBottom: insets.bottom + moderateScale(40),
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={isEditing ? pickImage : undefined}
            style={styles.avatarContainer}
          >
            <LinearGradient
              colors={[colors.gold, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'P'}
                    </Text>
                  </View>
                )}
                {isEditing && (
                  <View style={styles.editBadge}>
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="camera" size={12} color="#fff" />
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.userName}>{profile.name || 'Pink Pill User'}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>

          {!isEditing && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.editProfileText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Form */}
        {isEditing && (
          <View style={styles.editForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={text => setProfile({ ...profile, name: text })}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={profile.age}
                onChangeText={text => setProfile({ ...profile, age: text })}
                placeholder="Enter age"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Subscription Card */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MEMBERSHIP</Text>
          <View style={styles.membershipCard}>
            <View style={styles.membershipInfo}>
              <View>
                <Text style={styles.membershipTier}>{subscription.name}</Text>
                <Text style={styles.membershipStatus}>Current Plan • {subscription.price}</Text>
              </View>
            </View>

            {profile.subscriptionTier === 'free' && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={handleUpgrade}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={colors.gradients.vibrant}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.upgradeBtnGradient}
                >
                  <Text style={styles.upgradeBtnText}>UPGRADE TO PREMIUM</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORT & LEGAL</Text>
          <View style={styles.settingsGroup}>
            {[
              { label: 'Terms of Service', icon: 'file-text', url: 'https://pocket-pinky-vetting-app.vercel.app' },
              { label: 'Privacy Policy', icon: 'lock', url: 'https://pocket-pinky-vetting-app.vercel.app' },
              { label: 'Help & Support', icon: 'help-circle', url: 'https://pocket-pinky-vetting-app.vercel.app' },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.settingsItem, idx === 2 && { borderBottomWidth: 0 }]}
                onPress={() => Linking.openURL(item.url)}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={styles.settingsIcon}>
                    <Feather name={item.icon as any} size={18} color={colors.gold} />
                  </View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.pinkDeep} />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatarRing: {
    width: moderateScale(110),
    height: moderateScale(110),
    borderRadius: moderateScale(55),
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarInner: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: moderateScale(36),
    color: colors.primary,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.gold,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: responsiveFontSize(28),
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  editProfileButton: {
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editProfileText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.gold,
    letterSpacing: 1.5,
  },

  // Forms
  editForm: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingVertical: verticalScale(12),
    paddingHorizontal: horizontalScale(16),
    color: colors.textPrimary,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: '#fff',
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.md,
    marginLeft: 4,
  },

  // Membership Card
  membershipCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  membershipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tierIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipTier: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
  },
  membershipStatus: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  upgradeBtn: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  upgradeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  upgradeBtnText: {
    ...typography.labelCaps,
    color: '#fff',
    fontSize: 12,
    letterSpacing: 1,
  },

  // Settings Group
  settingsGroup: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
  },

  // Sign Out
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    marginTop: spacing.md,
  },
  logoutBtnText: {
    ...typography.labelCaps,
    color: colors.pinkDeep,
    fontSize: 13,
    letterSpacing: 1,
  },
});

