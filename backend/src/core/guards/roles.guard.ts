import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const rol = request.rol || request.user?.rol;

    if (rol !== 'admin') {
      throw new ForbiddenException('Acceso denegado: Se requiere rol de Administrador');
    }

    return true;
  }
}
