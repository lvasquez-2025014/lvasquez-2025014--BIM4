import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from './transaction.service';
import { CurrencyService } from '../../../core/services/currency.service';

import { parseLocalDate, getLocalTodayString, formatDisplayDate, toLocalDateInputString } from '../../../core/utils/date.utils';

export type Period = 'day' | 'week' | 'month' | 'year';

export interface Expense {
  _id?: string;
  id?: string;
  descripcion: string;
  monto: number;
  tipo: 'Ingreso' | 'Gasto';
  categoria: string;
  fecha: string | Date;
}

export interface ChartDataPoint { label: string; value: number; }
export interface CategoryData { labels: string[]; data: number[]; }
export interface CashFlowData { labels: string[]; income: number[]; expense: number[]; net: number[]; }
export interface DashboardStats { income: number; expense: number; savings: number; remaining: number; }
export interface ActivityItem { icon: string; name: string; category: string; date: string; amount: number; type: 'income' | 'expense'; }
export interface CategoryRow { name: string; movements: number; spent: number; }
export interface QuickAction { icon: string; title: string; description: string; route: string; }

/** Categorías disponibles en los formularios de gastos. */
export const EXPENSE_CATEGORIES = [
  'Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud',
  'Educación', 'Entretenimiento', 'Ropa', 'Otros'
] as const;

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private transactions = inject(TransactionService);
  readonly currency = inject(CurrencyService);

  private readonly _currentPeriod = signal<Period>('month');
  private readonly _expenses = signal<Expense[]>([]);

  readonly currentPeriod = this._currentPeriod.asReadonly();
  readonly allExpenses = this._expenses.asReadonly();

  setPeriod(period: Period): void { this._currentPeriod.set(period); }

  async fetchExpenses(): Promise<void> {
    try {
      const data = await firstValueFrom(this.transactions.getExpenses());
      this._expenses.set(data || []);
    } catch (e) {
      console.error('Error fetching expenses:', e);
      this._expenses.set([]);
    }
  }

  parseDateLocal(dateInput: string | Date): Date {
    return parseLocalDate(dateInput);
  }

  getPeriodLabels(period: Period): string[] {
    const now = new Date();
    if (period === 'day') {
      return ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    }
    if (period === 'week') {
      // Últimos 7 días móviles hasta hoy para no perder el día de ayer ni proyectar el futuro
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0);
        const dayName = d.toLocaleDateString('es-GT', { weekday: 'short' });
        const cap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        labels.push(i === 0 ? `Hoy ${d.getDate()}` : `${cap} ${d.getDate()}`);
      }
      return labels;
    }
    if (period === 'month') {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mName = monthNames[now.getMonth()];
      const currentDay = now.getDate();

      // Encontrar el día máximo con movimientos en este mes (si hubiese futuros programados)
      const thisMonthExpenses = this._expenses().filter(e => {
        const d = parseLocalDate(e.fecha);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });

      let maxDay = currentDay;
      thisMonthExpenses.forEach(e => {
        const d = parseLocalDate(e.fecha);
        if (d.getDate() > maxDay) maxDay = d.getDate();
      });

      // Mínimo 2 días para trazar en SVG, hasta el día actual o última transacción registrada
      maxDay = Math.min(Math.max(maxDay, 2), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

      const labels: string[] = [];
      for (let d = 1; d <= maxDay; d++) {
        labels.push(d === currentDay ? `${d} ${mName} (Hoy)` : `${d} ${mName}`);
      }
      return labels;
    }
    // Año: meses transcurridos hasta el mes actual
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = now.getMonth();
    return monthNames.slice(0, Math.max(currentMonth + 1, 6));
  }

  private filterByPeriod(expenses: Expense[], period: Period): Expense[] {
    const now = new Date();
    return expenses.filter(e => {
      const d = parseLocalDate(e.fecha);
      if (Number.isNaN(d.getTime())) return false;

      if (period === 'day') {
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
      }
      if (period === 'week') {
        // Últimos 7 días completos
        const startOfRollingWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return d >= startOfRollingWeek && d <= endOfToday;
      }
      if (period === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (period === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  readonly filteredExpenses = computed(() => this.filterByPeriod(this._expenses(), this._currentPeriod()));

  readonly stats = computed((): DashboardStats => {
    const exps = this.filteredExpenses();
    const income = exps.filter(e => e.tipo === 'Ingreso').reduce((a, b) => a + b.monto, 0);
    const expense = exps.filter(e => e.tipo === 'Gasto').reduce((a, b) => a + b.monto, 0);

    const all = this._expenses();
    const totalIn = all.filter(e => e.tipo === 'Ingreso').reduce((a, b) => a + b.monto, 0);
    const totalOut = all.filter(e => e.tipo === 'Gasto').reduce((a, b) => a + b.monto, 0);

    return {
      income,
      expense,
      savings: income - expense,
      remaining: totalIn - totalOut
    };
  });

  readonly categoriesData = computed((): CategoryData => {
    const exps = this.filteredExpenses().filter(e => e.tipo === 'Gasto');
    const map = new Map<string, number>();
    exps.forEach(e => map.set(e.categoria, (map.get(e.categoria) || 0) + e.monto));

    // Mantener visibles todas las categorías, incluso cuando aún no tengan
    // movimientos en el período seleccionado. También se conservan categorías
    // personalizadas que ya existan en registros previos.
    const labels = [...EXPENSE_CATEGORIES, ...Array.from(map.keys()).filter(name => !EXPENSE_CATEGORIES.includes(name as typeof EXPENSE_CATEGORIES[number]))];
    return {
      labels,
      data: labels.map(label => map.get(label) || 0)
    };
  });

  readonly chartLabels = computed(() => this.getPeriodLabels(this._currentPeriod()));

  // Datos reales: agrupar gastos/ingresos por período para línea de ahorro acumulado
  readonly savingsData = computed(() => {
    const flow = this.generateCashFlowData(this._currentPeriod());
    let acc = 0;
    return flow.net.map(b => {
      acc += b;
      return acc;
    });
  });

  // Saldo disponible: parte del saldo real previo al período y acumula cada movimiento
  readonly remainingData = computed(() => {
    const p = this._currentPeriod();
    const flow = this.generateCashFlowData(p);
    const periodStart = this.getPeriodStart(p);

    const initialBalance = this._expenses()
      .filter(e => {
        const d = parseLocalDate(e.fecha);
        return !Number.isNaN(d.getTime()) && d < periodStart;
      })
      .reduce((balance, e) => balance + (e.tipo === 'Ingreso' ? Number(e.monto) || 0 : -(Number(e.monto) || 0)), 0);

    let acc = initialBalance;
    return flow.net.map(b => {
      acc += b;
      return acc;
    });
  });

  private getPeriodStart(period: Period): Date {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    if (period === 'day') {
      return start;
    }
    if (period === 'week') {
      start.setDate(start.getDate() - 6);
      return start;
    }
    if (period === 'month') {
      start.setDate(1);
      return start;
    }
    if (period === 'year') {
      start.setMonth(0, 1);
      return start;
    }
    return start;
  }

  readonly activities = computed((): ActivityItem[] => {
    return this._expenses()
      .sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime())
      .slice(0, 5)
      .map(e => ({
        icon: e.categoria.charAt(0).toUpperCase() || 'E',
        name: e.descripcion,
        category: e.categoria,
        date: formatDisplayDate(e.fecha),
        amount: e.monto,
        type: e.tipo === 'Ingreso' ? 'income' : 'expense'
      }));
  });

  readonly categories = computed((): CategoryRow[] => {
    const exps = this.filteredExpenses().filter(e => e.tipo === 'Gasto');
    const map = new Map<string, { count: number, total: number }>();
    exps.forEach(e => {
      const c = map.get(e.categoria) || { count: 0, total: 0 };
      c.count++;
      c.total += e.monto;
      map.set(e.categoria, c);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        movements: data.count,
        spent: data.total
      }));
  });

  readonly quickActions = signal<QuickAction[]>([
    { icon: '＋', title: 'Registrar gasto', description: 'Agrega un nuevo egreso', route: '/gastos/nuevo' },
    { icon: '◉', title: 'Revisar presupuesto', description: 'Controla límites por categoría', route: '/presupuestos' },
    { icon: '▥', title: 'Generar reporte', description: 'Analiza el periodo actual', route: '/reportes' }
  ]);

  formatCurrency(value: number): string {
    return this.currency.format(value);
  }

  formatCurrencyShort(value: number): string {
    return this.currency.formatShort(value);
  }

  getTrendClass(current: number, previous: number): 'positive' | 'negative' | 'accent' {
    if (current > previous) return 'positive';
    if (current < previous) return 'negative';
    return 'accent';
  }

  /**
   * Agrupa movimientos reales para el gráfico de flujo de efectivo.
   * Las escalas se adaptan fielmente a la vista cartesiana de cada período:
   * - Hoy: intervalos de 4 horas en el día
   * - Semana: 7 días móviles hasta hoy (Ayer y Hoy siempre contiguos y visibles)
   * - Mes: Días del mes en curso hasta el día actual
   * - Año: Meses del año en curso hasta el mes actual
   */
  generateCashFlowData(period: Period): CashFlowData {
    const now = new Date();
    const labels = this.getPeriodLabels(period);
    const income = labels.map(() => 0);
    const expense = labels.map(() => 0);

    const filtered = this.filterByPeriod(this._expenses(), period);

    filtered.forEach(movement => {
      const date = parseLocalDate(movement.fecha);
      if (Number.isNaN(date.getTime())) return;
      let idx = -1;

      if (period === 'day') {
        const hour = date.getHours();
        idx = Math.min(Math.floor(hour / 4), labels.length - 1);
      } else if (period === 'week') {
        const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        const dateMid = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
        const diffDays = Math.round((todayMid.getTime() - dateMid.getTime()) / (1000 * 60 * 60 * 24));
        idx = 6 - diffDays;
      } else if (period === 'month') {
        idx = date.getDate() - 1; // Día 1 = 0, ..., días del mes
      } else if (period === 'year') {
        idx = date.getMonth(); // 0 = Ene, ..., 11 = Dic
      }

      if (idx >= 0 && idx < labels.length) {
        const amt = Number(movement.monto) || 0;
        if (movement.tipo === 'Ingreso') {
          income[idx] += amt;
        } else {
          expense[idx] += amt;
        }
      }
    });

    return {
      labels,
      income,
      expense,
      net: income.map((val, i) => val - expense[i])
    };
  }
}
