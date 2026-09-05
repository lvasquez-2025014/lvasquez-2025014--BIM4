import { inject, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface Budget {
  id: string;
  categoria: string;
  presupuestado: number;
  icono: string;
  descripcion: string;
}

export type CreateBudgetDto = Omit<Budget, 'id'>;

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private api = inject(ApiService);

  getBudgets(): Observable<Budget[]> {
    return from(this.api.get<Budget[]>('/api/budgets'));
  }

  addBudget(data: CreateBudgetDto): Observable<Budget> {
    return from(this.api.post<Budget>('/api/budgets', data));
  }

  updateBudget(id: string, data: Partial<CreateBudgetDto>): Observable<Budget> {
    return from(this.api.put<Budget>(`/api/budgets/${id}`, data));
  }

  deleteBudget(id: string): Observable<void> {
    return from(this.api.delete<void>(`/api/budgets/${id}`));
  }
}
