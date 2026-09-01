import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface AppNotification {
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  isPersistent?: boolean;
  actionText?: string;
  actionCallback?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<AppNotification | null>();
  notification$ = this.notificationSubject.asObservable();

  show(notification: AppNotification): void {
    this.notificationSubject.next(notification);
  }

  clear(): void {
    this.notificationSubject.next(null);
  }
}
