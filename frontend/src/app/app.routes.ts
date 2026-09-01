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
    path: 'gastos/nuevo',
    canActivate: [authGuard],
    data: { title: 'Gastos' },
    loadComponent: () => import('./features/transactions/pages/gastos-page/gastos-page.component').then(m => m.GastosPageComponent),
  },
  {
    path: 'gastos',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/transactions/pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'ingresos',
    canActivate: [authGuard],
    data: { title: 'Ingresos' },
    loadComponent: () => import('./features/transactions/pages/ingresos-page/ingresos-page.component').then(m => m.IngresosPageComponent),
  },
  {
    path: 'presupuestos',
    canActivate: [authGuard],
    data: { title: 'Presupuestos' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  {
    path: 'categorias',
    canActivate: [authGuard],
    data: { title: 'Categorías' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  {
    path: 'movimientos',
    canActivate: [authGuard],
    data: { title: 'Movimientos' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    data: { title: 'Reportes' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    data: { title: 'Configuración' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    data: { title: 'Mi Perfil' },
    loadComponent: () => import('./shared/pages/placeholder-page/placeholder-page.component').then(m => m.PlaceholderPageComponent),
  },
  { path: '', redirectTo: 'gastos', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found-page/not-found-page.component').then(
        (m) => m.NotFoundPageComponent
      ),
  },
];
