import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '../theme';
import { Feather } from '@expo/vector-icons';

interface PageHeaderProps {
    title: string;
    rightIcon?: string;
    onRightPress?: () => void;
}

export function PageHeader({ title, rightIcon, onRightPress }: PageHeaderProps) {
    const Container = Platform.OS === 'ios' ? BlurView : View;

    return (
        <View style={styles.outerContainer}>
            <Container
                tint="dark"
                intensity={80}
                style={styles.container}
            >
                <Text style={styles.logo}>Pinky</Text>
                {!rightIcon && (
                    <View style={styles.titleWrapper}>
                        <Text style={styles.title}>{title.toUpperCase()}</Text>
                        <View style={styles.dot} />
                    </View>
                )}
                {rightIcon && onRightPress && (
                    <TouchableOpacity
                        onPress={onRightPress}
                        style={styles.rightAction}
                        activeOpacity={0.7}
                    >
                        <Feather name={rightIcon as any} size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </Container>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.xl,
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(15, 8, 20, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    logo: {
        fontFamily: 'Allura_400Regular',
        color: colors.cyberPink,
        fontSize: 28,
        flex: 1,
    },
    titleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        opacity: 0.9,
        fontSize: 10,
        letterSpacing: 3,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.cyberGold,
    },
    rightAction: {
        padding: spacing.sm,
    }
});
