import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'focus-timer';

const notificationsDisabled =
  process.env.EXPO_PUBLIC_ENABLE_TIMER_NOTIFICATIONS !== 'true';

// Expo Go uses its own Android app and notification channels. Its channel APIs
// can fail on some versions, so only manage our custom channel in native builds.
const useCustomAndroidChannel =
  Platform.OS === 'android' && Constants.expoGoConfig == null;

// Show the completion notification even if Modo is currently in the foreground.
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

function hasNotificationPermission(
  permissions: Notifications.NotificationPermissionsStatus
): boolean {
  return (
    permissions.granted ||
    (Platform.OS === 'ios' &&
      permissions.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL)
  );
}

export async function setupTimerNotifications(): Promise<boolean> {
  if (notificationsDisabled) {
    return false;
  }

  try {
    // Preserve the high-importance channel in standalone/development builds.
    // Expo Go will instead use expo-notifications' fallback Android channel.
    if (useCustomAndroidChannel) {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Focus Timer',
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    if (hasNotificationPermission(existing)) {
      return true;
    }

    const requested = await Notifications.requestPermissionsAsync();
    return hasNotificationPermission(requested);
  } catch (error) {
    console.error('Failed to configure timer notifications:', error);
    return false;
  }
}

export async function scheduleTimerNotification(
  seconds: number
): Promise<string | null> {
  if (notificationsDisabled || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const requestedAt = Date.now();
  const allowed = await setupTimerNotifications();
  if (!allowed) {
    return null;
  }

  try {
    // Account for time spent waiting for the permission prompt.
    const elapsedSeconds = (Date.now() - requestedAt) / 1000;
    const remainingSeconds = Math.max(1, Math.ceil(seconds - elapsedSeconds));

    // The returned ID is needed by FocusTimer to cancel on pause/reset.
    // Do not run diagnostic queries in this try block after scheduling:
    // a debug-query failure could otherwise discard the valid ID.
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Focus Session Complete!',
        body: 'Your focus session is finished. Great work!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: remainingSeconds,
        ...(useCustomAndroidChannel ? { channelId: CHANNEL_ID } : {}),
      },
    });
  } catch (error) {
    console.error('Failed to schedule timer notification:', error);
    return null;
  }
}

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