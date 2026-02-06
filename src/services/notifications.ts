import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});


export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permission not granted');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error requesting notification permissions:', error);
        return false;
    }
}

export async function registerForPushNotifications(): Promise<string | null> {
    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            return null;
        }

        // Get the push token
        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ||
            Constants?.expoConfig?.extra?.eas?.projectId;

        // Remote notifications are not supported in Expo Go for Android SDK 53+
        const isExpoGo = Constants.appOwnership === 'expo';

        if (!projectId) {
            if (isExpoGo) {
                console.info('Push notifications: Running in Expo Go without a Project ID. Remote tokens will be skipped.');
                return null;
            }
            console.warn('Push notifications: EXPO_PUBLIC_PROJECT_ID not set. Please initialize with "eas project:init".');
            return null;
        }

        if (isExpoGo && Platform.OS === 'android') {
            console.warn('Push notifications: Remote notifications are not supported in Expo Go on Android SDK 53+. Use a development build.');
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });
        const token = tokenData.data;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await savePushToken(user.id, token);
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF1493',
                sound: 'default',
            });
        }

        return token;
    } catch (error) {
        console.error('Error registering for push notifications:', error);
        return null;
    }
}

async function savePushToken(userId: string, token: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                push_token: token,
                push_token_updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('Error saving push token:', error);
        }
    } catch (error) {
        console.error('Error in savePushToken:', error);
    }
}


export async function scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    trigger?: Notifications.NotificationTriggerInput | null
): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: data || {},
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null,
    });
}

export async function cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
}


export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
}

export function addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function updateNotificationPreferences(
    userId: string,
    preferences: {
        messages?: boolean;
        updates?: boolean;
        promos?: boolean;
        vetting?: boolean;
    }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                notification_preferences: preferences,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            console.error('Error updating notification preferences:', error);
        }
    } catch (error) {
        console.error('Error in updateNotificationPreferences:', error);
    }
}

export async function sendTestNotification(): Promise<void> {
    await scheduleLocalNotification(
        '💕 Welcome to Pinky Pocket!',
        'Your AI dating coach is ready to help you vet, decode, and level up.',
        { type: 'welcome' }
    );
}
