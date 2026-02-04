import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    onActionPress?: () => void;
    actionLabel?: string;
    style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, onActionPress, actionLabel, style }: SectionHeaderProps) {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {onActionPress && (
                <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}>
                    <Text style={styles.actionLabel}>{actionLabel || 'See All'}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.lg,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...typography.headlineSmall,
        color: colors.dark,
    },
    subtitle: {
        ...typography.caption,
        color: colors.textOnLight,
        opacity: 0.6,
        marginTop: 2,
    },
    actionLabel: {
        ...typography.bodySmall,
        color: colors.primary,
        fontWeight: '700',
    },
});
