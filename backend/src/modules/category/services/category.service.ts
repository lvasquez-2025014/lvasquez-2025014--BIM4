import { Injectable, Inject } from '@nestjs/common';
import type { Collection } from 'mongodb';
import { DatabaseService } from '../../../core/database/database.service.js';
import type { Category, CategoryDto } from '../models/category.model.js';
import crypto from 'node:crypto';

function toDto(doc: Category): CategoryDto {
  const { _id, ...rest } = doc;
  return { id: _id!, ...rest };
}

@Injectable()
export class CategoryService {
  private collection!: Collection<Category>;

  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  private getCol(): Collection<Category> {
    if (!this.collection) {
      this.collection = this.databaseService.getCollection<Category>('categories');
    }
    return this.collection;
  }

  async getAll(usuario: string): Promise<CategoryDto[]> {
    const docs = await this.getCol().find({ usuario }).toArray();
    return docs.map(toDto);
  }

  async create(data: Omit<Category, '_id'>): Promise<CategoryDto> {
    const doc: Category = {
      _id: crypto.randomUUID(),
      usuario: data.usuario,
      nombre: data.nombre,
      tipo: data.tipo,
      icono: data.icono || 'category',
      color: data.color || '#10b981',
      descripcion: data.descripcion || '',
    };
    await this.getCol().insertOne(doc);
    return toDto(doc);
  }

  async update(id: string, usuario: string, data: Partial<Omit<Category, '_id' | 'usuario'>>): Promise<CategoryDto | null> {
    await this.getCol().updateOne({ _id: id, usuario }, { $set: data });
    const doc = await this.getCol().findOne({ _id: id, usuario });
    return doc ? toDto(doc) : null;
  }

  async delete(id: string, usuario: string): Promise<boolean> {
    const res = await this.getCol().deleteOne({ _id: id, usuario });
    return res.deletedCount > 0;
  }
}
