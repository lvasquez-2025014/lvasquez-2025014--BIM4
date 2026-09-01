import { inject, Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import type { Transaction } from '../models/transaction.model';

export interface CreateTransactionDto{
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private api = inject(ApiService);

  getExpenses(): Observable<Transaction[]> {
    return from(this.api.get<Transaction[]>('/api/expenses'));
  }

  addExpense(data: CreateTransactionDto): Observable<Transaction> {
    return from(this.api.post<Transaction>('/api/expenses', data));
  }

  updateExpense(id: string, data: Partial<CreateTransactionDto>): Observable<Transaction> {
    return from(this.api.put<Transaction>(`/api/expenses/${id}`, data));
  }

  deleteExpense(id: string): Observable<void> {
    return from(this.api.delete<void>(`/api/expenses/${id}`));
  }
}