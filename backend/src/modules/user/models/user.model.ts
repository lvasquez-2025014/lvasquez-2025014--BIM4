import type { Document } from 'mongodb';

export interface UserSettings {
  moneda?: string;
  formatoFecha?: string;
  empresa?: string;
  nit?: string;
  umbralPresupuesto?: number;
  alertasActivas?: boolean;
}

export type UserRole = 'admin' | 'user';

export interface User extends Document {
  usuario: string;
  passwordHash: string;
  salt: string;
  nombre?: string;
  foto?: string;
  rol?: UserRole;
  createdAt?: Date;
  settings?: UserSettings;
}