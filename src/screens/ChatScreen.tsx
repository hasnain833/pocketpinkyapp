import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { PageHeader, Toast } from '../components';
import { supabase } from '../services/supabase';
import { botpress, Message } from '../services/botpress';
import { checkSubscriptionTier } from '../services/subscriptionCheck';
import { colors, spacing, typography } from '../theme';
import { moderateScale, responsiveFontSize } from '../theme/responsive';

const HEADER_HEIGHT = moderateScale(80);

// Custom Three Dots Animation
const TypingDots = () => {
  const [dots] = useState([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);

  useEffect(() => {
    const animations = dots.map((dot, i) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
    });
    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
};

export function ChatScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [user, setUser] = useState<any>(null);
  const [botpressUserId, setBotpressUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Chat State
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Cache user data to avoid redundant API calls
  const [cachedSubscriptionTier, setCachedSubscriptionTier] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });

  // Watch for conversationId changes from navigation (Sidebar)
  useEffect(() => {
    const convoId = route.params?.conversationId;
    if (convoId) {
      botpress.setConversationId(convoId);
      refreshMessages();
    } else if (!isInitialLoad) {
      // If we are already loaded and params are cleared (New Chat from Sidebar)
      startNewChat();
    }
  }, [route.params?.conversationId, route.params?.timestamp]);

  useEffect(() => {
    initChat();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  // Auto-scroll to bottom when messages change or bot starts typing
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length, isBotTyping]);

  const refreshMessages = async () => {
    setIsLoading(true);
    await fetchMessages();
    setIsLoading(false);
  };

  const startNewChat = async () => {
    setIsLoading(true);
    setMessages([]);
    await botpress.createConversation();
    setIsLoading(false);
  };

  async function initChat() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUser(session.user);

      // 1. Get current plan from Supabase
      const plan = await checkSubscriptionTier(session.user.id);
      const normalizedPlan = plan?.toLowerCase();
      console.log('[ChatScreen] Supabase Subscription Plan Detected:', plan);
      if (cachedSubscriptionTier && cachedSubscriptionTier !== plan) {
        if (normalizedPlan === 'premium') {
          console.log('[ChatScreen] Plan upgraded to premium, resetting conversation...');
          botpress.clearConversation();
        }
      }
      setCachedSubscriptionTier(plan);

      // 2. Initialize/Create user in Botpress FIRST to establish session
      const bpUser = await botpress.createUser(session.user.id, {
        email: session.user.email,
        name: session.user.user_metadata?.full_name || 'Queen',
        subscriptionTier: plan
      });
      console.log('[ChatScreen] Botpress User Initialized:', bpUser?.botpressUserId);

      // 4. Send Custom Event for State Sync
      // The Botpress Hook "User Subscription Check" will listen for this event and update internal state.
      console.log('[ChatScreen] Sending user_data_update event...');
      const isPremium = normalizedPlan === 'premium';
      const payload = {
        tier: normalizedPlan,
        subscriptionTier: normalizedPlan,
        isPremium: isPremium,
        email: session?.user?.email,
        userId: session?.user?.id
      };

      // We don't await this so chat can load immediately, but we log errors if any
      botpress.sendEvent('user_data_update', payload)
        .catch(err => console.error('[ChatScreen] Failed to send sync event:', err));


      if (normalizedPlan === 'premium') {
        setToast({ message: `✨ Active Plan : ${plan}`, type: 'success', visible: true });
        if (!cachedSubscriptionTier) {
          console.log('[ChatScreen] First load as Premium: Clearing conversation to sync new variables');
          botpress.clearConversation();
        }
      } else {
        setToast({ message: `Active Plan: ${plan}`, type: 'success', visible: true });
      }

      const internalId = bpUser?.botpressUserId || bpUser?.user?.id || bpUser?.id;
      setBotpressUserId(internalId);
      const convoId = route.params?.conversationId;
      if (convoId) {
        botpress.setConversationId(convoId);
      } else {
        await botpress.getOrStartLastConversation();
      }

      await fetchMessages();
      setIsInitialLoad(false);
    } catch (error: any) {
      console.error('Chat Init Error:', error);
      setToast({ message: 'Failed to connect to chat', type: 'error', visible: true });
    } finally {
      setIsLoading(false);
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await botpress.listMessages();
      console.log('[ChatScreen] Raw response from Botpress:', JSON.stringify(response, null, 2));
      const currentInternalId = botpress.getInternalUserId();
      if (currentInternalId && currentInternalId !== botpressUserId) {
        setBotpressUserId(currentInternalId);
      }

      if (response && response.messages) {
        const filtered = response.messages.filter((m: any) => {
          if (!m.payload) return false;
          return m.payload.text || m.payload.type === 'choice' || m.payload.type === 'text';
        });

        const sorted = filtered.reverse();
        setMessages(sorted);
      }
    } catch (error) {
      console.error('[Chat] Fetch Messages Error:', error);
    }
  };

  const startPolling = useCallback(() => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let attempts = 0;
    const maxAttempts = 20;
    // Snapshot all message IDs currently visible — anything beyond this is "new"
    const seenMessageIds = new Set(messages.map((m: any) => m.id));

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      const response = await botpress.listMessages();
      if (response && response.messages) {
        const filtered = response.messages.filter((m: any) => {
          if (!m.payload) return false;
          return m.payload.text || m.payload.type === 'choice' || m.payload.type === 'text';
        });

        const sorted = filtered.reverse();
        setMessages(sorted);

        // Check if the last message is a NEW bot (incoming) message we haven't seen yet
        const lastMsg = sorted[sorted.length - 1];
        const isNewBotMessage =
          lastMsg &&
          lastMsg.direction === 'incoming' &&
          !lastMsg.id.startsWith('temp-') &&
          !seenMessageIds.has(lastMsg.id);

        if (isNewBotMessage) {
          // Mark it as seen so rapid re-polls don't re-trigger the stop
          seenMessageIds.add(lastMsg.id);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsBotTyping(false);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsBotTyping(false);
      }
    }, 800);
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    const userMessageText = inputText.trim();
    setInputText('');

    const tempMsg: any = {
      id: `temp-${Date.now()}`,
      payload: { type: 'text', text: userMessageText },
      userId: botpressUserId,
      direction: 'outgoing',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setIsBotTyping(true);

    try {
      await botpress.sendMessage(userMessageText);
      startPolling();
    } catch (error: any) {
      console.error('[Chat] Send Error:', error.response?.data || error.message);
      setToast({ message: 'Message failed to send', type: 'error', visible: true });
      setIsBotTyping(false);
    }
  }, [inputText, botpressUserId, startPolling]);

  const handleChoiceSelect = useCallback(async (label: string) => {
    const tempMsg: any = {
      id: `temp-${Date.now()}`,
      payload: { type: 'text', text: label },
      userId: botpressUserId,
      direction: 'outgoing',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMsg]);
    setIsBotTyping(true);

    try {
      await botpress.sendMessage(label);
      startPolling();
    } catch (error) {
      setToast({ message: 'Failed to send choice', type: 'error', visible: true });
      setIsBotTyping(false);
    }
  }, [botpressUserId, startPolling]);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    // Hide system events from UI
    if (item.payload?.text?.startsWith('[SYSTEM_EVENT]')) return null;

    const isUser = item.direction === 'outgoing' || (item.userId && item.userId === botpressUserId);
    const isChoice = item.payload?.type === 'choice';

    return (
      <View style={[
        styles.messageRow,
        isUser ? styles.userRow : styles.botRow
      ]}>
        <View style={isUser ? styles.userRowContent : styles.botRowContent}>
          <View style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble
          ]}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userText : styles.botText
            ]}>
              {item.payload?.text || ''}
            </Text>
          </View>

          {isChoice && item.payload?.options && !isUser && (
            <View style={styles.choicesContainer}>
              {item.payload.options.map((option: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.choiceButton}
                  onPress={() => handleChoiceSelect(option.label)}
                >
                  <Text style={styles.choiceText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }, [botpressUserId, handleChoiceSelect]);

  const renderFooter = useCallback(() => (
    isBotTyping ? (
      <View style={styles.typingWrapper}>
        <TypingDots />
      </View>
    ) : <View style={{ height: spacing.sm }} />
  ), [isBotTyping]);

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Queen'} ✨</Text>
      <Text style={styles.welcomeText}>How can I assist you today?</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Pink Pill Chat"
        leftIcon="menu"
        onLeftPress={() => navigation.openDrawer()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={true}
        style={[styles.keyboardView, { flex: 1 }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <View style={[styles.flatListWrapper, { flex: 1 }]}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item.id || index.toString()}
              contentContainerStyle={styles.messagesList}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={renderWelcome}
              ListFooterComponent={renderFooter}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" // Important for scrolling while keyboard is open
              removeClippedSubviews={true}
              windowSize={10}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
            />
          )}
        </View>

        <View style={[
          styles.inputContainer,
          {
            paddingBottom: (Platform.OS === 'android' && keyboardHeight > 0)
              ? 10
              : (insets.bottom || spacing.sm)
          }
        ]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Feather name="arrow-up" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  keyboardView: {
    flex: 1,
  },
  flatListWrapper: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: HEADER_HEIGHT + spacing.lg,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRowContent: {
    alignItems: 'flex-end',
    width: '100%',
  },
  botRowContent: {
    alignItems: 'flex-start',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: responsiveFontSize(14),
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: colors.textPrimary,
  },
  choicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  choiceButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  choiceText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cream,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  typingWrapper: {
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  welcomeContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: HEADER_HEIGHT, // Offset padding to better visually center
  },
  welcomeTitle: {
    ...typography.display,
    fontSize: responsiveFontSize(28),
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  welcomeText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
