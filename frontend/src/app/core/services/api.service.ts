import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly notification = inject(NotificationService);
    private readonly router = inject(Router);

    private readonly client: AxiosInstance = axios.create({
        baseURL: 'http://localhost:3000',
        headers: { 'Content-Type': 'application/json' }
    });

    constructor() {
        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // Interceptor para inyectar token JWT
        this.client.interceptors.request.use((config) => {
            // El token se lee directo de localStorage para evitar
            // una dependencia circular con AuthService.
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        //Interceptor para capturar los errores Http
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                // No tratar como "sesión expirada" las peticiones públicas de login/registro
                const url: string = error.config?.url ?? '';
                const isPublicEndpoint =
                    url === '/api/login' ||
                    url === '/api/auth/google' ||
                    url === '/api/register';

                if (error.response?.status === 401 && !isPublicEndpoint && localStorage.getItem('token')) {
                    // Bloquea la sesión local (equivalente a AuthService.lockSession)
                    localStorage.removeItem('token');

                    this.notification.show({
                        type: 'error',
                        message: 'Su sesión ha expirado. Por favor, inicie sesión de nuevo.',
                        isPersistent: true,
                        actionText: 'Ir al login',
                        actionCallback: () => this.router.navigate(['/login'])
                    });
                }
                return Promise.reject(error);
            }
        );
    }

    async get<T>(url: string , config?: AxiosRequestConfig): Promise<T> {
    const res = await this.client.get<T>(url, config);
    return res.data;
    }

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const res = await this.client.post<T>(url, data, config);
        return res.data;
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const res = await this.client.put<T>(url, data, config);
        return res.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await this.client.delete<T>(url, config);
        return res.data;
    }
}