import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';

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

import { ChatScreen, ProfileScreen, WelcomeScreen, AuthScreen } from './src/screens';
import { colors, spacing, typography } from './src/theme';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications, addNotificationReceivedListener, addNotificationResponseListener } from './src/services/notifications';
import './src/services/firebase';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Sidebar } from './src/components';

const { width } = Dimensions.get('window');

const Drawer = createDrawerNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();



export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
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



  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    console.log('[App] MOUNTED');

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          console.log('[App] Initial Session Found:', session.user.email);
          lastToken.current = session.access_token;
          setSession(session);
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
        registerForPushNotifications().catch(() => { });
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
  }, []);


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
  } else {
    mainContent = (
      <NavigationContainer>
        <StatusBar style="light" />
        <Drawer.Navigator
          drawerContent={(props) => <Sidebar {...props} />}
          screenOptions={{
            headerShown: false,
            drawerType: 'front',
            drawerStyle: {
              width: '63%',
              backgroundColor: colors.cream,
            },
            overlayColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Drawer.Screen name="Chat" component={ChatScreen} />
          <Drawer.Screen name="Profile" component={ProfileScreen} />
        </Drawer.Navigator>
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

});

