import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { usuario?: string; password?: string }) {
    return this.authService.login(body.usuario, body.password);
  }

  @Post('auth/google')
  @HttpCode(HttpStatus.OK)
  async loginGoogle(@Body() body: { idToken?: string }) {
    return this.authService.loginWithGoogle(body.idToken);
  }

  @Post('auth/refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() usuario: string) {
    return this.authService.refresh(usuario);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: { usuario?: string; password?: string }) {
    return this.authService.register(body.usuario, body.password);
  }
}
