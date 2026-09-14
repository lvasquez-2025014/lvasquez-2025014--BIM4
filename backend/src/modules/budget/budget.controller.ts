import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { BudgetService } from './services/budget.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { Budget } from './models/budget.model.js';

@Controller('api/budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(@Inject(BudgetService) private readonly budgetService: BudgetService) {}

  @Get()
  async getAll(@CurrentUser() usuario: string) {
    return this.budgetService.getAll(usuario);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Budget, '_id'>>
  ) {
    return this.budgetService.create({
      usuario,
      categoria: body.categoria || 'Otros',
      presupuestado: Number(body.presupuestado) || 0,
      icono: body.icono || 'category',
      descripcion: body.descripcion || '',
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Budget, '_id' | 'usuario'>>
  ) {
    const updated = await this.budgetService.update(id, usuario, body);
    if (!updated) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return updated;
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() usuario: string
  ) {
    const deleted = await this.budgetService.delete(id, usuario);
    if (!deleted) {
      throw new NotFoundException('Presupuesto no encontrado');
    }
    return { mensaje: 'Presupuesto eliminado' };
  }
}
