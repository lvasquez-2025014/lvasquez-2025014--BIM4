import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { ObjectId, type Collection } from 'mongodb';
import { DatabaseService } from '../../../core/database/database.service.js';
import type { User, UserRole } from '../models/user.model.js';

@Injectable()
export class UserService {
  private collection!: Collection<User>;

  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  private getCol(): Collection<User> {
    if (!this.collection) {
      this.collection = this.databaseService.getCollection<User>('users');
    }
    return this.collection;
  }

  async findByUsuario(usuario: string): Promise<User | null> {
    return this.getCol().findOne({ usuario });
  }

  async create(usuario: string, password: string, nombre?: string, rol?: UserRole): Promise<User> {
    const { hash, salt } = this.hashPassword(password);
    const assignedRole: UserRole = rol || 'user';
    const user: User = {
      usuario,
      passwordHash: hash,
      salt,
      nombre: nombre || usuario,
      rol: assignedRole,
      createdAt: new Date(),
    };
    const result = await this.getCol().insertOne(user);
    user._id = result.insertedId;
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

  async getProfile(usuario: string) {
    const user = await this.findByUsuario(usuario);
    return {
      usuario,
      nombre: user?.nombre || '',
      foto: user?.foto || '',
      rol: user?.rol || 'user',
      settings: user?.settings || null,
    };
  }

  async updateSettings(usuario: string, data: { nombre?: string; foto?: string; settings?: any }) {
    const update: Record<string, any> = {};
    if (data.nombre !== undefined) update.nombre = data.nombre;
    if (data.foto !== undefined) update.foto = data.foto;
    if (data.settings !== undefined) update.settings = data.settings;
    if (Object.keys(update).length > 0) {
      await this.getCol().updateOne({ usuario }, { $set: update });
    }
    return this.getProfile(usuario);
  }

  async updateProfile(usuario: string, data: { nombre?: string; foto?: string }): Promise<void> {
    const update: Record<string, string> = {};
    if (data.nombre) update.nombre = data.nombre;
    if (data.foto) update.foto = data.foto;
    if (Object.keys(update).length > 0) {
      await this.getCol().updateOne({ usuario }, { $set: update });
    }
  }

  // Métodos de Administración de Usuarios (Exclusivos para rol Admin)
  async findAllUsers() {
    const users = await this.getCol().find().toArray();
    return users.map(u => ({
      id: (u._id as any)?.toString() || '',
      usuario: u.usuario,
      nombre: u.nombre || u.usuario,
      foto: u.foto || '',
      rol: (u.rol || 'user') as UserRole,
      createdAt: u.createdAt || new Date(),
    }));
  }

  async createUserByAdmin(data: { usuario: string; password: string; nombre?: string; rol?: UserRole }) {
    const existing = await this.findByUsuario(data.usuario);
    if (existing) {
      throw new ConflictException(`El usuario "${data.usuario}" ya existe en el sistema`);
    }
    const created = await this.create(data.usuario, data.password, data.nombre, data.rol || 'user');
    return {
      id: (created._id as any)?.toString() || '',
      usuario: created.usuario,
      nombre: created.nombre,
      rol: created.rol,
      createdAt: created.createdAt,
    };
  }

  async updateUserByAdmin(id: string, data: { nombre?: string; rol?: UserRole; password?: string }) {
    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { usuario: id };
    }

    const user = await this.getCol().findOne(filter);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const update: Record<string, any> = {};
    if (data.nombre !== undefined) update.nombre = data.nombre;
    if (data.rol !== undefined) {
      update.rol = data.rol;
    }
    if (data.password && data.password.trim().length > 0) {
      const { hash, salt } = this.hashPassword(data.password);
      update.passwordHash = hash;
      update.salt = salt;
    }

    if (Object.keys(update).length > 0) {
      await this.getCol().updateOne(filter, { $set: update });
    }

    const updated = await this.getCol().findOne(filter);
    return {
      id: (updated?._id as any)?.toString() || id,
      usuario: updated?.usuario,
      nombre: updated?.nombre,
      rol: updated?.rol || 'user',
      createdAt: updated?.createdAt,
    };
  }

  async deleteUserByAdmin(id: string, currentAdminUsuario: string) {
    let filter: any;
    try {
      filter = { _id: new ObjectId(id) };
    } catch {
      filter = { usuario: id };
    }

    const user = await this.getCol().findOne(filter);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.usuario === currentAdminUsuario) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta de administrador');
    }

    await this.getCol().deleteOne(filter);
    return { success: true, message: `Usuario ${user.usuario} eliminado exitosamente` };
  }

  private verifyPassword(password: string, salt: string, hash: string): boolean {
    const candidate = scryptSync(password, salt, 64);
    const stored = Buffer.from(hash, 'hex');
    return candidate.length === stored.length && timingSafeEqual(candidate, stored);
  }
}