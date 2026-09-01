import { Component, signal, inject, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  menuToggle = output<void>();

  searchQuery = signal('');
  userInitials = signal('');
  userName = signal('');
  userPhoto = signal<string | null>(null);
  showProfileMenu = signal(false);
  showPhotoPreview = signal(false);

  constructor() {
    this.loadUserData();
  }

  private loadUserData(): void {
    const user = this.auth.getCurrentUser?.() || this.auth.getUserFromStorage?.();
    if (user) {
      this.userName.set(user.name || user.usuario || '');
      this.userInitials.set(this.getInitials(user.name || user.usuario || ''));
      this.userPhoto.set(user.photo || null);
    }
  }

  private getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onNotificationsClick(): void {
    this.notification.show({
      type: 'warning',
      message: 'Tiene 2 alertas de presupuesto y 7 gastos pendientes de revisar.',
      isPersistent: true,
      actionText: 'Ver detalles',
      actionCallback: () => {}
    });
  }

  onProfileClick(): void {
    this.showProfileMenu.update(v => !v);
  }

  openPhotoPreview(event: MouseEvent): void {
    event.stopPropagation();
    if (this.userPhoto()) this.showPhotoPreview.set(true);
  }

  closePhotoPreview(): void {
    this.showPhotoPreview.set(false);
  }

  onLogout(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    console.log('Botón de logout presionado'); // Debug
    this.showProfileMenu.set(false);
    this.auth.logout();
    console.log('Logout ejecutado'); // Debug
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-container')) {
      this.showProfileMenu.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePhotoPreview();
    this.showProfileMenu.set(false);
  }
}
