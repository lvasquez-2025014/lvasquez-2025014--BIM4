import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from './transaction.service';

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

  private parseDateLocal(dateInput: string | Date): Date {
    if (dateInput instanceof Date) return dateInput;
    if (!dateInput) return new Date();
    const datePart = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateInput);
  }

  private filterByPeriod(expenses: Expense[], period: Period): Expense[] {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    return expenses.filter(e => {
      const d = this.parseDateLocal(e.fecha);
      if (period === 'day') return d.toDateString() === now.toDateString() && d <= endOfToday;
      if (period === 'week') {
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay() + 1);
        start.setHours(0, 0, 0, 0);
        return d >= start && d <= endOfToday;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d <= endOfToday;
      if (period === 'year') return d.getFullYear() === now.getFullYear() && d <= endOfToday;
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

  readonly chartLabels = computed(() => {
    const p = this._currentPeriod();
    if (p === 'day') {
      return ['0–3 h', '4–7 h', '8–11 h', '12–15 h', '16–19 h', '20–23 h'];
    }
    if (p === 'week') return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    if (p === 'month') return ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
    return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  });

  // Datos reales: agrupar gastos/ingresos por período para línea de ahorro
  readonly savingsData = computed(() => {
    const labels = this.chartLabels();
    const exps = this.filteredExpenses();
    if (!exps.length) return labels.map(() => 0);

    const buckets = labels.map(() => 0);
    const p = this._currentPeriod();

    exps.forEach(e => {
      const sign = e.tipo === 'Ingreso' ? 1 : -1;
      const d = this.parseDateLocal(e.fecha);
      let idx = 0;

      if (p === 'day') {
        // Agrupar solamente en intervalos horarios que ya han comenzado.
        const hour = d.getHours();
        idx = Math.min(Math.floor(hour / 4), labels.length - 1);
      } else if (p === 'week') {
        // Agrupar por día de la semana (Lun-Dom)
        idx = (d.getDay() + 6) % 7; // Lunes=0, Domingo=6
      } else if (p === 'month') {
        // Agrupar por semana del mes
        const dayOfMonth = d.getDate();
        idx = Math.min(Math.floor((dayOfMonth - 1) / 7), 4);
      } else if (p === 'year') {
        // Agrupar por mes
        idx = d.getMonth();
      }

      if (idx >= 0 && idx < buckets.length) {
        buckets[idx] += e.monto * sign;
      }
    });

    // Acumulado
    let acc = 0;
    return buckets.map(b => { acc += b; return acc; });
  });

  // Saldo disponible: parte del saldo real al inicio del período y después
  // incorpora cada movimiento. No debe duplicar la gráfica de ahorro.
  readonly remainingData = computed(() => {
    const labels = this.chartLabels();
    const exps = this.filteredExpenses();
    const buckets = labels.map(() => 0);
    const p = this._currentPeriod();

    exps.forEach(e => {
      const sign = e.tipo === 'Ingreso' ? 1 : -1;
      const d = this.parseDateLocal(e.fecha);
      let idx = 0;

      if (p === 'day') {
        // Agrupar solamente en intervalos horarios que ya han comenzado.
        const hour = d.getHours();
        idx = Math.min(Math.floor(hour / 4), labels.length - 1);
      } else if (p === 'week') {
        // Agrupar por día de la semana (Lun-Dom)
        idx = (d.getDay() + 6) % 7; // Lunes=0, Domingo=6
      } else if (p === 'month') {
        // Agrupar por semana del mes
        const dayOfMonth = d.getDate();
        idx = Math.min(Math.floor((dayOfMonth - 1) / 7), 4);
      } else if (p === 'year') {
        // Agrupar por mes
        idx = d.getMonth();
      }

      if (idx >= 0 && idx < buckets.length) {
        buckets[idx] += e.monto * sign;
      }
    });

    const periodStart = this.getPeriodStart(p);
    let acc = this._expenses()
      .filter(e => this.parseDateLocal(e.fecha) < periodStart)
      .reduce((balance, e) => balance + (e.tipo === 'Ingreso' ? e.monto : -e.monto), 0);
    return buckets.map(b => { acc += b; return acc; });
  });

  private getPeriodStart(period: Period): Date {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === 'week') start.setDate(start.getDate() - start.getDay() + 1);
    if (period === 'month') start.setDate(1);
    if (period === 'year') start.setMonth(0, 1);
    return start;
  }

  readonly activities = computed((): ActivityItem[] => {
    return this._expenses()
      .sort((a, b) => this.parseDateLocal(b.fecha).getTime() - this.parseDateLocal(a.fecha).getTime())
      .slice(0, 5)
      .map(e => ({
        icon: e.categoria.charAt(0).toUpperCase() || 'E',
        name: e.descripcion,
        category: e.categoria,
        date: this.parseDateLocal(e.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
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
    return 'Q ' + value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatCurrencyShort(value: number): string {
    return 'Q ' + value.toLocaleString('es-GT');
  }

  getTrendClass(current: number, previous: number): 'positive' | 'negative' | 'accent' {
    if (current > previous) return 'positive';
    if (current < previous) return 'negative';
    return 'accent';
  }

  /**
   * Agrupa movimientos reales para el gráfico principal. Los rangos son móviles
   * para que "Mes" y "Año" siempre tengan una escala completa, incluso al
   * principio de un mes o de un año.
   */
  generateCashFlowData(period: Period): CashFlowData {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: Date[] = [];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (period === 'year') {
      for (let i = 11; i >= 0; i--) dates.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    } else {
      const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(date);
      }
    }

    const keyForDay = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const keyForMonth = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
    const buckets = new Map<string, { income: number; expense: number }>();
    const byDay = period !== 'year';

    this._expenses().forEach(movement => {
      const date = this.parseDateLocal(movement.fecha);
      if (Number.isNaN(date.getTime())) return;
      const key = byDay ? keyForDay(date) : keyForMonth(date);
      const bucket = buckets.get(key) || { income: 0, expense: 0 };
      if (movement.tipo === 'Ingreso') bucket.income += Number(movement.monto) || 0;
      else bucket.expense += Number(movement.monto) || 0;
      buckets.set(key, bucket);
    });

    const income: number[] = [];
    const expense: number[] = [];
    const labels: string[] = [];
    dates.forEach(date => {
      const bucketKey = byDay ? keyForDay(date) : keyForMonth(date);
      const bucket = buckets.get(bucketKey) || { income: 0, expense: 0 };
      income.push(bucket.income);
      expense.push(bucket.expense);
      labels.push(byDay ? (period === 'day' ? 'Hoy' : `${date.getDate()} ${monthNames[date.getMonth()]}`) : monthNames[date.getMonth()]);
    });

    return { labels, income, expense, net: income.map((value, index) => value - expense[index]) };
  }
}
