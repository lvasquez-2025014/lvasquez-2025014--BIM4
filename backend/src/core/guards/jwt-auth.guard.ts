import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No autorizado');
    }

    const token = authHeader.slice(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new UnauthorizedException('Configuración de JWT ausente en servidor');
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as { usuario?: string; rol?: string };
      if (!payload.usuario) {
        throw new UnauthorizedException('Token inválido: falta usuario');
      }
      request.usuario = payload.usuario;
      request.rol = payload.rol || 'user';
      request.user = { usuario: payload.usuario, rol: request.rol };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
