import { Module } from '@nestjs/common';
import { BudgetService } from './services/budget.service.js';
import { BudgetController } from './budget.controller.js';
import { DatabaseModule } from '../../core/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
