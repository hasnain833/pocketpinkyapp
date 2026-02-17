import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export function ConfirmationModal({
    visible,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = true,
}: ConfirmationModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onCancel}
                />
                <BlurView intensity={60} tint="dark" style={styles.modalContainer}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, isDestructive && styles.destructiveIconCircle]}>
                            <Feather
                                name={isDestructive ? "trash-2" : "help-circle"}
                                size={28}
                                color={isDestructive ? colors.cyberPink : colors.cyberGold}
                            />
                        </View>
                    </View>

                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmButton, isDestructive && styles.destructiveConfirmButton]}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.confirmButtonText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        width: '85%',
        maxWidth: horizontalScale(340),
        backgroundColor: 'rgba(20, 20, 20, 0.85)',
        borderRadius: radii.card,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconContainer: {
        marginBottom: spacing.lg,
    },
    iconCircle: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: 'rgba(255, 184, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 184, 0, 0.2)',
    },
    destructiveIconCircle: {
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
        borderColor: 'rgba(255, 45, 85, 0.2)',
    },
    modalTitle: {
        ...typography.headlineSmall,
        color: colors.textOnDark,
        fontSize: responsiveFontSize(20),
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    modalMessage: {
        ...typography.body,
        color: colors.textOnDark,
        opacity: 0.7,
        fontSize: responsiveFontSize(15),
        textAlign: 'center',
        lineHeight: responsiveFontSize(22),
        marginBottom: spacing.xl,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.button,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cancelButtonText: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        fontSize: responsiveFontSize(13),
        opacity: 0.8,
    },
    confirmButton: {
        flex: 1.5,
        paddingVertical: spacing.md,
        borderRadius: radii.button,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    destructiveConfirmButton: {
        backgroundColor: colors.cyberPink || '#FF2D55',
    },
    confirmButtonText: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        fontSize: responsiveFontSize(13),
        fontWeight: '700',
    },
});
