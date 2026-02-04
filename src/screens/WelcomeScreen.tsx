import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing } from '../theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
    onFinish: () => void;
}

export function WelcomeScreen({ onFinish }: WelcomeScreenProps) {
    const [displayedText, setDisplayedText] = useState('');
    const fullText = 'Pinky Pocket';
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

        // Human-like typewriter effect
        let currentIndex = 0;
        const typeNext = () => {
            if (currentIndex < fullText.length) {
                currentIndex++;
                setDisplayedText(fullText.slice(0, currentIndex));

                // Random delay between 50ms and 180ms for natural feel
                const delay = 50 + Math.random() * 130;
                setTimeout(typeNext, delay);
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
            <LinearGradient
                colors={[colors.deepNight, colors.dark]}
                style={styles.gradient}
            >
                <Text style={styles.bgLogo}>Pinky</Text>

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
                        <View style={styles.glowOverlay} />
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

                    <Animated.View style={{ opacity: subFadeAnim, marginTop: spacing.lg, alignItems: 'center' }}>
                        <Text style={styles.labelCaps}>YOUR AI BIG SISTER</Text>
                    </Animated.View>
                </Animated.View>

                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <LinearGradient
                            colors={[colors.cyberGold, colors.cyberPink]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loaderFill}
                        />
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    bgLogo: {
        ...typography.script,
        fontSize: 200,
        color: colors.cyberPink,
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
        color: colors.textOnDark,
        fontSize: 64,
        textAlign: 'center',
        textShadowColor: colors.cyberPink,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    glowOverlay: {
        position: 'absolute',
        top: -20,
        bottom: -20,
        left: -20,
        right: -20,
        backgroundColor: colors.cyberPink,
        opacity: 0.05,
        borderRadius: 50,
        zIndex: -1,
    },
    signatureLine: {
        height: 3,
        backgroundColor: colors.cyberGold,
        borderRadius: 2,
        shadowColor: colors.cyberGold,
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        letterSpacing: 6,
        fontSize: 11,
        opacity: 0.8,
    },
    estText: {
        ...typography.caption,
        color: colors.cyberGold,
        fontSize: 9,
        marginTop: 4,
        opacity: 0.4,
    },
    loaderContainer: {
        position: 'absolute',
        bottom: height * 0.08,
        width: '60%',
        alignItems: 'center',
    },
    loaderTrack: {
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    loaderFill: {
        width: '100%',
        height: '100%',
        opacity: 0.5,
    },
});
