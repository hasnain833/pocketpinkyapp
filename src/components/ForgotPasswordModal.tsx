import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { supabase } from '../services/supabase';

interface ForgotPasswordModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onError: (message: string) => void;
}

export function ForgotPasswordModal({ visible, onClose, onSuccess, onError }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    async function handlePasswordReset() {
        if (!email) {
            onError('Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            onError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'pinkypocket://reset-password',
            });

            if (error) throw error;

            onSuccess('Password reset link sent! Check your email.');
            setEmail('');
            onClose();
        } catch (error: any) {
            onError(error?.message ?? 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <BlurView intensity={40} tint="dark" style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>RESET PASSWORD</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Feather name="x" size={24} color={colors.textOnDark} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={styles.instructionText}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>

                        <View style={styles.inputWrapper}>
                            <Text style={styles.labelCaps}>EMAIL ADDRESS</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="queen@example.com"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handlePasswordReset}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={colors.gradients.vibrant}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buttonGradient}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.textOnDark} />
                                ) : (
                                    <>
                                        <Feather name="send" size={16} color={colors.textOnDark} />
                                        <Text style={styles.buttonText}>SEND RESET LINK</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        width: '90%',
        maxWidth: horizontalScale(400),
        backgroundColor: colors.dark,
        borderRadius: radii.card,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.headlineSmall,
        color: colors.textOnDark,
        fontSize: responsiveFontSize(18),
    },
    closeButton: {
        padding: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    modalBody: {
        gap: spacing.lg,
    },
    instructionText: {
        ...typography.body,
        color: colors.textOnDark,
        opacity: 0.7,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
    },
    inputWrapper: {
        gap: spacing.xs,
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.cyberGold,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: radii.input,
        padding: spacing.md,
        color: colors.textOnDark,
        ...typography.body,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontSize: responsiveFontSize(14),
    },
    button: {
        marginTop: spacing.md,
        shadowColor: colors.cyberPink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    buttonGradient: {
        padding: spacing.lg,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    buttonText: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        fontSize: responsiveFontSize(14),
    },
});
