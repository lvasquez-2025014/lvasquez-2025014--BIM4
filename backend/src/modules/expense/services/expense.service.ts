import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { Collection } from 'mongodb';
import { DatabaseService } from '../../../core/database/database.service.js';
import type { Expense, ExpenseDto } from '../models/expense.model.js';
import crypto from 'node:crypto';

function toDto(doc: Expense): ExpenseDto {
  const { _id, ...rest } = doc;
  return { id: _id!, ...rest };
}

function parseDateRobust(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (typeof input === 'string') {
    const str = input.trim();
    const datePart = str.includes('T') ? str.split('T')[0] : str;
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, 12, 0, 0);
      }
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

function isFutureDate(dateInput: string | Date | undefined | null): boolean {
  if (!dateInput) return false;
  const d = parseDateRobust(dateInput);
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return d.getTime() > todayEnd.getTime();
}

@Injectable()
export class ExpenseService {
  private collection!: Collection<Expense>;

  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  private getCol(): Collection<Expense> {
    if (!this.collection) {
      this.collection = this.databaseService.getCollection<Expense>('expenses');
    }
    return this.collection;
  }

  async getAll(usuario: string): Promise<ExpenseDto[]> {
    const docs = await this.getCol().find({ usuario }).toArray();
    return docs.map(toDto);
  }

  async getById(id: string, usuario: string): Promise<ExpenseDto | null> {
    const doc = await this.getCol().findOne({ _id: id, usuario });
    return doc ? toDto(doc) : null;
  }

  async create(data: Omit<Expense, '_id'>): Promise<ExpenseDto> {
    const monto = Number(data.monto) || 0;

    // Validación de fecha: No se permite registrar días futuros
    if (isFutureDate(data.fecha)) {
      throw new BadRequestException('No puedes registrar un movimiento para un día que aún no ha llegado');
    }

    if (data.tipo === 'Gasto') {
      const all = await this.getAll(data.usuario);
      const totalIngresos = all
        .filter(e => e.tipo === 'Ingreso')
        .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
      const totalGastos = all
        .filter(e => e.tipo === 'Gasto')
        .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
      const saldoDisponible = totalIngresos - totalGastos;

      if (monto > saldoDisponible) {
        throw new BadRequestException('No puedes gastar porque no tienes el dinero suficiente');
      }
    }

    const doc: Expense = {
      _id: crypto.randomUUID(),
      usuario: data.usuario,
      descripcion: data.descripcion,
      monto: monto,
      tipo: data.tipo,
      categoria: data.categoria,
      fecha: data.fecha,
    };
    await this.getCol().insertOne(doc);
    return toDto(doc);
  }

  async update(id: string, usuario: string, data: Partial<Omit<Expense, '_id' | 'usuario'>>): Promise<ExpenseDto | null> {
    const existing = await this.getById(id, usuario);
    if (!existing) return null;

    const newFecha = data.fecha ?? existing.fecha;
    if (isFutureDate(newFecha)) {
      throw new BadRequestException('No puedes registrar un movimiento para un día que aún no ha llegado');
    }

    const newTipo = data.tipo ?? existing.tipo;
    const newMonto = data.monto !== undefined ? (Number(data.monto) || 0) : existing.monto;

    if (newTipo === 'Gasto') {
      const all = await this.getAll(usuario);
      const totalIngresos = all
        .filter(e => e.tipo === 'Ingreso')
        .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
      const otherGastos = all
        .filter(e => e.id !== id && e.tipo === 'Gasto')
        .reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
      const saldoDisponible = totalIngresos - otherGastos;

      if (newMonto > saldoDisponible) {
        throw new BadRequestException('No puedes gastar porque no tienes el dinero suficiente');
      }
    }

    await this.getCol().updateOne({ _id: id, usuario }, { $set: data });
    return this.getById(id, usuario);
  }

  async delete(id: string, usuario: string): Promise<boolean> {
    const result = await this.getCol().deleteOne({ _id: id, usuario });
    return result.deletedCount > 0;
  }

  async clearAll(usuario: string): Promise<void> {
    await this.getCol().deleteMany({ usuario });
  }
}