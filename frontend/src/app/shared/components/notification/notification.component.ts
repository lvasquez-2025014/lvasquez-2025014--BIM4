import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { NotificationService, AppNotification } from '../../../core/services/notification.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private sub = new Subscription();
  
  notification: AppNotification | null = null;
  private timeoutId: any;

  ngOnInit(): void {
    this.sub.add(
      this.notificationService.notification$.subscribe(notif => {
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }

        if (!notif) {
          this.notification = null;
          this.cdr.detectChanges();
          return;
        }

        // Si ya estamos en /login, la notificación de expiración debe cerrarse a los 5s (no ser persistente)
        const currentUrl = this.router.url || '';
        const isLogin = currentUrl.includes('/login');
        const isExpiredNotif = notif.message?.toLowerCase().includes('expirado') ?? false;

        if (isLogin && isExpiredNotif) {
          this.notification = { ...notif, isPersistent: false };
        } else {
          this.notification = { ...notif };
        }

        if (!this.notification.isPersistent) {
          this.timeoutId = setTimeout(() => {
            this.close();
          }, 5000); // auto close after 5s
        }

        this.cdr.detectChanges();
      })
    );

    // Cuando el usuario regresa al login tras expirar la sesión,
    // la notificación se convierte en no-persistente y se cierra automáticamente 5 segundos después.
    this.sub.add(
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url || '';
        if (url.includes('/login') && this.notification) {
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }
          // Asignar nuevo objeto con isPersistent = false para que Angular detecte el cambio y muestre la barra de progreso
          this.notification = {
            ...this.notification,
            isPersistent: false
          };
          this.timeoutId = setTimeout(() => {
            this.close();
          }, 5000);
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  close(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.notification = null;
    this.cdr.detectChanges();
  }

  get notificationTitle(): string {
    if (this.notification?.title) {
      return this.notification.title;
    }
    const titles: Record<AppNotification['type'], string> = {
      success: 'Operación exitosa',
      warning: 'Aviso',
      error: 'Error',
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
    } else if (this.notification?.route) {
      this.router.navigate([this.notification.route]);
    }
    this.close();
  }
}
