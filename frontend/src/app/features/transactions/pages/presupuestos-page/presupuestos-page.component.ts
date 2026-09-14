import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService } from '../../services/transaction.service';
import { BudgetService, Budget } from '../../services/budget.service';
import { CategoryService } from '../../services/category.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { exportToCsv } from '../../../../core/utils/export.utils';
import { getLocalTodayString } from '../../../../core/utils/date.utils';
import type { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-presupuestos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './presupuestos-page.component.html',
  styleUrl: './presupuestos-page.component.css'
})
export class PresupuestosPageComponent implements OnInit {
  private txService = inject(TransactionService);
  private budgetService = inject(BudgetService);
  private catService = inject(CategoryService);
  readonly currency = inject(CurrencyService);

  budgets = signal<Budget[]>([]);
  expenses = signal<Transaction[]>([]);
  categoriasDisponibles = signal<string[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  searchQuery = signal('');

  // Form modal
  form = {
    categoria: '',
    presupuestado: 10000,
    descripcion: ''
  };

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData(): void {
    this.loading.set(true);

    // Cargar categorías disponibles desde la base de datos
    this.catService.getCategories().subscribe({
      next: (cats) => {
        const catNames = cats.map(c => c.nombre);
        this.categoriasDisponibles.set(catNames);
        if (catNames.length > 0 && !this.form.categoria) {
          this.form.categoria = catNames[0];
        }
      }
    });

    // Cargar presupuestos desde la base de datos
    this.budgetService.getBudgets().subscribe({
      next: (budgetsData) => {
        this.budgets.set(budgetsData);
        this.fetchExpenses();
      },
      error: () => this.loading.set(false)
    });
  }

  fetchExpenses(): void {
    this.txService.getExpenses().subscribe({
      next: (data) => {
        const mapped = data
          .map((d: any) => ({
            id: d._id || d.id,
            descripcion: d.descripcion,
            monto: d.monto,
            tipo: d.tipo,
            categoria: d.categoria,
            fecha: d.fecha,
          }))
          .filter((e: any) => e.tipo === 'Gasto');
        this.expenses.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Gasto consumido por categoría calculado directamente de las transacciones en BD
  spendingByCategory = computed(() => {
    const map: Record<string, number> = {};
    for (const exp of this.expenses()) {
      const cat = exp.categoria || 'Otros';
      map[cat] = (map[cat] || 0) + exp.monto;
    }
    return map;
  });

  // Items combinados con porcentaje y estado dinámico
  budgetItems = computed(() => {
    const spentMap = this.spendingByCategory();
    const query = this.searchQuery().toLowerCase().trim();

    return this.budgets()
      .filter(b => !query || b.categoria.toLowerCase().includes(query) || (b.descripcion && b.descripcion.toLowerCase().includes(query)))
      .map(b => {
        const gastado = spentMap[b.categoria] || 0;
        const porcentaje = b.presupuestado > 0 ? Math.min(100, Math.round((gastado / b.presupuestado) * 100)) : 0;
        const disponible = Math.max(0, b.presupuestado - gastado);
        let status: 'safe' | 'warn' | 'danger' = 'safe';
        if (porcentaje >= 90) status = 'danger';
        else if (porcentaje >= 70) status = 'warn';

        return {
          ...b,
          gastado,
          porcentaje,
          disponible,
          status
        };
      });
  });

  // KPIs globales derivados 100% de la BD
  totalPresupuestado = computed(() =>
    this.budgets().reduce((acc, b) => acc + b.presupuestado, 0)
  );

  totalEjecutado = computed(() => {
    const spentMap = this.spendingByCategory();
    let total = 0;
    for (const b of this.budgets()) {
      total += (spentMap[b.categoria] || 0);
    }
    return total;
  });

  tasaConsumo = computed(() => {
    const pres = this.totalPresupuestado();
    return pres > 0 ? Math.round((this.totalEjecutado() / pres) * 100) : 0;
  });

  margenDisponible = computed(() =>
    Math.max(0, this.totalPresupuestado() - this.totalEjecutado())
  );

  categoriasEnAlerta = computed(() =>
    this.budgetItems().filter(b => b.status === 'danger' || b.status === 'warn').length
  );

  openCreate(): void {
    this.editingId.set(null);
    const cats = this.categoriasDisponibles();
    this.form = {
      categoria: cats.length > 0 ? cats[0] : '',
      presupuestado: 5000,
      descripcion: ''
    };
    this.showModal.set(true);
  }

  openEdit(b: Budget): void {
    this.editingId.set(b.id);
    this.form = {
      categoria: b.categoria,
      presupuestado: b.presupuestado,
      descripcion: b.descripcion || ''
    };
    this.showModal.set(true);
  }

  deleteBudget(id: string, categoria: string): void {
    if (confirm(`¿Estás seguro de eliminar el presupuesto asignado a "${categoria}"?`)) {
      this.budgetService.deleteBudget(id).subscribe({
        next: () => this.fetchData()
      });
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  saveBudget(): void {
    if (!this.form.categoria || this.form.presupuestado <= 0) return;

    const editId = this.editingId();
    if (editId) {
      this.budgetService.updateBudget(editId, {
        presupuestado: this.form.presupuestado,
        descripcion: this.form.descripcion
      }).subscribe({
        next: () => {
          this.closeModal();
          this.fetchData();
        }
      });
      return;
    }

    const current = this.budgets();
    const existing = current.find(b => b.categoria.toLowerCase() === this.form.categoria.toLowerCase());

    if (existing) {
      this.budgetService.updateBudget(existing.id, {
        presupuestado: this.form.presupuestado,
        descripcion: this.form.descripcion || existing.descripcion
      }).subscribe({
        next: () => {
          this.closeModal();
          this.fetchData();
        }
      });
    } else {
      this.budgetService.addBudget({
        categoria: this.form.categoria,
        presupuestado: this.form.presupuestado,
        icono: 'category',
        descripcion: this.form.descripcion || `Presupuesto asignado a ${this.form.categoria}`
      }).subscribe({
        next: () => {
          this.closeModal();
          this.fetchData();
        }
      });
    }
  }

  exportReport(): void {
    const code = this.currency.code();
    const rows = this.budgetItems().map(b => [
      b.categoria,
      this.currency.convertFromGTQ(b.presupuestado).toFixed(2),
      this.currency.convertFromGTQ(b.gastado).toFixed(2),
      this.currency.convertFromGTQ(b.disponible).toFixed(2),
      b.porcentaje + '%'
    ]);

    exportToCsv({
      filename: `Presupuestos_Vought_${getLocalTodayString()}`,
      headers: ['Categoría', `Presupuestado (${code})`, `Gastado (${code})`, `Disponible (${code})`, 'Consumo %'],
      rows
    });
  }

  formatCurrency(amount: number): string {
    return this.currency.format(amount);
  }

  formatConvertedNumber(amountGTQ: number): string {
    const converted = this.currency.convertFromGTQ(amountGTQ);
    return converted.toLocaleString('es-GT', {
      minimumFractionDigits: this.currency.decimals(),
      maximumFractionDigits: this.currency.decimals()
    });
  }
}
