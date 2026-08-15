import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import type { Transaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly apiUrl = 'http://localhost:3000';

  getExpenses(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/api/expenses`, {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` },
    });
  }
}