import { Module } from '@nestjs/common';
import { CategoryService } from './services/category.service.js';
import { CategoryController } from './category.controller.js';
import { DatabaseModule } from '../../core/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
