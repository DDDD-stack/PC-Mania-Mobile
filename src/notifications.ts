import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { createApi } from './api/client';
import type { Api } from './api/types';
import { loadStoredSession } from './session';
import { KEYS, storage } from './storage';

export const ORDER_CHECK_TASK = 'pcmania-order-check';
const CHANNEL = 'orders';
const supported = Platform.OS !== 'web';

export type NotificationStatus = 'granted' | 'denied' | 'unsupported' | 'error';

/** Raises a local notification. Callers decide what a failure means. */
async function notify(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { screen: 'Orders' },
      ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}),
    },
    trigger: null,
  });
}

/**
 * Compares the newest order id with the last one seen on this phone and raises a local notification
 * when there are new orders. The first check after sign-in only records the current id.
 *
 * `newCount` is how many arrived since the last check; `pendingCount` is every order still waiting to be
 * confirmed, which is what the manual "check now" button reports — the 30 s foreground poll consumes the
 * delta, so a manual check would otherwise almost always say "nothing new".
 */
export async function checkForNewOrders(api: Api): Promise<{ newCount: number; pendingCount: number; latestOrderId: number | null }> {
  const summary = await api.summary();
  const latest = summary.latestOrderId;
  const pendingCount = summary.newOrders;
  const seenRaw = await storage.get(KEYS.lastSeenOrderId);
  const seen = seenRaw == null ? null : Number(seenRaw);
  if (latest == null) return { newCount: 0, pendingCount, latestOrderId: null };
  await storage.set(KEYS.lastSeenOrderId, String(latest));
  if (seen == null || latest <= seen) return { newCount: 0, pendingCount, latestOrderId: latest };

  if (supported && (await storage.get(KEYS.notifications)) !== 'off') {
    try {
      await notify(
        pendingCount > 1 ? `${pendingCount} porosi të reja` : 'Porosi e re! 🛒',
        'Hapni aplikacionin për të parë detajet dhe për ta konfirmuar.',
      );
    } catch {
      // A missing permission must not lose the order count the caller asked for.
    }
  }
  return { newCount: 1, pendingCount, latestOrderId: latest };
}

/**
 * 01:00-06:00 on the phone's clock. The site sleeps then to stay within Render's free hours (KeepAwake
 * on the server, KEEP_AWAKE_FROM / KEEP_AWAKE_UNTIL), and a background check would wake it for nothing.
 * Orders placed overnight are reported by the first check after 06:00.
 */
export function inQuietHours(now: Date = new Date()): boolean {
  const hour = now.getHours();
  return hour >= 1 && hour < 6;
}

// Must be defined at module scope so Android can run it while the app is closed.
if (supported) {
  TaskManager.defineTask(ORDER_CHECK_TASK, async () => {
    if (inQuietHours()) return BackgroundTask.BackgroundTaskResult.Success;
    try {
      const session = await loadStoredSession();
      if (!session) return BackgroundTask.BackgroundTaskResult.Success;
      await checkForNewOrders(createApi(session));
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Current permission state, for showing the user why notifications are silent. */
export async function notificationStatus(): Promise<NotificationStatus> {
  if (!supported) return 'unsupported';
  try {
    return (await Notifications.getPermissionsAsync()).granted ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}

/**
 * Asks for permission and registers the background check. Returns what actually happened so the
 * caller can tell the user, instead of failing silently.
 */
export async function setupNotifications(): Promise<{ status: NotificationStatus; background: boolean; error?: string }> {
  if (!supported) return { status: 'unsupported', background: false };
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Porositë e reja',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#f59e0b',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return { status: 'denied', background: false };

    let background = false;
    try {
      // Android enforces a 15-minute minimum; 35 keeps the wake-ups further apart, which
      // matters when the server sleeps between visits and every check wakes it up.
      await BackgroundTask.registerTaskAsync(ORDER_CHECK_TASK, { minimumInterval: 35 });
      background = true;
    } catch {
      // Background execution can be unavailable (e.g. battery saver); foreground polling still works.
    }
    return { status: 'granted', background };
  } catch (e) {
    return { status: 'error', background: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Sends a notification right now so the user can confirm the channel works. */
export async function sendTestNotification(): Promise<void> {
  if (!supported) throw new Error('Njoftimet nuk mbështeten këtu.');
  await notify('Njoftimet janë aktive ✅', 'Kështu do të duken porositë e reja.');
}

/** Never rejects: signing out must not be blocked by a background task that will not unregister. */
export async function disableBackgroundChecks(): Promise<void> {
  if (!supported) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(ORDER_CHECK_TASK)) await BackgroundTask.unregisterTaskAsync(ORDER_CHECK_TASK);
  } catch {
    // Already gone, or the module is unavailable. Either way there is nothing left to stop.
  }
}
