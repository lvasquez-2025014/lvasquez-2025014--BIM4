import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { ApiService } from '../../../core/services/api.service';

export interface LoginResponse {
  token: string;
  usuario: string;
  nombre?: string;
  foto?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  private timeout95: any;
  private timeout100: any;
  private sessionExpired = false;
  private refreshing = false;

  isSessionExpired(): boolean {
    return this.sessionExpired;
  }

  resetSessionExpired(): void {
    this.sessionExpired = false;
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
    if (respuesta.nombre) localStorage.setItem('nombre', respuesta.nombre);
    if (respuesta.foto) {
      localStorage.setItem('foto', respuesta.foto);
      console.log('Foto guardada en localStorage:', respuesta.foto); // Debug
    }
    this.sessionExpired = false;
    
    this.notification.show({
      type: 'success',
      message: 'Su sesión está activa. Le avisaremos antes de que expire.'
    });

    this.iniciarMonitoreo(respuesta.token);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('nombre');
    localStorage.removeItem('foto');
    this.sessionExpired = false;
    this.detenerMonitoreo();
    this.router.navigate(['/login']);
  }

  lockSession(): void {
    localStorage.removeItem('token');
    this.sessionExpired = true;
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
    if (!token || this.sessionExpired) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const lifetime = Math.max(60, (payload.exp || now + 900) - (payload.iat || now));
      const remaining = (payload.exp || now) - now;

      // Renueva el JWT cuando queda menos de la mitad de su vida útil.
      // Así la actividad real del usuario mantiene la sesión válida también en el servidor.
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
      } else {
        this.iniciarMonitoreo(token);
      }
    } catch {
      this.lockSession();
    }
  }

  private iniciarMonitoreo(token: string): void {
    this.detenerMonitoreo();
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp || !payload.iat) return;

      const now = Math.floor(Date.now() / 1000);
      const lifetime = payload.exp - payload.iat;
      
      // Lógica inteligente de notificaciones:
      // Si el token dura más de 5 minutos, avisar 5 minutos antes.
      // Si el token dura menos de 5 minutos, avisar a la mitad de su vida.
      let warningOffset = 300; // 5 minutos
      if (lifetime <= 300) {
        warningOffset = lifetime / 2;
      }

      // El vencimiento se cuenta desde la última actividad, no desde el login.
      const timeAtWarning = now + lifetime - warningOffset;
      const timeAt100 = now + lifetime;

      const delayWarning = (timeAtWarning - now) * 1000;
      const delay100 = (timeAt100 - now) * 1000;

      if (delayWarning > 0) {
        this.timeout95 = setTimeout(() => {
          if (this.router.url === '/login') return;
          this.notification.show({
            type: 'warning',
            message: 'Su sesión está a punto de expirar'
          });
        }, delayWarning);
      } else if (delay100 > 0 && delayWarning <= 0) {
        // Si ya pasamos el tiempo de warning pero no el de expiración, lo mostramos de una vez
        if (this.router.url !== '/login') {
          this.notification.show({
            type: 'warning',
            message: 'Su sesión está a punto de expirar'
          });
        }
      }

      if (delay100 > 0) {
        this.timeout100 = setTimeout(() => {
          if (this.router.url === '/login') {
            this.logout();
            return;
          }
          this.notification.show({
            type: 'error',
            message: 'Su sesión ha expirado. Por favor ingrese su contraseña nuevamente.',
            isPersistent: true
          });
          this.lockSession();
        }, delay100);
      } else if (delay100 <= 0) {
        if (this.router.url === '/login') {
          this.logout();
        } else {
          this.lockSession();
        }
      }

    } catch (e) {
      console.error('Error parsing token', e);
    }
  }

  private detenerMonitoreo(): void {
    if (this.timeout95) clearTimeout(this.timeout95);
    if (this.timeout100) clearTimeout(this.timeout100);
  }

private readonly defaultPhotos = [
    '/assets/images/perfil.png',
    '/assets/images/perfil2.png',
    '/assets/images/perfil3.png',
  ];

  /**
   * Elige de forma aleatoria pero estable una foto por defecto
   * para los usuarios registrados directamente en la BD (sin Google).
   * Se usa un hash del usuario para que cada usuario tenga siempre
   * la misma imagen, repartida aleatoriamente entre las disponibles.
   */
  private getDefaultPhoto(usuario: string): string {
    let hash = 0;
    for (let i = 0; i < usuario.length; i++) {
      hash = (hash + usuario.charCodeAt(i)) % 10007;
    }
    return this.defaultPhotos[hash % this.defaultPhotos.length];
  }
  getCurrentUser(): { name?: string; usuario?: string; email?: string; role?: string; photo?: string } | null {
    const usuario = localStorage.getItem('usuario');
    if (!usuario) return null;
    const nombre = localStorage.getItem('nombre') || '';
    const foto = localStorage.getItem('foto') || '';
    console.log('Foto desde localStorage:', foto); // Debug
    return {
      usuario,
      name: nombre || usuario,
      email: `${usuario}@ejemplo.com`,
      role: 'Administrador',
      // Los usuarios de Google traen foto real (payload.picture).
      // Los usuarios registrados directamente en la BD no tienen foto:
      // se les asigna aleatoriamente una del perfil1-3 (perfil.png, perfil2.png, perfil3.png)
      photo: foto || this.getDefaultPhoto(usuario)
    };
  }

  getUserFromStorage(): { name?: string; usuario?: string; email?: string; role?: string; photo?: string } | null {
    return this.getCurrentUser();
  }
}
