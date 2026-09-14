import { Injectable, Inject } from '@nestjs/common';
import type { Collection } from 'mongodb';
import { DatabaseService } from '../../../core/database/database.service.js';
import type { Budget, BudgetDto } from '../models/budget.model.js';
import crypto from 'node:crypto';

function toDto(doc: Budget): BudgetDto {
  const { _id, ...rest } = doc;
  return { id: _id!, ...rest };
}

@Injectable()
export class BudgetService {
  private collection!: Collection<Budget>;

  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  private getCol(): Collection<Budget> {
    if (!this.collection) {
      this.collection = this.databaseService.getCollection<Budget>('budgets');
    }
    return this.collection;
  }

  async getAll(usuario: string): Promise<BudgetDto[]> {
    const docs = await this.getCol().find({ usuario }).toArray();
    return docs.map(toDto);
  }

  async create(data: Omit<Budget, '_id'>): Promise<BudgetDto> {
    const doc: Budget = {
      _id: crypto.randomUUID(),
      usuario: data.usuario,
      categoria: data.categoria,
      presupuestado: Number(data.presupuestado) || 0,
      icono: data.icono || 'category',
      descripcion: data.descripcion || '',
    };
    await this.getCol().insertOne(doc);
    return toDto(doc);
  }

  async update(id: string, usuario: string, data: Partial<Omit<Budget, '_id' | 'usuario'>>): Promise<BudgetDto | null> {
    const updateData: any = { ...data };
    if (updateData.presupuestado !== undefined) {
      updateData.presupuestado = Number(updateData.presupuestado) || 0;
    }
    await this.getCol().updateOne({ _id: id, usuario }, { $set: updateData });
    const doc = await this.getCol().findOne({ _id: id, usuario });
    return doc ? toDto(doc) : null;
  }

  async delete(id: string, usuario: string): Promise<boolean> {
    const res = await this.getCol().deleteOne({ _id: id, usuario });
    return res.deletedCount > 0;
  }
}
