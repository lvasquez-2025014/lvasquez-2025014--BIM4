import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';
import { adminGuard } from './features/auth/guards/admin.guard';

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
    path: 'dashboard',
    redirectTo: 'gastos',
    pathMatch: 'full',
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
    loadComponent: () => import('./features/transactions/pages/presupuestos-page/presupuestos-page.component').then(m => m.PresupuestosPageComponent),
  },
  {
    path: 'categorias',
    canActivate: [authGuard],
    data: { title: 'Categorías' },
    loadComponent: () => import('./features/transactions/pages/categorias-page/categorias-page.component').then(m => m.CategoriasPageComponent),
  },
  {
    path: 'movimientos',
    canActivate: [authGuard],
    data: { title: 'Movimientos' },
    loadComponent: () => import('./features/transactions/pages/movimientos-page/movimientos-page.component').then(m => m.MovimientosPageComponent),
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    data: { title: 'Reportes' },
    loadComponent: () => import('./features/transactions/pages/reportes-page/reportes-page.component').then(m => m.ReportesPageComponent),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard, adminGuard],
    data: { title: 'Gestión de Usuarios' },
    loadComponent: () => import('./features/transactions/pages/usuarios-page/usuarios-page.component').then(m => m.UsuariosPageComponent),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    data: { title: 'Configuración' },
    loadComponent: () => import('./features/transactions/pages/configuracion-page/configuracion-page.component').then(m => m.ConfiguracionPageComponent),
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
