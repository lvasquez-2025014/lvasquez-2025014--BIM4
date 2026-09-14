import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { UserService } from './services/user.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../core/guards/roles.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@Controller('api/user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() usuario: string) {
    return this.userService.getProfile(usuario);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() usuario: string,
    @Body() body: { nombre?: string; foto?: string; settings?: any }
  ) {
    return this.userService.updateSettings(usuario, body);
  }
}

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersAdminController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get()
  async getAllUsers() {
    return this.userService.findAllUsers();
  }

  @Post()
  async createUser(
    @Body() body: { usuario: string; password: string; nombre?: string; rol?: 'admin' | 'user' }
  ) {
    return this.userService.createUserByAdmin(body);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { nombre?: string; rol?: 'admin' | 'user'; password?: string }
  ) {
    return this.userService.updateUserByAdmin(id, body);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() adminUsuario: string
  ) {
    return this.userService.deleteUserByAdmin(id, adminUsuario);
  }
}
