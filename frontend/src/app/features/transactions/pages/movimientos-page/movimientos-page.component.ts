import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService, CreateTransactionDto } from '../../services/transaction.service';
import { CategoryService } from '../../services/category.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToCsv } from '../../../../core/utils/export.utils';
import { getLocalTodayString, formatDisplayDate, toLocalDateInputString, parseLocalDate, isFutureDate } from '../../../../core/utils/date.utils';
import type { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-movimientos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './movimientos-page.component.html',
  styleUrl: './movimientos-page.component.css'
})
export class MovimientosPageComponent implements OnInit {
  private txService = inject(TransactionService);
  private catService = inject(CategoryService);
  private notification = inject(NotificationService);
  readonly currency = inject(CurrencyService);

  transactions = signal<Transaction[]>([]);
  loading = signal(false);
  activeFilter = signal<'all' | 'Ingreso' | 'Gasto'>('all');
  searchQuery = signal('');
  showModal = signal(false);
  editingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = {
    descripcion: '',
    monto: 0,
    tipo: 'Gasto' as 'Gasto' | 'Ingreso',
    categoria: '',
    fecha: getLocalTodayString()
  };

  categoriasGasto = signal<string[]>([]);
  categoriasIngreso = signal<string[]>([]);

  ngOnInit(): void {
    this.fetchTransactions();
    this.catService.getCategories().subscribe({
      next: (cats) => {
        this.categoriasGasto.set(cats.filter(c => c.tipo === 'Gasto').map(c => c.nombre));
        this.categoriasIngreso.set(cats.filter(c => c.tipo === 'Ingreso').map(c => c.nombre));
      }
    });
  }

  fetchTransactions(): void {
    this.loading.set(true);
    this.txService.getExpenses().subscribe({
      next: (data) => {
        const mapped = data.map((d: any) => ({
          id: d._id || d.id,
          descripcion: d.descripcion,
          monto: Number(d.monto) || 0,
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

  // Lista filtrada
  filteredTransactions = computed(() => {
    let list = this.transactions();
    const filter = this.activeFilter();
    const query = this.searchQuery().toLowerCase().trim();

    if (filter !== 'all') {
      list = list.filter(t => t.tipo === filter);
    }

    if (query) {
      list = list.filter(t =>
        t.descripcion.toLowerCase().includes(query) ||
        t.categoria.toLowerCase().includes(query)
      );
    }

    return [...list].sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime());
  });

  // KPIs
  totalOperaciones = computed(() => this.transactions().length);

  totalIngresos = computed(() =>
    this.transactions().filter(t => t.tipo === 'Ingreso').reduce((acc, t) => acc + (Number(t.monto) || 0), 0)
  );
  countIngresos = computed(() =>
    this.transactions().filter(t => t.tipo === 'Ingreso').length
  );

  totalEgresos = computed(() =>
    this.transactions().filter(t => t.tipo === 'Gasto').reduce((acc, t) => acc + (Number(t.monto) || 0), 0)
  );
  countEgresos = computed(() =>
    this.transactions().filter(t => t.tipo === 'Gasto').length
  );

  flujoNeto = computed(() =>
    this.totalIngresos() - this.totalEgresos()
  );

  saldoDisponible = computed(() =>
    Math.max(0, this.totalIngresos() - this.totalEgresos())
  );

  saldoDisponibleParaGasto = computed(() => {
    const editId = this.editingId();
    if (editId) {
      const current = this.transactions().find(t => t.id === editId);
      const currentAmount = current && current.tipo === 'Gasto' ? (Number(current.monto) || 0) : 0;
      return Math.max(0, (this.totalIngresos() - this.totalEgresos()) + currentAmount);
    }
    return Math.max(0, this.totalIngresos() - this.totalEgresos());
  });

  today = getLocalTodayString();

  isMontoExcedido(): boolean {
    if (this.form.tipo !== 'Gasto') return false;
    const monto = Number(this.form.monto) || 0;
    return monto > 0 && monto > this.saldoDisponibleParaGasto();
  }

  isFechaFutura(): boolean {
    return isFutureDate(this.form.fecha);
  }

  tasaRetencion = computed(() => {
    const ing = this.totalIngresos();
    if (ing <= 0) return 0;
    return Math.round((this.flujoNeto() / ing) * 100);
  });

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEdit(tx: Transaction): void {
    this.errorMessage.set(null);
    this.editingId.set(tx.id);
    this.form = {
      descripcion: tx.descripcion,
      monto: tx.monto,
      tipo: tx.tipo,
      categoria: tx.categoria,
      fecha: toLocalDateInputString(tx.fecha)
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
    this.errorMessage.set(null);
    this.resetForm();
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    if (!this.form.descripcion.trim() || !this.form.monto || !this.form.categoria) return;

    if (this.isFechaFutura()) {
      const msg = 'No puedes registrar un movimiento para un día que aún no ha llegado';
      this.errorMessage.set(msg);
      this.notification.show({
        title: 'Fecha no válida',
        message: msg,
        type: 'warning',
        isPersistent: false
      });
      return;
    }

    const monto = Number(this.form.monto) || 0;

    if (this.form.tipo === 'Gasto') {
      const disponible = this.saldoDisponibleParaGasto();
      if (monto > disponible) {
        const msg = 'No puedes gastar porque no tienes el dinero suficiente';
        this.errorMessage.set(msg);
        this.notification.show({
          title: 'Fondos insuficientes',
          message: msg,
          type: 'warning',
          isPersistent: false
        });
        return;
      }
    }

    const dto: CreateTransactionDto = {
      descripcion: this.form.descripcion.trim(),
      monto: monto,
      tipo: this.form.tipo,
      categoria: this.form.categoria,
      fecha: this.form.fecha
    };

    const id = this.editingId();
    if (id) {
      this.txService.updateExpense(id, dto).subscribe({
        next: () => {
          this.closeModal();
          this.fetchTransactions();
          this.notification.show({
            title: 'Movimiento actualizado',
            message: 'El movimiento ha sido actualizado correctamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'No se pudo actualizar el movimiento';
          this.errorMessage.set(msg);
          this.notification.show({
            title: 'Atención',
            message: msg,
            type: 'warning'
          });
        }
      });
    } else {
      this.txService.addExpense(dto).subscribe({
        next: () => {
          this.closeModal();
          this.fetchTransactions();
          this.notification.show({
            title: 'Movimiento registrado',
            message: 'El movimiento ha sido registrado exitosamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'No se pudo registrar el movimiento';
          this.errorMessage.set(msg);
          this.notification.show({
            title: 'Atención',
            message: msg,
            type: 'warning'
          });
        }
      });
    }
  }

  deleteTransaction(id: string): void {
    if (confirm('¿Deseas eliminar este movimiento contable?')) {
      this.txService.deleteExpense(id).subscribe({
        next: () => this.fetchTransactions()
      });
    }
  }

  exportCSV(): void {
    const code = this.currency.code();
    const rows = this.filteredTransactions().map(t => [
      toLocalDateInputString(t.fecha),
      t.descripcion,
      t.tipo,
      t.categoria,
      (t.tipo === 'Ingreso' ? '+' : '-') + this.currency.convertFromGTQ(t.monto).toFixed(2)
    ]);

    exportToCsv({
      filename: `Movimientos_Vought_${getLocalTodayString()}`,
      headers: ['Fecha', 'Descripción', 'Tipo', 'Categoría', `Monto (${code})`],
      rows
    });
  }

  formatCurrency(amount: number): string {
    return this.currency.format(amount);
  }

  formatDate(dateStr: string | Date): string {
    return formatDisplayDate(dateStr);
  }

  private resetForm(): void {
    this.form = {
      descripcion: '',
      monto: 0,
      tipo: 'Gasto',
      categoria: 'Operaciones',
      fecha: getLocalTodayString()
    };
  }
}
