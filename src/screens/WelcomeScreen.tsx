import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onFinish: () => void;
}

export function WelcomeScreen({ onFinish }: WelcomeScreenProps) {
    const [displayedText, setDisplayedText] = useState('');
    const fullText = 'Pink Pill ';
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.95))[0];
    const underlineAnim = useState(new Animated.Value(0))[0];
    const subFadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        // Initial reveal
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
        ]).start();

        // Smooth handwritten-style typing: gentle variation, no jarring pauses
        let currentIndex = 0;
        const baseLetterMs = 115;
        const basePauseMs = 200;
        const typeNext = () => {
            if (currentIndex < fullText.length) {
                currentIndex++;
                setDisplayedText(fullText.slice(0, currentIndex));

                const nextChar = fullText[currentIndex];
                const isAfterSpace = fullText[currentIndex - 1] === ' ';
                const isBeforeSpaceOrEnd = nextChar === ' ' || currentIndex === fullText.length;

                let delay: number;
                if (isAfterSpace) {
                    delay = basePauseMs + (Math.random() - 0.5) * 50;
                } else if (isBeforeSpaceOrEnd) {
                    delay = baseLetterMs + 60 + (Math.random() - 0.5) * 40;
                } else {
                    delay = baseLetterMs + (Math.random() - 0.5) * 36;
                }
                setTimeout(typeNext, Math.round(delay));
            } else {
                // Typing finished -> draw underline
                Animated.sequence([
                    Animated.timing(underlineAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                    Animated.timing(subFadeAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    // hold then finish
                    setTimeout(() => {
                        Animated.timing(fadeAnim, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }).start(() => onFinish());
                    }, 1800);
                });
            }
        };

        setTimeout(typeNext, 500);

        return () => { };
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <Text style={styles.bgLogo}>Pink Pill</Text>

                <Animated.View style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <View style={styles.textWrapper}>
                        <Text style={styles.logoText}>
                            {displayedText}
                        </Text>
                    </View>

                    <Animated.View
                        style={[
                            styles.signatureLine,
                            {
                                width: underlineAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 240]
                                })
                            }
                        ]}
                    />

                    <Animated.View style={{ opacity: subFadeAnim, marginTop: spacing.xl, alignItems: 'center' }}>
                        <Text style={styles.labelCaps}>YOUR AI BIG SISTER</Text>
                    </Animated.View>
                </Animated.View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <LinearGradient
                            colors={colors.gradients.vibrant}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loaderFill}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.cream,
    },
    contentWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    bgLogo: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: moderateScale(130),
        color: colors.primary,
        opacity: 0.03,
        position: 'absolute',
        top: height * 0.15,
        zIndex: 0,
    },
    content: {
        alignItems: 'center',
        zIndex: 1,
        width: '100%',
    },
    textWrapper: {
        position: 'relative',
        marginBottom: spacing.xs,
    },
    logoText: {
        fontFamily: 'Allura_400Regular',
        color: colors.textPrimary,
        fontSize: responsiveFontSize(72),
        textAlign: 'center',
        paddingHorizontal: moderateScale(40),
        overflow: 'visible',
    },
    signatureLine: {
        height: verticalScale(2),
        backgroundColor: colors.gold,
        borderRadius: 2,
        shadowColor: colors.gold,
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    labelCaps: {
        fontFamily: 'PlayfairDisplay_700Bold',
        color: colors.gold,
        fontSize: responsiveFontSize(12),
        letterSpacing: 3,
        opacity: 0.9,
    },
    loaderContainer: {
        position: 'absolute',
        bottom: height * 0.12,
        width: '40%',
        alignItems: 'center',
    },
    loaderTrack: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    loaderFill: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
});
