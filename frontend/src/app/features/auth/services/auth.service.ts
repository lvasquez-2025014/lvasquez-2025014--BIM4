import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginResponse {
  token: string;
  usuario: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000';
  private http = inject(HttpClient);

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/login`, { usuario, password });
  }

  guardarSesion(respuesta: LoginResponse): void {
    localStorage.setItem('token', respuesta.token);
    localStorage.setItem('usuario', respuesta.usuario);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('token');
  }
}