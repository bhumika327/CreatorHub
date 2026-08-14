import { NotificationPayload } from './notification.types';

type NotificationListener = (userId: string, notification: NotificationPayload) => void;

export class RealtimeNotificationDispatcher {
  private static listeners = new Set<NotificationListener>();

  public static subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public static dispatch(userId: string, notification: NotificationPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(userId, notification);
      } catch (err) {
        console.error('[RealtimeNotificationDispatcher] Dispatcher listener error:', err);
      }
    });
  }
}
