import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Linking, Modal, Switch, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { colors, spacing, typography } from '../theme';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';


export function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    id: '',
    name: '',
    email: '',
    avatarUrl: '',
    age: '',
    bio: '',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState({
    messages: true,
    updates: true,
    promos: false,
    vetting: true,
  });

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
          bio: ''
        });
      } else if (data) {
        setProfile({
          id: user.id,
          name: data.full_name || user.user_metadata?.full_name || 'Queen',
          email: user.email || '',
          avatarUrl: data.avatar_url || '',
          age: data.age || '',
          bio: data.bio || ''
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
          // Update local state so we don't have to fetch again
          setProfile(prev => ({ ...prev, id: user.id }));
        }
      }

      if (!userId) throw new Error('User ID not found');

      const updates = {
        id: userId,
        full_name: profile.name,
        age: profile.age,
        bio: profile.bio,
        avatar_url: profile.avatarUrl,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;

      // Also update auth metadata for name ease of access
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

  const openLink = (url: string) => async () => {
    if (!url || !url.startsWith('http')) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } catch {
      // Avoid crash on Android (e.g. IOException when no browser / invalid URL)
    }
  };

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
        title="Profile"
        rightIcon="log-out"
        onRightPress={handleLogout}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Avatar, name, meta, Edit profile */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={isEditing ? pickImage : undefined}
            style={styles.heroAvatarWrapper}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.heroAvatarRing}
            >
              <View style={styles.heroAvatarInner}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.heroAvatar} />
                ) : (
                  <View style={styles.heroAvatarPlaceholder}>
                    <Text style={styles.heroAvatarInitials}>
                      {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
                {isEditing && (
                  <View style={styles.heroEditBadge}>
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="camera" size={14} color="#fff" />
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.heroName}>{profile.name || 'Queen'}</Text>
          {!isEditing && (
            <TouchableOpacity
              style={styles.heroEditButton}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.85}
            >
              <Feather name="edit-2" size={14} color={colors.dark} />
              <Text style={styles.heroEditButtonText}>Edit profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* About card: view or edit form */}
        <View style={styles.aboutSection}>
          <View style={styles.aboutCardWrapper}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aboutCardGradient}
            >
              <BlurView intensity={28} tint="dark" style={styles.aboutCard}>
                {isEditing ? (
                  <View style={styles.aboutEditForm}>
                    <TextInput
                      style={styles.aboutInput}
                      value={profile.name}
                      onChangeText={text => setProfile({ ...profile, name: text })}
                      placeholder="Full name"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <TextInput
                      style={styles.aboutInput}
                      value={profile.age}
                      onChangeText={text => setProfile({ ...profile, age: text })}
                      placeholder="Age"
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <TextInput
                      style={[styles.aboutInput, styles.aboutInputBio]}
                      value={profile.bio}
                      onChangeText={text => setProfile({ ...profile, bio: text })}
                      placeholder="Short bio..."
                      multiline
                      numberOfLines={2}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <View style={styles.aboutActions}>
                      <TouchableOpacity
                        style={styles.aboutCancelButton}
                        onPress={() => setIsEditing(false)}
                      >
                        <Text style={styles.aboutCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aboutSaveButton}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color={colors.dark} />
                        ) : (
                          <>
                            <Feather name="check" size={16} color={colors.dark} />
                            <Text style={styles.aboutSaveText}>Save</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.aboutLabel}>ABOUT</Text>
                    <Text style={styles.aboutText}>
                      {profile.bio || 'No bio yet.'}
                    </Text>
                    {profile.age ? (
                      <Text style={styles.aboutMeta}>{profile.age} yrs</Text>
                    ) : null}
                  </>
                )}
              </BlurView>
            </LinearGradient>
          </View>
        </View>

        {/* Settings list */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>SETTINGS</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setShowNotifications(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsRowIcon}>
                <Feather name="bell" size={18} color={colors.primary} />
              </View>
              <Text style={styles.settingsRowLabel}>Notifications</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={openLink('https://example.com/terms')}
            activeOpacity={0.7}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsRowIcon}>
                <Feather name="file-text" size={18} color={colors.primary} />
              </View>
              <Text style={styles.settingsRowLabel}>Terms of Service</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={openLink('https://example.com/privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsRowIcon}>
                <Feather name="shield" size={18} color={colors.primary} />
              </View>
              <Text style={styles.settingsRowLabel}>Privacy Policy</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showNotifications}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ALERTS</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)} style={styles.closeButton}>
                <Feather name="x" size={24} color={colors.textOnDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>New Messages</Text>
                  <Text style={styles.switchSub}>Get notified when you receive a reply</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={notifications.messages ? colors.cyberPink : '#f4f3f4'}
                  onValueChange={() => setNotifications(prev => ({ ...prev, messages: !prev.messages }))}
                  value={notifications.messages}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>App Updates</Text>
                  <Text style={styles.switchSub}>New features and improvements</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={notifications.updates ? colors.cyberPink : '#f4f3f4'}
                  onValueChange={() => setNotifications(prev => ({ ...prev, updates: !prev.updates }))}
                  value={notifications.updates}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Promotions</Text>
                  <Text style={styles.switchSub}>Special offers and deals</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={notifications.promos ? colors.cyberPink : '#f4f3f4'}
                  onValueChange={() => setNotifications(prev => ({ ...prev, promos: !prev.promos }))}
                  value={notifications.promos}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Vetting Alerts</Text>
                  <Text style={styles.switchSub}>Instant results from background checks</Text>
                </View>
                <Switch
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={notifications.vetting ? colors.cyberPink : '#f4f3f4'}
                  onValueChange={() => setNotifications(prev => ({ ...prev, vetting: !prev.vetting }))}
                  value={notifications.vetting}
                />
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 110 : 90,
    flexGrow: 1,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroAvatarWrapper: {
    marginBottom: spacing.md,
  },
  heroAvatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInner: {
    width: 106,
    height: 106,
    borderRadius: 53,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    position: 'relative',
  },
  heroAvatar: {
    width: 106,
    height: 106,
    borderRadius: 53,
  },
  heroAvatarPlaceholder: {
    width: 106,
    height: 106,
    borderRadius: 53,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroAvatarInitials: {
    ...typography.headline,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 36,
  },
  heroEditBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark,
  },
  heroName: {
    ...typography.display,
    fontSize: 26,
    color: colors.textOnDark,
    marginBottom: 4,
    textAlign: 'center',
  },
  heroMeta: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  heroEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  heroEditButtonText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: colors.dark,
    letterSpacing: 1,
  },

  // About card
  aboutSection: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  aboutCardWrapper: {
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  aboutCardGradient: {
    borderRadius: 24,
    padding: 1,
  },
  aboutCard: {
    padding: spacing.lg,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 5, 20, 0.65)',
    minHeight: 100,
  },
  aboutLabel: {
    ...typography.labelCaps,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  aboutText: {
    ...typography.body,
    fontSize: 15,
    color: colors.textOnDark,
    lineHeight: 10,
  },
  aboutMeta: {
    ...typography.bodySmall,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  aboutEditForm: {
    gap: spacing.sm,
  },
  aboutInput: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: colors.textOnDark,
    ...typography.bodySmall,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    fontSize: 14,
  },
  aboutInputBio: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  aboutActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  aboutCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  aboutCancelText: {
    ...typography.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  aboutSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  aboutSaveText: {
    ...typography.labelCaps,
    fontSize: 12,
    color: colors.dark,
    letterSpacing: 0.5,
  },

  // Settings list
  settingsSection: {
    marginBottom: spacing.xl,
  },
  settingsSectionTitle: {
    ...typography.labelCaps,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,20,147,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowLabel: {
    ...typography.body,
    fontSize: 15,
    color: colors.textOnDark,
  },

  // Footer
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  footerTagline: {
    ...typography.bodySmall,
    color: colors.textOnDark,
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  footerLogo: {
    ...typography.script,
    fontSize: 40,
    color: colors.primary,
  },
  bottomSpacer: {
    height: 120,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: colors.dark,
    borderRadius: 30,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    ...typography.headlineSmall,
    color: colors.textOnDark,
    fontSize: 20,
  },
  closeButton: {
    padding: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  modalBody: {
    gap: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  switchLabel: {
    ...typography.body, // Fixed from label
    color: colors.textOnDark,
    fontSize: 16,
    marginBottom: 4,
  },
  switchSub: {
    ...typography.bodySmall,
    color: colors.textOnDark,
    opacity: 0.5,
    fontSize: 12,
  },
});
