import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService } from '../../services/transaction.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { exportToCsv } from '../../../../core/utils/export.utils';
import { getLocalTodayString, parseLocalDate } from '../../../../core/utils/date.utils';
import type { Transaction } from '../../models/transaction.model';

export type PeriodType = '1m' | '3m' | '6m' | 'ytd' | 'annual';

export interface MonthlyMetric {
  mes: string;
  ingresos: number;
  gastos: number;
}

@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './reportes-page.component.html',
  styleUrl: './reportes-page.component.css'
})
export class ReportesPageComponent implements OnInit {
  private txService = inject(TransactionService);
  readonly currency = inject(CurrencyService);

  transactions = signal<Transaction[]>([]);
  loading = signal(false);
  selectedPeriod = signal<PeriodType>('3m');

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading.set(true);
    this.txService.getExpenses().subscribe({
      next: (data) => {
        const mapped = data.map((d: any) => ({
          id: d._id || d.id,
          descripcion: d.descripcion,
          monto: d.monto,
          tipo: d.tipo,
          categoria: d.categoria,
          fecha: d.fecha
        }));
        this.transactions.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Transacciones filtradas según período seleccionado
  filteredTransactions = computed(() => {
    const all = this.transactions();
    const period = this.selectedPeriod();
    const now = new Date();

    if (period === 'annual') return all;

    return all.filter(t => {
      const d = parseLocalDate(t.fecha);
      if (isNaN(d.getTime())) return true;

      if (period === '1m') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === '3m') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return d >= threeMonthsAgo;
      }
      if (period === '6m') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return d >= sixMonthsAgo;
      }
      if (period === 'ytd') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  });

  totalIngresos = computed(() =>
    this.filteredTransactions().filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + t.monto, 0)
  );

  totalGastos = computed(() =>
    this.filteredTransactions().filter(t => t.tipo === 'Gasto').reduce((s, t) => s + t.monto, 0)
  );

  flujoNeto = computed(() =>
    this.totalIngresos() - this.totalGastos()
  );

  ratioEficiencia = computed(() => {
    const ing = this.totalIngresos();
    if (ing <= 0) return 0;
    const ratio = ((ing - this.totalGastos()) / ing) * 100;
    return Math.round(ratio * 10) / 10;
  });

  ahorroFiscal = computed(() => {
    return Math.round(this.totalGastos() * 0.12);
  });

  // Agrupación mensual 100% calculada desde las transacciones en base de datos
  monthlyData = computed((): MonthlyMetric[] => {
    const txs = this.filteredTransactions();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const map = new Map<string, { mes: string; sortKey: number; ingresos: number; gastos: number }>();

    for (const tx of txs) {
      const d = parseLocalDate(tx.fecha);
      if (isNaN(d.getTime())) continue;
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const key = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
      const label = `${monthNames[mIdx]}`;

      if (!map.has(key)) {
        map.set(key, { mes: label, sortKey: new Date(yr, mIdx, 1).getTime(), ingresos: 0, gastos: 0 });
      }
      const entry = map.get(key)!;
      if (tx.tipo === 'Ingreso') {
        entry.ingresos += tx.monto;
      } else {
        entry.gastos += tx.monto;
      }
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
    if (sorted.length > 0) {
      return sorted.map(({ mes, ingresos, gastos }) => ({ mes, ingresos, gastos }));
    }

    const curMonth = monthNames[new Date().getMonth()];
    return [{ mes: curMonth, ingresos: 0, gastos: 0 }];
  });

  maxMonthlyAmount = computed(() => {
    let max = 500;
    for (const m of this.monthlyData()) {
      if (m.ingresos > max) max = m.ingresos;
      if (m.gastos > max) max = m.gastos;
    }
    return max * 1.15;
  });

  // Desglose por categoría directamente calculado de las transacciones en BD
  categoryBreakdown = computed(() => {
    const expenses = this.filteredTransactions().filter(t => t.tipo === 'Gasto');
    const total = this.totalGastos();
    const map: Record<string, number> = {};

    for (const e of expenses) {
      const c = e.categoria || 'Otros';
      map[c] = (map[c] || 0) + e.monto;
    }

    if (total <= 0 || Object.keys(map).length === 0) {
      return [];
    }

    return Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  });

  setPeriod(period: PeriodType): void {
    this.selectedPeriod.set(period);
  }

  downloadPDF(): void {
    window.print();
  }

  exportCSV(): void {
    const code = this.currency.code();
    const rows = this.monthlyData().map(m => {
      const net = m.ingresos - m.gastos;
      const ratio = m.ingresos > 0 ? Math.round(((m.ingresos - m.gastos) / m.ingresos) * 100) : 0;
      return [
        m.mes,
        this.currency.convertFromGTQ(m.ingresos).toFixed(2),
        this.currency.convertFromGTQ(m.gastos).toFixed(2),
        (net >= 0 ? '+' : '') + this.currency.convertFromGTQ(net).toFixed(2),
        ratio + '%'
      ];
    });

    exportToCsv({
      filename: `Reporte_Financiero_Vought_${this.selectedPeriod()}_${getLocalTodayString()}`,
      headers: ['Mes', `Ingresos (${code})`, `Gastos (${code})`, `Flujo Neto (${code})`, 'Ratio Eficiencia'],
      rows
    });
  }

  formatCurrency(amount: number): string {
    return this.currency.format(amount);
  }
}
