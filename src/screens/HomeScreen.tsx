import React, { useRef, useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Dimensions,
    Animated,
    PanResponder,
    TouchableOpacity,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { PageHeader } from '../components';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

const LOOKBOOK_ITEMS = [
    {
        id: '1',
        title: 'DECODE',
        sub: 'What he really meant.',
        color: colors.cyberPink,
        icon: 'message-circle',
        bg: colors.deepNight
    },
    {
        id: '2',
        title: 'VET',
        sub: 'True intentions revealed.',
        color: colors.cyberGold,
        icon: 'search',
        bg: '#1a1025'
    },
    {
        id: '3',
        title: 'SAFETY',
        sub: 'Red flag check, always.',
        color: colors.secondary,
        icon: 'flag',
        bg: '#12081a'
    },
    {
        id: '4',
        title: 'ENERGY',
        sub: 'Queen level confidence.',
        color: colors.accent,
        icon: 'zap',
        bg: '#1c0d2b'
    },
];

export function HomeScreen() {
    const [data, setData] = useState(LOOKBOOK_ITEMS);
    const position = useRef(new Animated.ValueXY()).current;
    const [index, setIndex] = useState(0);

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    }

    const forceSwipe = (direction: string) => {
        const x = direction === 'right' ? width : -width;
        Animated.timing(position, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: true,
        }).start(() => onSwipeComplete(direction));
    };

    const onSwipeComplete = useCallback((direction: string) => {
        setIndex(prev => (prev + 1) % data.length);
        position.setValue({ x: 0, y: 0 });
    }, [data.length, position]);

    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
        }).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (event, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (event, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    forceSwipe('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    forceSwipe('left');
                } else {
                    resetPosition();
                }
            },
        })
    ).current;

    const getCardStyle = () => {
        const rotate = position.x.interpolate({
            inputRange: [-width * 1.5, 0, width * 1.5],
            outputRange: ['-30deg', '0deg', '30deg'],
        });

        return {
            transform: [...position.getTranslateTransform(), { rotate }],
        };
    };

    const renderCards = () => {
        const cards = [];
        for (let i = 0; i < data.length; i++) {
            const itemIndex = (index + i) % data.length;
            const item = data[itemIndex];

            // Front card (Top of stack)
            if (i === 0) {
                cards.push(
                    <Animated.View
                        key={item.id}
                        style={[getCardStyle(), styles.cardWrapper]}
                        {...panResponder.panHandlers}
                    >
                        <CardContent item={item} index={itemIndex} />
                    </Animated.View>
                );
            } else if (i < 3) {
                // Background cards (Showing only 2 behind the front card)
                cards.push(
                    <Animated.View
                        key={item.id}
                        style={[
                            styles.cardWrapper,
                            {
                                zIndex: -i,
                                transform: [
                                    { scale: 1 - i * 0.05 },
                                    { translateY: i * -20 }
                                ],
                                opacity: 1 - i * 0.2
                            }
                        ]}
                    >
                        <CardContent item={item} index={itemIndex} />
                    </Animated.View>
                );
            }
        }

        return cards.reverse();
    };

    return (
        <View style={styles.container}>
            <PageHeader
                title="Lookbook"
                rightIcon="log-out"
                onRightPress={handleLogout}
            />
            <View style={styles.deckContainer}>
                {renderCards()}
            </View>
        </View>
    );
}

function CardContent({ item, index }: { item: any, index: number }) {
    return (
        <LinearGradient
            colors={[item.bg, colors.dark]}
            style={styles.card}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.editorialTitle}>{item.title}</Text>
                <View style={styles.dot} />
            </View>

            {/* Large Centered Number */}
            <View style={styles.cardCenter}>
                <Text style={[styles.cardNumber, { color: item.color }]}>
                    {String(index + 1).padStart(2, '0')}
                </Text>
            </View>

            <View style={styles.cardInfo}>
                <Text style={styles.subText}>{item.sub}</Text>

                <TouchableOpacity activeOpacity={0.8} style={styles.actionButton}>
                    <LinearGradient
                        colors={[item.color, 'rgba(255,255,255,0.05)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.buttonGradient}
                    >
                        <Feather name={item.icon} size={20} color={colors.textOnDark} />
                        <Text style={styles.buttonText}>DETAILS</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <View style={[styles.cardBorder, { borderColor: item.color }]} />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.dark },
    deckContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100, // Space for tab bar
    },
    cardWrapper: {
        position: 'absolute',
        width: width * 0.85,
        height: height * 0.6,
    },
    card: {
        flex: 1,
        borderRadius: 40,
        padding: spacing.xl,
        justifyContent: 'space-between',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    editorialTitle: {
        ...typography.display,
        fontSize: 48,
        color: colors.textOnDark,
        letterSpacing: -2,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.cyberPink,
        marginTop: 15,
    },
    cardInfo: {
        paddingBottom: spacing.lg,
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.cyberGold,
        fontSize: 10,
        letterSpacing: 4,
        marginBottom: spacing.xs,
    },
    subText: {
        ...typography.headlineSmall,
        color: colors.textOnDark,
        opacity: 0.7,
        marginBottom: spacing.xl,
    },
    actionButton: {
        width: 140,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    buttonText: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        fontSize: 10,
    },
    cardCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
        pointerEvents: 'none',
    },
    cardNumber: {
        ...typography.display,
        fontSize: 50,
        fontWeight: '900',
        opacity: 0.12,
        letterSpacing: -4,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    cardBorder: {
        position: 'absolute',
        top: 15,
        left: 15,
        right: 15,
        bottom: 15,
        borderWidth: 1,
        borderRadius: 30,
        opacity: 0.05,
    },
});
