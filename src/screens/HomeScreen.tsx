import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Dimensions,
    Animated,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeader, Toast } from '../components';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

// High-Fidelity Design Constants
const LOOKBOOK_ITEMS = [
    { id: '1', title: 'DECODE', sub: 'What he really meant.', color: colors.cyberPink, icon: 'message-circle', bg: colors.deepNight },
    { id: '2', title: 'VET', sub: 'True intentions revealed.', color: colors.cyberGold, icon: 'search', bg: '#1a1025' },
    { id: '3', title: 'SAFETY', sub: 'Red flag check, always.', color: colors.secondary, icon: 'flag', bg: '#12081a' },
    { id: '4', title: 'ENERGY', sub: 'Queen level confidence.', color: colors.accent, icon: 'zap', bg: '#1c0d2b' },
];

const CARD_WIDTH = horizontalScale(320);
const CARD_HEIGHT = verticalScale(480);

const CardContent = React.memo(function CardContent({ item, index }: { item: any; index: number }) {
    return (
        <LinearGradient colors={[item.bg, colors.dark]} style={styles.card}>
            {/* Background Layer: Large Number */}
            <View style={styles.cardCenter}>
                <Text style={[styles.cardNumber, { color: item.color }]}>
                    {String(index + 1).padStart(2, '0')}
                </Text>
            </View>

            {/* Foreground Content */}
            <View style={styles.cardHeader}>
                <Text style={styles.editorialTitle}>{item.title}</Text>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
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
});

export function HomeScreen() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '', type: 'success', visible: false,
    });

    // Core Layout Calculation
    const { width: windowWidth } = Dimensions.get('window');
    const ITEM_SPACING = (windowWidth - CARD_WIDTH) / 2;

    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<any>(null);
    const insets = useSafeAreaInsets();

    const infiniteItems = useMemo(() => [...LOOKBOOK_ITEMS, ...LOOKBOOK_ITEMS, ...LOOKBOOK_ITEMS], []);

    // Initial positioning to center set
    useEffect(() => {
        const initialOffset = LOOKBOOK_ITEMS.length * CARD_WIDTH;
        const timer = setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: initialOffset, animated: false });
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const onMomentumScrollEnd = (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const totalSetWidth = LOOKBOOK_ITEMS.length * CARD_WIDTH;

        // Loop simulation logic
        if (x < totalSetWidth * 0.5) {
            flatListRef.current?.scrollToOffset({ offset: x + totalSetWidth, animated: false });
        } else if (x > totalSetWidth * 1.5) {
            flatListRef.current?.scrollToOffset({ offset: x - totalSetWidth, animated: false });
        }
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            (index + 1) * CARD_WIDTH,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.94, 1, 0.94],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.65, 1, 0.65],
            extrapolate: 'clamp',
        });

        const displayIndex = index % LOOKBOOK_ITEMS.length;

        return (
            <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, justifyContent: 'center' }}>
                <Animated.View style={{ flex: 1, transform: [{ scale }], opacity, paddingHorizontal: spacing.sm }}>
                    <CardContent item={item} index={displayIndex} />
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Toast {...toast} onHide={() => setToast(prev => ({ ...prev, visible: false }))} />
            <PageHeader title="Lookbook" rightIcon="log-out" onRightPress={async () => await supabase.auth.signOut()} />

            <View style={styles.deckContainer}>
                {/* 
                  To ensure perfect vertical center, we wrap the List in a View 
                  with the card's exact height. The parent deckContainer (flex:1) 
                  then centers this wrapper.
                */}
                <View style={{ height: CARD_HEIGHT, width: '100%', justifyContent: 'center' }}>
                    <Animated.FlatList
                        ref={flatListRef}
                        data={infiniteItems}
                        renderItem={renderItem}
                        keyExtractor={(_, i) => `infinite_${i}`}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH}
                        decelerationRate="fast"
                        contentContainerStyle={{
                            paddingHorizontal: ITEM_SPACING,
                            alignItems: 'center'
                        }}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={onMomentumScrollEnd}
                        scrollEventThrottle={16}
                        getItemLayout={(_, index) => ({
                            length: CARD_WIDTH,
                            offset: CARD_WIDTH * index,
                            index,
                        })}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.dark },
    deckContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
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
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    editorialTitle: { ...typography.display, color: colors.textOnDark },
    dot: { width: moderateScale(10), height: moderateScale(10), borderRadius: moderateScale(5), backgroundColor: colors.cyberPink, marginTop: verticalScale(15) },
    cardInfo: { paddingBottom: spacing.lg },
    subText: { ...typography.headlineSmall, color: colors.textOnDark, opacity: 0.7, marginBottom: spacing.xl },
    actionButton: { width: horizontalScale(140), borderRadius: moderateScale(30), overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    buttonGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.sm },
    buttonText: { ...typography.labelCaps, color: colors.textOnDark, fontSize: responsiveFontSize(10) },
    cardCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 0, pointerEvents: 'none' },
    cardNumber: { ...typography.display, fontSize: responsiveFontSize(90), fontWeight: '900', opacity: 0.19, includeFontPadding: false, textAlignVertical: 'center' },
    cardBorder: { position: 'absolute', top: verticalScale(15), left: horizontalScale(15), right: horizontalScale(15), bottom: verticalScale(15), borderWidth: 1, borderRadius: moderateScale(30), opacity: 0.05 },
});
