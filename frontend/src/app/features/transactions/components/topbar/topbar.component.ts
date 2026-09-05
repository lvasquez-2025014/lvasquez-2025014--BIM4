import { Component, signal, inject, HostListener, output, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthService, getDefaultPhoto, DEFAULT_PHOTOS } from '../../../auth/services/auth.service';
import { NotificationService, NotificationItem } from '../../../../core/services/notification.service';
import { BudgetService, Budget } from '../../services/budget.service';
import { TransactionService } from '../../services/transaction.service';
import { ThemeService, ThemeId, ThemeOption } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private budgetService = inject(BudgetService);
  private txService = inject(TransactionService);
  private router = inject(Router);
  readonly themeService = inject(ThemeService);

  menuToggle = output<void>();

  searchQuery = signal('');
  showProfileMenu = signal(false);
  showNotificationsMenu = signal(false);
  showThemeMenu = signal(false);
  showPhotoPreview = signal(false);
  imageFailed = signal(false);

  readonly notifications = this.notification.notifications;
  readonly unreadCount = this.notification.unreadCount;

  readonly userName = computed(() => {
    const user = this.auth.currentUser();
    return user?.name || user?.usuario || 'Usuario';
  });

  readonly userRole = computed(() => {
    return this.auth.currentUser()?.role || 'Cliente';
  });

  readonly isAdmin = computed(() => this.auth.isAdmin());

  readonly userInitials = computed(() => {
    const name = this.userName();
    if (!name) return 'AD';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  readonly userPhoto = computed(() => {
    if (this.imageFailed()) {
      return DEFAULT_PHOTOS[0];
    }
    const photo = this.auth.currentUser()?.photo;
    if (photo && photo.trim() !== '') {
      return photo;
    }
    const user = this.auth.currentUser();
    return getDefaultPhoto(user?.usuario || 'admin');
  });

  ngOnInit(): void {
    this.loadNotificationData();
  }

  loadNotificationData(): void {
    forkJoin({
      budgets: this.budgetService.getBudgets().pipe(catchError(() => of([] as Budget[]))),
      expenses: this.txService.getExpenses().pipe(catchError(() => of([] as any[])))
    }).subscribe({
      next: ({ budgets, expenses }) => {
        this.processSystemAlerts(budgets, expenses);
      },
      error: () => {}
    });
  }

  private processSystemAlerts(budgets: Budget[], expenses: any[]): void {
    const expenseList = (expenses || []).filter((e: any) => e.tipo === 'Gasto');

    // Calcular gasto consumido por categoría
    const spentMap: Record<string, number> = {};
    for (const exp of expenseList) {
      const cat = exp.categoria || 'Otros';
      spentMap[cat] = (spentMap[cat] || 0) + (Number(exp.monto) || 0);
    }

    const items: NotificationItem[] = [];
    let alertBudgetCount = 0;

    // Generar alertas dinámicas basadas en los presupuestos reales
    for (const b of (budgets || [])) {
      const gastado = spentMap[b.categoria] || 0;
      const pct = b.presupuestado > 0 ? Math.round((gastado / b.presupuestado) * 100) : 0;

      if (pct >= 90) {
        alertBudgetCount++;
        items.push({
          id: `budget_crit_${b.id || b.categoria}`,
          title: `Presupuesto Crítico: ${b.categoria}`,
          message: `La categoría "${b.categoria}" ha alcanzado el ${pct}% del límite asignado (Q${gastado.toLocaleString('es-GT', { minimumFractionDigits: 2 })} de Q${b.presupuestado.toLocaleString('es-GT', { minimumFractionDigits: 2 })}).`,
          type: 'error',
          time: 'Alerta activa',
          timestamp: new Date(),
          read: false,
          route: '/presupuestos',
          actionText: 'Ver presupuesto',
          category: 'Presupuestos'
        });
      } else if (pct >= 70) {
        alertBudgetCount++;
        items.push({
          id: `budget_warn_${b.id || b.categoria}`,
          title: `Alerta de Presupuesto: ${b.categoria}`,
          message: `La categoría "${b.categoria}" ha consumido el ${pct}% de su capacidad presupuestada.`,
          type: 'warning',
          time: 'Alerta activa',
          timestamp: new Date(),
          read: false,
          route: '/presupuestos',
          actionText: 'Ver presupuesto',
          category: 'Presupuestos'
        });
      }
    }

    // Alerta de movimientos registrados
    if (expenseList.length > 0) {
      items.push({
        id: 'expenses_overview',
        title: 'Revisión de Movimientos',
        message: `Tiene ${expenseList.length} gastos registrados en su cuenta listos para auditoría y control.`,
        type: 'info',
        time: 'Hoy',
        timestamp: new Date(),
        read: false,
        route: '/movimientos',
        actionText: 'Revisar gastos',
        category: 'Movimientos'
      });
    }

    // Alerta de seguridad del sistema Vought
    const user = this.auth.currentUser();
    items.push({
      id: 'system_security',
      title: 'Sistema Vought Protegido',
      message: `Sesión autenticada para ${user?.name || user?.usuario || 'Usuario'} con perfil de ${user?.role || 'Cliente'}.`,
      type: 'success',
      time: 'Activa',
      timestamp: new Date(),
      read: false,
      route: '/configuracion',
      actionText: 'Ver seguridad',
      category: 'Seguridad'
    });

    this.notification.setNotifications(items);
  }

  onPhotoError(): void {
    if (!this.imageFailed()) {
      this.imageFailed.set(true);
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  onThemeButtonClick(): void {
    this.showThemeMenu.update(v => !v);
    if (this.showThemeMenu()) {
      this.showNotificationsMenu.set(false);
      this.showProfileMenu.set(false);
    }
  }

  selectTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
    this.showThemeMenu.set(false);
  }

  onNotificationsClick(): void {
    this.showNotificationsMenu.update(v => !v);
    if (this.showNotificationsMenu()) {
      this.showProfileMenu.set(false);
      this.showThemeMenu.set(false);
    }
  }

  onNotificationItemClick(item: NotificationItem): void {
    this.notification.markAsRead(item.id);
    this.showNotificationsMenu.set(false);
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  markAllAsRead(): void {
    this.notification.markAllAsRead();
  }

  removeNotification(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.notification.removeNotification(id);
  }

  navigateTo(route: string): void {
    this.showNotificationsMenu.set(false);
    this.showThemeMenu.set(false);
    this.router.navigate([route]);
  }

  onProfileClick(): void {
    this.showProfileMenu.update(v => !v);
    if (this.showProfileMenu()) {
      this.showNotificationsMenu.set(false);
      this.showThemeMenu.set(false);
    }
  }

  openPhotoPreview(event: MouseEvent): void {
    event.stopPropagation();
    if (this.userPhoto()) this.showPhotoPreview.set(true);
  }

  closePhotoPreview(): void {
    this.showPhotoPreview.set(false);
  }

  onLogout(event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.showProfileMenu.set(false);
    this.showNotificationsMenu.set(false);
    this.showThemeMenu.set(false);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-container')) {
      this.showProfileMenu.set(false);
    }
    if (!target.closest('.notification-container')) {
      this.showNotificationsMenu.set(false);
    }
    if (!target.closest('.theme-container')) {
      this.showThemeMenu.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePhotoPreview();
    this.showProfileMenu.set(false);
    this.showNotificationsMenu.set(false);
    this.showThemeMenu.set(false);
  }
}

