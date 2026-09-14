import { Module } from '@nestjs/common';
import { ExpenseService } from './services/expense.service.js';
import { ExpenseController } from './expense.controller.js';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
