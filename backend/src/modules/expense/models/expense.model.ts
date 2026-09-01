export interface Expense {
  _id?: string;
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  fecha: Date;
}

export interface ExpenseDto extends Omit<Expense, '_id'> {
  id: string;
}