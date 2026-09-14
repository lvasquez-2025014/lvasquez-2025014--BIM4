import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, NotFoundException, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { CategoryService } from './services/category.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import type { Category } from './models/category.model.js';

@Controller('api/categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(@Inject(CategoryService) private readonly categoryService: CategoryService) {}

  @Get()
  async getAll(@CurrentUser() usuario: string) {
    return this.categoryService.getAll(usuario);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Category, '_id'>>
  ) {
    return this.categoryService.create({
      usuario,
      nombre: body.nombre || 'Nueva Categoría',
      tipo: body.tipo === 'Ingreso' ? 'Ingreso' : 'Gasto',
      icono: body.icono || 'category',
      color: body.color || '#10b981',
      descripcion: body.descripcion || '',
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() usuario: string,
    @Body() body: Partial<Omit<Category, '_id' | 'usuario'>>
  ) {
    const updated = await this.categoryService.update(id, usuario, body);
    if (!updated) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return updated;
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() usuario: string
  ) {
    const deleted = await this.categoryService.delete(id, usuario);
    if (!deleted) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return { mensaje: 'Categoría eliminada' };
  }
}
