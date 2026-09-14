import { Injectable, inject, signal } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';
import { SessionStateService } from '../../../core/services/session-state.service';

export interface LoginResponse {
  token: string;
  usuario: string;
  nombre?: string;
  foto?: string;
  rol?: 'admin' | 'user';
}

export const DEFAULT_PHOTOS = [
  '/assets/images/perfil.png',
  '/assets/images/perfil2.png',
  '/assets/images/perfil3.png',
] as const;

export function getDefaultPhoto(usuario: string): string {
  if (!usuario) return DEFAULT_PHOTOS[0];
  let hash = 0;
  for (let i = 0; i < usuario.length; i++) {
    hash = (hash + usuario.charCodeAt(i)) % 10007;
  }
  return DEFAULT_PHOTOS[Math.abs(hash) % DEFAULT_PHOTOS.length];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private sessionState = inject(SessionStateService);

  readonly currentUser = signal<any>(this.getCurrentUser());

  private timeout95: any;
  private timeout100: any;
  private refreshing = false;

  isSessionExpired(): boolean {
    return this.sessionState.isExpired();
  }

  resetSessionExpired(): void {
    this.sessionState.reset();
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    return from(this.api.post<LoginResponse>('/api/login', { usuario, password }));
  }

  loginWithGoogle(idToken: string): Observable<LoginResponse> {
    return from(this.api.post<LoginResponse>('/api/auth/google', { idToken }));
  }

  guardarSesion(respuesta: LoginResponse): void {
    localStorage.setItem('token', respuesta.token);
    localStorage.setItem('usuario', respuesta.usuario);
    
    const rol = respuesta.rol || 'user';
    localStorage.setItem('rol', rol);

    // Limpiar o guardar nombre
    if (respuesta.nombre) {
      localStorage.setItem('nombre', respuesta.nombre);
    } else {
      localStorage.removeItem('nombre');
    }

    // Foto: Si la API no la provee, asignar foto por defecto correspondiente al usuario
    const foto = (respuesta.foto && respuesta.foto.trim() !== '') 
      ? respuesta.foto 
      : getDefaultPhoto(respuesta.usuario);
    localStorage.setItem('foto', foto);

    this.sessionState.reset();
    this.currentUser.set(this.getCurrentUser());
    
    this.notification.show({
      type: 'success',
      message: 'Su sesión está activa. Le avisaremos antes de que expire.'
    });

    this.iniciarMonitoreo(respuesta.token);
  }

  logout(): void {
    const wasSessionExpired = this.sessionState.isExpired();
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('nombre');
    localStorage.removeItem('foto');
    localStorage.removeItem('rol');
    this.sessionState.reset();
    this.currentUser.set(null);
    this.detenerMonitoreo();
    this.router.navigate(['/login']);

    if (wasSessionExpired) {
      this.notification.show({
        type: 'error',
        message: 'Su sesión ha expirado, regrese al login para continuar',
        isPersistent: false
      });
    }
  }

  lockSession(): void {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.sessionState.lockSession();
    this.detenerMonitoreo();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  estaAutenticado(): boolean {
    const token = this.getToken();
    if (token) {
      this.iniciarMonitoreo(token);
      return true;
    }
    return false;
  }

  /** Registra actividad y reinicia el contador de inactividad. */
  registrarActividad(): void {
    const token = this.getToken();
    if (!token || this.isSessionExpired()) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return;

      const now = Math.floor(Date.now() / 1000);
      const lifetime = payload.iat ? (payload.exp - payload.iat) : 60;
      const remaining = payload.exp - now;

      // Si el token ya venció en tiempo real, bloquear de inmediato
      if (remaining <= 0) {
        this.lockSession();
        return;
      }

      // Si es un token de prueba (duración menor a 60 segundos, ej. 10s), NO auto-renovar
      // para permitir que expire en el tiempo configurado para pruebas
      if (lifetime < 60) {
        return;
      }

      // Para tokens normales (> 1 minuto): renueva cuando queda menos de la mitad
      if (remaining < lifetime / 2 && !this.refreshing) {
        this.refreshing = true;
        this.api.post<LoginResponse>('/api/auth/refresh', {}).then(
          response => {
            localStorage.setItem('token', response.token);
            this.refreshing = false;
            this.iniciarMonitoreo(response.token);
          },
          () => { this.refreshing = false; }
        );
      }
    } catch {
      this.lockSession();
    }
  }

  private iniciarMonitoreo(token: string): void {
    this.detenerMonitoreo();
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return;

      const now = Math.floor(Date.now() / 1000);
      const remaining = payload.exp - now;

      // Si ya expiró al momento de evaluar
      if (remaining <= 0) {
        if (this.router.url === '/login') {
          this.logout();
        } else {
          this.notification.show({
            type: 'error',
            message: 'Su sesión ha expirado, regrese al login para continuar',
            isPersistent: true
          });
          this.lockSession();
        }
        return;
      }

      const lifetime = payload.iat ? (payload.exp - payload.iat) : remaining;

      // Aviso previo inteligente (warning)
      let warningOffset = 300; // 5 minutos para tokens normales
      if (lifetime <= 30) {
        warningOffset = Math.floor(lifetime / 2); // A la mitad (ej: a los 5s para 10s)
      } else if (lifetime <= 300) {
        warningOffset = Math.floor(lifetime / 3);
      }

      const delayWarning = (remaining - warningOffset) * 1000;
      const delay100 = remaining * 1000; // EXACTO: exp - now

      if (delayWarning > 0) {
        this.timeout95 = setTimeout(() => {
          if (this.router.url === '/login' || this.isSessionExpired()) return;
          this.notification.show({
            type: 'warning',
            message: 'Su sesión está a punto de expirar'
          });
        }, delayWarning);
      }

      this.timeout100 = setTimeout(() => {
        if (this.router.url === '/login') {
          this.logout();
          return;
        }
        this.notification.show({
          type: 'error',
          message: 'Su sesión ha expirado, regrese al login para continuar',
          isPersistent: true
        });
        this.lockSession();
      }, delay100);

    } catch (e) {
      console.error('Error parsing token in iniciarMonitoreo', e);
    }
  }

  private detenerMonitoreo(): void {
    if (this.timeout95) clearTimeout(this.timeout95);
    if (this.timeout100) clearTimeout(this.timeout100);
  }

  getCurrentUser(): { name?: string; usuario?: string; email?: string; role?: string; rol?: 'admin' | 'user'; photo?: string } | null {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) return null;
    const nombre = localStorage.getItem('nombre') || '';
    const storedFoto = localStorage.getItem('foto');
    const foto = (storedFoto && storedFoto.trim() !== '') ? storedFoto : getDefaultPhoto(usuario);
    const storedRol = localStorage.getItem('rol');
    const rol: 'admin' | 'user' = storedRol === 'admin' ? 'admin' : 'user';

    return {
      usuario,
      name: nombre,
      photo: foto,
      rol,
      role: rol === 'admin' ? 'Administrador' : 'Cliente',
      email: usuario.includes('@') ? usuario : `${usuario}@vought.corp`
    };
  }

  updatePhoto(newPhoto: string): void {
    localStorage.setItem('foto', newPhoto);
    this.currentUser.set(this.getCurrentUser());
  }

  isAdmin(): boolean {
    const u = this.currentUser();
    return u?.rol === 'admin';
  }

  getUserFromStorage(): { name?: string; usuario?: string; email?: string; role?: string; rol?: 'admin' | 'user'; photo?: string } | null {
    return this.getCurrentUser();
  }
}
