import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { responsiveFontSize, moderateScale } from '../theme/responsive';
import { Feather } from '@expo/vector-icons';

interface PageHeaderProps {
    title?: string;
    rightIcon?: string;
    onRightPress?: () => void;
    leftIcon?: string;
    onLeftPress?: () => void;
}

export function PageHeader({ title, rightIcon, onRightPress, leftIcon, onLeftPress }: PageHeaderProps) {
    const insets = useSafeAreaInsets();
    const Container = Platform.OS === 'ios' ? BlurView : View;

    return (
        <View style={styles.outerContainer}>
            <Container
                tint="dark"
                intensity={80}
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top,
                    }
                ]}
            >
                <View style={styles.content}>
                    <View style={styles.leftActionWrapper}>
                        {leftIcon && onLeftPress && (
                            <TouchableOpacity
                                onPress={onLeftPress}
                                style={styles.leftAction}
                                activeOpacity={0.7}
                            >
                                <Feather name={leftIcon as any} size={24} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.logoContainer} pointerEvents="none">
                        <Text style={styles.logo}>Pink Pill </Text>
                    </View>
                </View>
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
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 252, 249, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    content: {
        height: moderateScale(56),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    leftActionWrapper: {
        position: 'absolute',
        left: spacing.xl,
        zIndex: 10,
        height: '100%',
        justifyContent: 'center',
    },
    logoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    logo: {
        fontFamily: 'Allura_400Regular',
        color: colors.primary,
        fontSize: responsiveFontSize(32),
        marginBottom: Platform.OS === 'ios' ? 0 : 4,
        paddingHorizontal: moderateScale(20),
        overflow: 'visible',
    },
    leftAction: {
        padding: spacing.sm,
    },
});
