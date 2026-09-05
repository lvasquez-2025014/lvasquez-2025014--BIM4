export interface Budget {
  _id?: string;
  usuario: string;
  categoria: string;
  presupuestado: number;
  icono: string;
  descripcion: string;
}

export interface BudgetDto {
  id: string;
  usuario: string;
  categoria: string;
  presupuestado: number;
  icono: string;
  descripcion: string;
}
