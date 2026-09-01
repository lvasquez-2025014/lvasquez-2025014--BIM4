import { Component, HostListener, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { AuthService } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  cursorX = 0;
  cursorY = 0;
  cursorVisible = false;
  cursorHovering = false;

  @HostListener('document:mousemove', ['$event'])
  onCursorMove(event: MouseEvent): void {
    this.cursorX = event.clientX;
    this.cursorY = event.clientY;
    this.cursorVisible = true;
    this.authService.registrarActividad();
  }

  @HostListener('document:click')
  onUserClick(): void { this.authService.registrarActividad(); }

  @HostListener('document:keydown')
  onUserKeydown(): void { this.authService.registrarActividad(); }

  @HostListener('document:touchstart')
  onUserTouch(): void { this.authService.registrarActividad(); }

  @HostListener('document:mouseleave')
  onCursorLeave(): void {
    this.cursorVisible = false;
  }

  @HostListener('document:mouseover', ['$event'])
  onCursorOver(event: MouseEvent): void {
    this.cursorHovering = !!(event.target as HTMLElement)?.closest('button, a, input, select, textarea');
  }

  cargando = false;
  mensajeError = '';

  unlockForm = this.fb.group({
    password: ['', Validators.required]
  });

  onUnlock(): void {
    if (this.unlockForm.invalid) return;

    const password = this.unlockForm.value.password;
    const usuario = localStorage.getItem('usuario');

    if (!usuario || !password) return;

    this.cargando = true;
    this.mensajeError = '';

    this.authService.login(usuario, password).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.authService.guardarSesion(respuesta);
        this.unlockForm.reset();
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Contraseña incorrecta';
      }
    });
  }

  logoutCompleto(): void {
    this.authService.logout();
  }
}
p