import { useState, useRef } from 'react';
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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';
import { PageHeader } from '../components';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey sis. I'm Pinky. Ready to vet some dates and decode some BS?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

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

    // Simulate AI response
    setTimeout(() => {
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
    if (error) Alert.alert('Error', error.message);
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Pinky AI"
        rightIcon="log-out"
        onRightPress={handleLogout}
      />

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
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
            style={styles.inputBlur}
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
                <Text style={styles.sendText}>→</Text>
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
  keyboardView: { flex: 1 },
  messageList: { flex: 1 },
  messageContent: {
    padding: spacing.xl,
    paddingTop: 120,
    paddingBottom: 100
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
    backgroundColor: colors.cyberPink,
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
    paddingHorizontal: spacing.xl,
    paddingBottom: 100, // Clears the floating tab bar
    backgroundColor: 'transparent',
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    color: colors.textOnDark,
    ...typography.body,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: spacing.sm,
  },
  sendIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: colors.textOnDark,
    fontSize: 20,
    fontWeight: '900',
  }
});
