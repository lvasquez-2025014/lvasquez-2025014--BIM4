export interface Category {
  _id?: string;
  usuario: string;
  nombre: string;
  tipo: 'Gasto' | 'Ingreso';
  icono: string;
  color: string;
  descripcion: string;
}

export interface CategoryDto {
  id: string;
  usuario: string;
  nombre: string;
  tipo: 'Gasto' | 'Ingreso';
  icono: string;
  color: string;
  descripcion: string;
}
