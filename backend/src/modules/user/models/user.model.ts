export interface User {
  usuario: string;
  passwordHash: string;
  salt: string;
  nombre?: string;
  foto?: string;
}