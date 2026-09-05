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
  selector: 'app-ingresos-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './ingresos-page.component.html',
  styleUrl: './ingresos-page.component.css',
})
export class IngresosPageComponent implements OnInit {
  private txService = inject(TransactionService);
  private catService = inject(CategoryService);
  private notification = inject(NotificationService);
  readonly currency = inject(CurrencyService);

  expenses = signal<Transaction[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);
  searchQuery = signal('');
  errorMessage = signal<string | null>(null);

  today = getLocalTodayString();

  isFechaFutura(): boolean {
    return isFutureDate(this.form.fecha);
  }

  // Form fields
  form = {
    descripcion: '',
    monto: 0,
    tipo: 'Ingreso' as 'Ingreso' | 'Gasto',
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
    this.expenses().reduce((s, e) => s + e.monto, 0)
  );
  cantidadIngresos = computed(() =>
    this.expenses().length
  );
  promedioIngreso = computed(() =>
    this.cantidadIngresos() > 0 ? this.totalIngresos() / this.cantidadIngresos() : 0
  );

  ngOnInit(): void {
    this.fetchExpenses();
    this.catService.getCategories().subscribe({
      next: (cats) => {
        const ing = cats.filter(c => c.tipo === 'Ingreso').map(c => c.nombre);
        this.categorias.set(ing.length > 0 ? ing : ['Salario', 'Freelance', 'Ahorro', 'Otros']);
      }
    });
  }

  fetchExpenses(): void {
    this.loading.set(true);
    this.txService.getExpenses().subscribe({
      next: (data) => {
        // Backend returns _id, map to id and filter only Ingresos
        const mapped = data
          .map((d: any) => ({
            id: d._id || d.id,
            descripcion: d.descripcion,
            monto: d.monto,
            tipo: d.tipo,
            categoria: d.categoria,
            fecha: d.fecha,
          }))
          .filter((e: any) => e.tipo === 'Ingreso');
        this.expenses.set(mapped);
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
    this.form.tipo = 'Ingreso';
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

    const dto: CreateTransactionDto = {
      descripcion: this.form.descripcion.trim(),
      monto: this.form.monto,
      tipo: 'Ingreso',
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
            title: 'Ingreso actualizado',
            message: 'El ingreso ha sido actualizado exitosamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al actualizar el ingreso';
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
            title: 'Ingreso registrado',
            message: 'El ingreso ha sido registrado exitosamente.',
            type: 'success'
          });
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al registrar el ingreso';
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
    this.form.tipo = 'Ingreso';
    this.form.categoria = '';
    this.form.fecha = getLocalTodayString();
  }
}
