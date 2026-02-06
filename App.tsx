import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black
} from '@expo-google-fonts/playfair-display';
import { Allura_400Regular } from '@expo-google-fonts/allura';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';

import { ChatScreen, ServicesScreen, ProfileScreen, WelcomeScreen, HomeScreen, AuthScreen, QuizScreen } from './src/screens';
import { colors, spacing, typography } from './src/theme';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationReceivedListener, addNotificationResponseListener } from './src/services/notifications';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === 'Chat') return null;

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          // const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const icons: any = {
            Home: 'home',
            Chat: 'message-circle',
            Services: 'layers',
            Profile: 'user',
          };

          return (
            <TouchableOpacity
              key={state.routes[index].key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Feather
                name={icons[route.name]}
                size={20}
                color={isFocused ? colors.cyberPink : colors.textOnDark}
                style={[styles.tabIcon, isFocused && styles.tabIconActive]}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {route.name.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    Allura_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const checkQuizStatus = useCallback((session: Session) => {
    const completed = session.user.user_metadata?.quiz_completed;
    if (quizCompleted !== !!completed) {
      setQuizCompleted(!!completed);
    }
  }, [quizCompleted]);

  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    console.log('[App] MOUNTED');

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          console.log('[App] Initial Session Found:', session.user.email);
          lastToken.current = session.access_token;
          setSession(session);
          checkQuizStatus(session);
          registerForPushNotifications().catch(() => { });
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Prevent redundant re-renders if the session token hasn't changed
      if (session?.access_token === lastToken.current && _event !== 'SIGNED_OUT') {
        return;
      }

      console.log(`[App] Auth State Change Event: ${_event}`);
      lastToken.current = session?.access_token || null;
      setSession(session);

      if (session) {
        checkQuizStatus(session);
        registerForPushNotifications().catch(() => { });
      } else {
        setQuizCompleted(null);
      }
    });

    const notificationListener = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = addNotificationResponseListener(response => {
      console.log('Notification tapped:', response);
    });

    return () => {
      subscription.unsubscribe();
      notificationListener.remove();
      responseListener.remove();
    };
  }, [checkQuizStatus]);


  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Render logic moved directly into the function body to avoid anti-pattern
  let mainContent;
  if (showWelcome) {
    mainContent = <WelcomeScreen onFinish={() => setShowWelcome(false)} />;
  } else if (!session) {
    mainContent = <AuthScreen />;
  } else if (quizCompleted === false) {
    mainContent = <QuizScreen navigation={null} onComplete={() => setQuizCompleted(true)} />;
  } else {
    mainContent = (
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Services" component={ServicesScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <View style={{ flex: 1 }}>
        {mainContent}
      </View>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 10, 30, 0.85)', // More discrete glass
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 40,
    width: '100%',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 255, 0.1)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    opacity: 0.4,
    marginBottom: 4,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
    textShadowColor: colors.cyberPink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tabLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.textOnDark,
    opacity: 0.4,
  },
  tabLabelActive: {
    opacity: 1,
    color: colors.cyberPink,
  },
});

