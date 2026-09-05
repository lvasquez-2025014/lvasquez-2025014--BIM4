import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService, CreateTransactionDto } from '../../services/transaction.service';
import { CategoryService } from '../../services/category.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getLocalTodayString, formatDisplayDate, toLocalDateInputString, parseLocalDate, isFutureDate } from '../../../../core/utils/date.utils';
import type { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-gastos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './gastos-page.component.html',
  styleUrl: './gastos-page.component.css',
})
export class GastosPageComponent implements OnInit {
  private txService = inject(TransactionService);
  private catService = inject(CategoryService);
  private notification = inject(NotificationService);
  readonly currency = inject(CurrencyService);

  allTransactions = signal<Transaction[]>([]);
  expenses = signal<Transaction[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);
  searchQuery = signal('');
  errorMessage = signal<string | null>(null);

  // Form fields
  form = {
    descripcion: '',
    monto: 0,
    tipo: 'Gasto' as 'Ingreso' | 'Gasto',
    categoria: '',
    fecha: getLocalTodayString(),
  };

  categorias = signal<string[]>([]);

  filteredExpenses = computed(() => {
    let list = this.expenses();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(e =>
        e.descripcion.toLowerCase().includes(query) ||
        e.categoria.toLowerCase().includes(query)
      );
    }
    // Sort by date descending
    return [...list].sort((a, b) => parseLocalDate(b.fecha).getTime() - parseLocalDate(a.fecha).getTime());
  });

  totalIngresos = computed(() =>
    this.allTransactions()
      .filter(t => t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + (Number(t.monto) || 0), 0)
  );

  totalGastos = computed(() =>
    this.expenses().reduce((s, e) => s + (Number(e.monto) || 0), 0)
  );

  cantidadGastos = computed(() =>
    this.expenses().length
  );

  promedioGasto = computed(() =>
    this.cantidadGastos() > 0 ? this.totalGastos() / this.cantidadGastos() : 0
  );

  saldoDisponible = computed(() =>
    Math.max(0, this.totalIngresos() - this.totalGastos())
  );

  saldoDisponibleParaGasto = computed(() => {
    const editId = this.editingId();
    if (editId) {
      const current = this.allTransactions().find(t => t.id === editId);
      const currentAmount = current ? (Number(current.monto) || 0) : 0;
      return Math.max(0, (this.totalIngresos() - this.totalGastos()) + currentAmount);
    }
    return Math.max(0, this.totalIngresos() - this.totalGastos());
  });

  today = getLocalTodayString();

  isMontoExcedido(): boolean {
    const monto = Number(this.form.monto) || 0;
    return monto > 0 && monto > this.saldoDisponibleParaGasto();
  }

  isFechaFutura(): boolean {
    return isFutureDate(this.form.fecha);
  }

  ngOnInit(): void {
    this.fetchExpenses();
    this.catService.getCategories().subscribe({
      next: (cats) => {
        const g = cats.filter(c => c.tipo === 'Gasto').map(c => c.nombre);
        this.categorias.set(g.length > 0 ? g : ['Alimentación', 'Transporte', 'Servicios', 'Otros']);
      }
    });
  }

  fetchExpenses(): void {
    this.loading.set(true);
    this.txService.getExpenses().subscribe({
      next: (data) => {
        const allMapped: Transaction[] = data.map((d: any) => ({
          id: d._id || d.id,
          descripcion: d.descripcion,
          monto: Number(d.monto) || 0,
          tipo: d.tipo,
          categoria: d.categoria,
          fecha: d.fecha,
        }));
        this.allTransactions.set(allMapped);
        this.expenses.set(allMapped.filter((e) => e.tipo === 'Gasto'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.errorMessage.set(null);
    this.editingId.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEdit(tx: Transaction): void {
    this.errorMessage.set(null);
    this.editingId.set(tx.id);
    this.form.descripcion = tx.descripcion;
    this.form.monto = tx.monto;
    this.form.tipo = 'Gasto';
    this.form.categoria = tx.categoria;
    this.form.fecha = toLocalDateInputString(tx.fecha);
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

    const dto: CreateTransactionDto = {
      descripcion: this.form.descripcion.trim(),
      monto: monto,
      tipo: 'Gasto',
      categoria: this.form.categoria,
      fecha: this.form.fecha,
    };

    const editId = this.editingId();
    if (editId) {
      this.txService.updateExpense(editId, dto).subscribe({
        next: () => {
          this.closeModal();
          this.fetchExpenses();
          this.notification.show({
            title: 'Gasto actualizado',
            message: 'El gasto ha sido actualizado correctamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'No puedes gastar porque no tienes el dinero suficiente';
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
          this.fetchExpenses();
          this.notification.show({
            title: 'Gasto registrado',
            message: 'El gasto ha sido registrado exitosamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'No puedes gastar porque no tienes el dinero suficiente';
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

  confirmDelete(id: string): void {
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  deleteExpense(id: string): void {
    this.txService.deleteExpense(id).subscribe({
      next: () => {
        this.confirmDeleteId.set(null);
        this.fetchExpenses();
      },
    });
  }

  formatCurrency(amount: number): string {
    return this.currency.format(amount);
  }

  formatDate(dateStr: string | Date): string {
    return formatDisplayDate(dateStr);
  }

  private resetForm(): void {
    this.form.descripcion = '';
    this.form.monto = 0;
    this.form.tipo = 'Gasto';
    this.form.categoria = '';
    this.form.fecha = getLocalTodayString();
  }
}
