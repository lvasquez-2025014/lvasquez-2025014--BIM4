import { Module } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module.js';
import { UserModule } from './modules/user/user.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExpenseModule } from './modules/expense/expense.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { BudgetModule } from './modules/budget/budget.module.js';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
    AuthModule,
    ExpenseModule,
    CategoryModule,
    BudgetModule,
  ],
})
export class AppModule {}
