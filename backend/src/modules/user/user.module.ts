import { Module } from '@nestjs/common';
import { UserService } from './services/user.service.js';
import { UserController, UsersAdminController } from './user.controller.js';

@Module({
  controllers: [UserController, UsersAdminController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
