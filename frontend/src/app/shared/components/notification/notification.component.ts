import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private sub!: Subscription;
  
  notification: AppNotification | null = null;
  private timeoutId: any;

  ngOnInit(): void {
    this.sub = this.notificationService.notification$.subscribe(notif => {
      this.notification = notif;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      if (notif && !notif.isPersistent) {
        this.timeoutId = setTimeout(() => {
          this.close();
        }, 5000); // auto close after 5s
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  close(): void {
    this.notification = null;
  }

  get notificationTitle(): string {
    const titles: Record<AppNotification['type'], string> = {
      success: 'Sesión iniciada',
      warning: 'Aviso',
      error: 'Algo salió mal',
      info: 'Información'
    };
    return this.notification ? titles[this.notification.type] : '';
  }

  get notificationLabel(): string {
    const labels: Record<AppNotification['type'], string> = {
      success: 'Listo', warning: 'Aviso', error: 'Error', info: 'Nota'
    };
    return this.notification ? labels[this.notification.type] : '';
  }

  onActionClick(): void {
    if (this.notification?.actionCallback) {
      this.notification.actionCallback();
    }
    this.close();
  }
}
