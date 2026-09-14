import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ExpenseService } from './services/expense.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { Expense } from './models/expense.model.js';

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

@Controller('api/expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(@Inject(ExpenseService) private readonly expenseService: ExpenseService) {}

  @Get()
  async getAll(@CurrentUser() usuario: string) {
    return this.expenseService.getAll(usuario);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Expense, '_id'>>
  ) {
    return this.expenseService.create({
      usuario,
      descripcion: body.descripcion ?? '',
      monto: Number(body.monto) || 0,
      tipo: body.tipo === 'Ingreso' ? 'Ingreso' : 'Gasto',
      categoria: body.categoria ?? '',
      fecha: body.fecha ? parseDateRobust(body.fecha) : new Date(),
    });
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() usuario: string
  ) {
    const expense = await this.expenseService.getById(id, usuario);
    if (!expense) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return expense;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Expense, '_id' | 'usuario'>>
  ) {
    const updated = await this.expenseService.update(id, usuario, {
      ...body,
      fecha: body.fecha ? parseDateRobust(body.fecha) : undefined,
    });
    if (!updated) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return updated;
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() usuario: string
  ) {
    const deleted = await this.expenseService.delete(id, usuario);
    if (!deleted) {
      throw new NotFoundException('Gasto no encontrado');
    }
    return { mensaje: 'Gasto eliminado' };
  }

  @Delete()
  async clearAll(@CurrentUser() usuario: string) {
    await this.expenseService.clearAll(usuario);
    return { mensaje: 'Todos los gastos eliminados' };
  }
}
