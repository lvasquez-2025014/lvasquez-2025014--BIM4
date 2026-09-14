import { inject, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Category {
  id: string;
  nombre: string;
  tipo: 'Gasto' | 'Ingreso';
  icono: string;
  color: string;
  descripcion: string;
}

export type CreateCategoryDto = Omit<Category, 'id'>;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private api = inject(ApiService);

  getCategories(): Observable<Category[]> {
    return from(this.api.get<Category[]>('/api/categories'));
  }

  addCategory(data: CreateCategoryDto): Observable<Category> {
    return from(this.api.post<Category>('/api/categories', data));
  }

  updateCategory(id: string, data: Partial<CreateCategoryDto>): Observable<Category> {
    return from(this.api.put<Category>(`/api/categories/${id}`, data));
  }

  deleteCategory(id: string): Observable<void> {
    return from(this.api.delete<void>(`/api/categories/${id}`));
  }
}
