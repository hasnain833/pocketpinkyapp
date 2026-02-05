import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function ChatScreen() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey sis. I'm Pinky. Ready to vet some dates and decode some BS?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isBotTyping) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isBotTyping]);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsBotTyping(true);

    // Simulate AI response (replace with Botpress later)
    setTimeout(() => {
      setIsBotTyping(false);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm looking into that for you. Give me a sec to analyze the vibe...",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) setToast({ message: error.message, type: 'error', visible: true });
  }

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      {/* Header – fixed at top */}
      <View style={styles.headerSticky}>
        <PageHeader
          title="Pinky AI"
          rightIcon="log-out"
          onRightPress={handleLogout}
        />
      </View>

      {/* Only this area scrolls */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userBubble : styles.aiBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.sender === 'user' ? styles.userText : styles.aiText
              ]}>
                {msg.text}
              </Text>
              <Text style={styles.timestamp}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
          {isBotTyping && (
            <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
              <Animated.View style={styles.typingDots}>
                <Animated.Text style={[styles.typingDot, { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]}>.</Animated.Text>
                <Animated.Text style={[styles.typingDot, { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]}>.</Animated.Text>
                <Animated.Text style={[styles.typingDot, { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }]}>.</Animated.Text>
              </Animated.View>
            </View>
          )}
        </ScrollView>

        {/* Input – fixed at bottom */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.inputRow}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Tell me what happened..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              onPress={sendMessage}
              activeOpacity={0.8}
              style={styles.sendButton}
            >
              <LinearGradient
                colors={colors.gradients.vibrant}
                style={styles.sendIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.sendIconInner}>
                  <Feather name="send" size={20} color={colors.dark} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNight },
  headerSticky: {
    zIndex: 10,
    backgroundColor: colors.deepNight,
  },
  keyboardView: { flex: 1 },
  messageList: { flex: 1 },
  messageContent: {
    padding: spacing.xl,
    paddingTop: 110,
    paddingBottom: 100,
  },
  typingBubble: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  typingDot: {
    ...typography.body,
    fontSize: 20,
    color: colors.textOnDark,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.lg,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    ...typography.body,
    fontSize: 15,
  },
  aiText: {
    color: colors.textOnDark,
  },
  userText: {
    color: colors.textOnDark,
  },
  timestamp: {
    ...typography.caption,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.deepNight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textOnDark,
    ...typography.body,
    maxHeight: 100,
  },
  sendButton: {
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  sendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendIconInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
