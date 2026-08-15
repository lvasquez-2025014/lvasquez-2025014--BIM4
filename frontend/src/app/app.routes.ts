import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
  {
    path: 'notFound',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/pages/not-found-page/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];