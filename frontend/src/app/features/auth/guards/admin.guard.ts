import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!auth.estaAutenticado() || auth.isSessionExpired()) {
    return router.createUrlTree(['/login']);
  }

  if (auth.isAdmin()) {
    return true;
  }

  notification.show({
    type: 'error',
    message: 'Acceso denegado: Esta sección requiere rol de Administrador.'
  });

  return router.createUrlTree(['/gastos']);
};
