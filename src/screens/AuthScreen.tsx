import { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { supabase } from '../services/supabase';

export function AuthScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    // Password Validation Regex: At least 8 chars, 1 uppercase, 1 special char
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.{8,})/;

    async function handleAuth() {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (isSignUp) {
            if (!name) {
                Alert.alert('Error', 'Please enter your name');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }
            if (!passwordRegex.test(password)) {
                Alert.alert(
                    'Weak Password',
                    'Password must be at least 8 characters long, contain 1 uppercase letter, and 1 special character (!@#$&*).'
                );
                return;
            }
        }

        setLoading(true);
        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });
            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Success', 'Check your email for the confirmation link!');
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) Alert.alert('Error', error.message);
        }
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.deepNight, colors.dark]}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <Text style={styles.bgLogo}>Pinky</Text>
                            <Text style={styles.editorialHeadline}>
                                {isSignUp ? 'Join the' : 'Welcome'}
                                {'\n'}
                                <Text style={{ color: colors.cyberPink }}>Standards.</Text>
                            </Text>
                            <Text style={styles.subheadline}>
                                {isSignUp
                                    ? 'Start your journey with your AI big sister.'
                                    : 'Your vetting toolkit is waiting for you.'}
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {isSignUp && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.labelCaps}>FULL NAME</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Jessica Smith"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={name}
                                        onChangeText={setName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}

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
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Text style={styles.labelCaps}>PASSWORD</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            {isSignUp && (
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.labelCaps}>CONFIRM PASSWORD</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleAuth}
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
                                        <Text style={styles.buttonText}>
                                            {isSignUp ? 'SIGN UP' : 'SIGN IN'}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.switchButton}
                                onPress={() => setIsSignUp(!isSignUp)}
                            >
                                <Text style={styles.switchText}>
                                    {isSignUp
                                        ? 'Already have an account? Sign In'
                                        : "Don't have an account? Sign Up"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: {
        padding: spacing.xl,
        paddingTop: 100,
        paddingBottom: spacing.xxl,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: spacing.xxl * 1.5,
        position: 'relative',
    },
    bgLogo: {
        ...typography.script,
        fontSize: 120,
        color: colors.cyberPink,
        opacity: 0.1,
        position: 'absolute',
        top: -60,
        left: -20,
        zIndex: 0,
    },
    editorialHeadline: {
        ...typography.display,
        color: colors.textOnDark,
        fontSize: 48,
        lineHeight: 52,
        zIndex: 1,
    },
    subheadline: {
        ...typography.body,
        color: colors.textOnDark,
        opacity: 0.6,
        marginTop: spacing.md,
        maxWidth: '80%',
    },
    form: {
        gap: spacing.md, // Reduced from xl
    },
    inputWrapper: {
        gap: 4, // Reduced from spacing.sm (8)
    },
    labelCaps: {
        ...typography.labelCaps,
        color: colors.cyberGold,
        fontSize: 10,
        letterSpacing: 2,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12, // Reduced from 16
        padding: spacing.md, // Reduced from lg
        color: colors.textOnDark,
        ...typography.body,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontSize: 14, // Slightly smaller font
    },
    button: {
        marginTop: spacing.lg,
        shadowColor: colors.cyberPink,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    buttonGradient: {
        padding: spacing.xl,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        ...typography.labelCaps,
        color: colors.textOnDark,
        fontSize: 16,
        letterSpacing: 4,
    },
    switchButton: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    switchText: {
        ...typography.bodySmall,
        color: colors.textOnDark,
        opacity: 0.6,
    },
});
