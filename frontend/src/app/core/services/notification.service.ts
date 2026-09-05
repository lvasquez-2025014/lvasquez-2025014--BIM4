import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  time: string;
  timestamp: Date;
  read: boolean;
  route?: string;
  actionText?: string;
  category?: string;
}

export interface AppNotification {
  title?: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  isPersistent?: boolean;
  actionText?: string;
  actionCallback?: () => void;
  route?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<AppNotification | null>();
  notification$ = this.notificationSubject.asObservable();

  // Reactive state for Notification Center (Topbar Dropdown)
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  show(notification: AppNotification): void {
    this.notificationSubject.next(notification);
  }

  clear(): void {
    this.notificationSubject.next(null);
  }

  setNotifications(items: NotificationItem[]): void {
    this.notifications.set(items);
  }

  addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'time'> & { id?: string; time?: string }): void {
    const newItem: NotificationItem = {
      id: item.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      message: item.message,
      type: item.type,
      time: item.time || 'Hace un momento',
      timestamp: new Date(),
      read: false,
      route: item.route,
      actionText: item.actionText,
      category: item.category
    };
    this.notifications.update(list => [newItem, ...list.filter(n => n.id !== newItem.id)]);
  }

  markAsRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllAsRead(): void {
    this.notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
  }

  removeNotification(id: string): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }

  clearAll(): void {
    this.notifications.set([]);
  }
}

