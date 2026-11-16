
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'focus-timer';

// Notifications are enabled only for native builds configured to use them.
const notificationsDisabled =
  process.env.EXPO_PUBLIC_ENABLE_TIMER_NOTIFICATIONS !== 'true';

// Configure how notifications appear when the app is open
if (!notificationsDisabled) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Configure notifications and request permission if needed
export async function setupTimerNotifications(): Promise<boolean> {
  if (notificationsDisabled) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Focus Timer',
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
      });
    }

    const existing = await Notifications.getPermissionsAsync();

    if (existing.granted) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('Failed to configure timer notifications:', error);
    return false;
  }
}

// Schedule a notification for when the timer finishes
export async function scheduleTimerNotification(
  seconds: number
): Promise<string | null> {
  if (notificationsDisabled) {
    return null;
  }

  const requestedAt = Date.now();

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const allowed = await setupTimerNotifications();

  if (!allowed) {
    return null;
  }

  try {
    // Account for time spent configuring notifications
    const elapsedSeconds = (Date.now() - requestedAt) / 1000;
    const remainingSeconds = Math.max(
      1,
      Math.ceil(seconds - elapsedSeconds)
    );

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Focus Session Complete!',
        body: 'Your focus session is finished. Great work!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: remainingSeconds,
        ...(Platform.OS === 'android'
          ? { channelId: CHANNEL_ID }
          : {}),
      },
    });
  } catch (error) {
    console.error('Failed to schedule timer notification:', error);
    return null;
  }
}

// Cancel a scheduled notification on pause or reset
export async function cancelTimerNotification(
  notificationId: string | null
): Promise<void> {
  if (notificationsDisabled || !notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel timer notification:', error);
  }
}
