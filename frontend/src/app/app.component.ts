import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { AuthService } from './features/auth/services/auth.service';
import { SessionStateService } from './core/services/session-state.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  authService = inject(AuthService);
  sessionState = inject(SessionStateService);
  themeService = inject(ThemeService);

  cursorX = 0;
  cursorY = 0;
  cursorVisible = false;
  cursorHovering = false;

  private lastActivityCheck = 0;

  @HostListener('document:mousemove', ['$event'])
  onCursorMove(event: MouseEvent): void {
    this.cursorX = event.clientX;
    this.cursorY = event.clientY;
    this.cursorVisible = true;
    const now = Date.now();
    if (!this.sessionState.isExpired() && now - this.lastActivityCheck > 1500) {
      this.lastActivityCheck = now;
      this.authService.registrarActividad();
    }
  }

  @HostListener('document:click')
  onUserClick(): void {
    if (!this.sessionState.isExpired()) {
      this.authService.registrarActividad();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onUserKeydown(event: KeyboardEvent): void {
    if (this.sessionState.isExpired()) {
      if (event.key === 'Enter') {
        this.logoutCompleto();
      }
      return;
    }
    this.authService.registrarActividad();
  }

  @HostListener('document:touchstart')
  onUserTouch(): void {
    if (!this.sessionState.isExpired()) {
      this.authService.registrarActividad();
    }
  }

  @HostListener('document:mouseleave')
  onCursorLeave(): void {
    this.cursorVisible = false;
  }

  @HostListener('document:mouseover', ['$event'])
  onCursorOver(event: MouseEvent): void {
    this.cursorHovering = !!(event.target as HTMLElement)?.closest('button, a, input, select, textarea');
  }

  logoutCompleto(): void {
    this.authService.logout();
  }
}