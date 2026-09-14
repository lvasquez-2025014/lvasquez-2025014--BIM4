import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface ManagedUser {
  id: string;
  usuario: string;
  nombre: string;
  foto?: string;
  rol: 'admin' | 'user';
  createdAt?: string | Date;
}

export interface CreateUserDto {
  usuario: string;
  password: string;
  nombre?: string;
  rol?: 'admin' | 'user';
}

export interface UpdateUserDto {
  nombre?: string;
  rol?: 'admin' | 'user';
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private api = inject(ApiService);

  async getUsers(): Promise<ManagedUser[]> {
    return this.api.get<ManagedUser[]>('/api/users');
  }

  async createUser(dto: CreateUserDto): Promise<ManagedUser> {
    return this.api.post<ManagedUser>('/api/users', dto);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<ManagedUser> {
    return this.api.put<ManagedUser>(`/api/users/${id}`, dto);
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    return this.api.delete<{ success: boolean; message: string }>(`/api/users/${id}`);
  }
}
