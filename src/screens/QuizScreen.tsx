import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    Animated,
    SafeAreaView,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radii } from '../theme';
import { horizontalScale, verticalScale, moderateScale, responsiveFontSize } from '../theme/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from '../components';
import { supabase } from '../services/supabase';

const { width, height } = Dimensions.get('window');

// --- Types ---
type Option = {
    id: string;
    label: string;
    icon: keyof typeof Feather.glyphMap;
};

type Question = {
    id: string;
    question: string;
    options: Option[];
};

// --- Quiz Data ---
const QUESTIONS: Question[] = [
    {
        id: 'goal',
        question: 'What are you looking for?',
        options: [
            { id: 'serious', label: 'Serious Relationship', icon: 'heart' },
            { id: 'clarity', label: 'Dating Clarity', icon: 'search' },
            { id: 'vetting', label: 'Vetting Help', icon: 'shield' },
            { id: 'swirling', label: 'Swirling Advice', icon: 'globe' },
        ],
    },
    {
        id: 'challenge',
        question: 'Biggest dating challenge?',
        options: [
            { id: 'ghosting', label: 'Ghosting / Flaking', icon: 'wind' },
            { id: 'mixed_signals', label: 'Mixed Signals', icon: 'shuffle' },
            { id: 'time', label: 'Wasting Time', icon: 'clock' },
            { id: 'quality', label: 'Low Quality Men', icon: 'frown' },
        ],
    },
    {
        id: 'age',
        question: 'Your Age Range',
        options: [
            { id: '18-24', label: '18 - 24', icon: 'user' },
            { id: '25-34', label: '25 - 34', icon: 'briefcase' },
            { id: '35-44', label: '35 - 44', icon: 'star' },
            { id: '45+', label: '45+', icon: 'sun' },
        ],
    },
    {
        id: 'status',
        question: 'Relationship Status',
        options: [
            { id: 'single', label: 'Single', icon: 'user' },
            { id: 'talking', label: 'Talking / Dating', icon: 'message-circle' },
            { id: 'situationship', label: 'Situationship', icon: 'help-circle' },
            { id: 'complicated', label: 'It’s Complicated', icon: 'alert-triangle' },
        ],
    },
    {
        id: 'source',
        question: 'What brought you here?',
        options: [
            { id: 'tiktok', label: 'TikTok / Social', icon: 'instagram' },
            { id: 'friend', label: 'Friend Referral', icon: 'users' },
            { id: 'search', label: 'Web Search', icon: 'search' },
            { id: 'other', label: 'Other', icon: 'more-horizontal' },
        ],
    },
    {
        id: 'timeline',
        question: 'Timeline for goals?',
        options: [
            { id: 'asap', label: 'ASAP', icon: 'zap' },
            { id: '3_months', label: 'Within 3 Months', icon: 'calendar' },
            { id: 'year', label: 'This Year', icon: 'target' },
            { id: 'casual', label: 'Just Browsing', icon: 'coffee' }
        ]
    }
];

export function QuizScreen({ navigation, onComplete }: { navigation: any, onComplete: () => void }) {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const insets = useSafeAreaInsets();

    // Animation Values
    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const currentQuestion = QUESTIONS[currentIndex];
    const progressPercent = ((currentIndex + 1) / QUESTIONS.length) * 100;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPercent,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [currentIndex]);

    const handleSelect = async (optionId: string) => {
        // 1. Save Answer
        const newAnswers = { ...answers, [currentQuestion.id]: optionId };
        setAnswers(newAnswers);

        // 2. Animate Out
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -50,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(async () => {
            // 3. Move to Next or Finish
            if (currentIndex < QUESTIONS.length - 1) {
                setCurrentIndex(prev => prev + 1);

                // Reset animation values for slide in
                slideAnim.setValue(50);

                // Animate In
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else {
                // FINISH QUIZ
                await saveAndExit(newAnswers);
            }
        });
    };

    const saveAndExit = async (finalAnswers: Record<string, string>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Mark quiz as complete in metadata
                const { error } = await supabase.auth.updateUser({
                    data: { quiz_completed: true, quiz_answers: finalAnswers }
                });

                if (error) throw error;
            }
            onComplete(); // Navigate to main app
        } catch (error: any) {
            setToast({ message: error?.message ?? 'Error saving quiz', type: 'error', visible: true });
            onComplete(); // Let them through anyway fallback
        }
    };

    return (
        <View style={styles.container}>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={[colors.dark, '#1a0b2e']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.safeArea}>
                {/* Header & Progress */}
                <View style={[
                    styles.header,
                    { paddingTop: insets.top + spacing.md }
                ]}>
                    <View style={styles.progressTrack}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    })
                                }
                            ]}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.secondary]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                    </View>
                    <Text style={styles.progressText}>
                        Step {currentIndex + 1} of {QUESTIONS.length}
                    </Text>
                </View>

                {/* Question & Options */}
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.questionText}>
                        {currentQuestion.question}
                    </Text>

                    <View style={styles.optionsGrid}>
                        {currentQuestion.options.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                activeOpacity={0.8}
                                onPress={() => handleSelect(option.id)}
                                style={styles.optionCardWrapper}
                            >
                                <BlurView intensity={20} tint="light" style={styles.optionCard}>
                                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                        <Feather name={option.icon} size={24} color={colors.primary} />
                                    </View>
                                    <Text style={styles.optionLabel}>{option.label}</Text>
                                </BlurView>
                                {/* Subtle Glow Border */}
                                <View style={styles.glowBorder} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.dark,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        marginBottom: spacing.lg,
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: spacing.sm,
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        ...typography.labelCaps,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
        paddingBottom: moderateScale(100),
    },
    questionText: {
        ...typography.display,
        color: colors.textOnDark,
        textAlign: 'center',
        marginBottom: spacing.xxl,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'center',
    },
    optionCardWrapper: {
        width: '47%', // 2 columns with gap
        aspectRatio: 1,
        borderRadius: radii.card,
        overflow: 'hidden',
        position: 'relative',
    },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    glowBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: radii.card,
        pointerEvents: 'none',
    },
    iconCircle: {
        width: moderateScale(50),
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    optionLabel: {
        ...typography.bodySemiBold,
        color: colors.textOnDark,
        textAlign: 'center',
    },
});
