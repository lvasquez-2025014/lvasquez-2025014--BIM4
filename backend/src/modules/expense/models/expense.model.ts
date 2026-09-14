import type { Document } from 'mongodb';

export interface Expense extends Document {
  _id?: string;
  usuario: string;
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  fecha: Date;
}

export interface ExpenseDto extends Omit<Expense, '_id'> {
  id: string;
}