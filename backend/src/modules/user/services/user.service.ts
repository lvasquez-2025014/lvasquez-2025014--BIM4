import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Collection } from 'mongodb';
import { db } from '../../../db.js';
import type { User } from '../models/user.model.js';

export class UserService {
  private collection: Collection<User> = db.collection<User>('users');

  async findByUsuario(usuario: string): Promise<User | null> {
    return this.collection.findOne({ usuario });
  }

  async create(usuario: string, password: string): Promise<User> {
    const { hash, salt } = this.hashPassword(password);
    const user: User = { usuario, passwordHash: hash, salt };
    await this.collection.insertOne(user);
    return user;
  }

  async verificarCredenciales(usuario: string, password: string): Promise<boolean> {
    const user = await this.findByUsuario(usuario);
    if (!user) return false;
    return this.verifyPassword(password, user.salt, user.passwordHash);
  }

  private hashPassword(password: string): { hash: string; salt: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  private verifyPassword(password: string, salt: string, hash: string): boolean {
    const candidate = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
  }
}