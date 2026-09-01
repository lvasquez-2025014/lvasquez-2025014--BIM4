import type { Collection } from 'mongodb';
import { db } from '../../../db.js';
import type { Expense, ExpenseDto } from '../models/expense.model.js';

function toDto(doc: Expense): ExpenseDto {
  const { _id, ...rest } = doc;
  return { id: _id!, ...rest };
}

export class ExpenseService {
  private collection: Collection<Expense> = db.collection<Expense>('expenses');

  async getAll(): Promise<ExpenseDto[]> {
    const docs = await this.collection.find().toArray();
    return docs.map(toDto);
  }

  async getById(id: string): Promise<ExpenseDto | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? toDto(doc) : null;
  }

  async create(data: Omit<Expense, '_id'>): Promise<ExpenseDto> {
    const doc: Expense = { _id: crypto.randomUUID(), ...data };
    await this.collection.insertOne(doc);
    return toDto(doc);
  }

  async update(id: string, data: Partial<Omit<Expense, '_id'>>): Promise<ExpenseDto | null> {
    await this.collection.updateOne({ _id: id }, { $set: data });
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async clearAll(): Promise<void> {
    await this.collection.deleteMany({});
  }
}