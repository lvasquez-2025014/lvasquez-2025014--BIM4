import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService, CreateTransactionDto } from '../../services/transaction.service';
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

  expenses = signal<Transaction[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);
  searchQuery = signal('');

  // Form fields
  form = {
    descripcion: '',
    monto: 0,
    tipo: 'Gasto' as 'Ingreso' | 'Gasto',
    categoria: '',
    fecha: new Date().toISOString().split('T')[0],
  };

  categorias = [
    'Alimentación',
    'Transporte',
    'Vivienda',
    'Servicios',
    'Salud',
    'Educación',
    'Entretenimiento',
    'Ropa',
    'Otros',
  ];

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
    return [...list].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  });

  totalGastos = computed(() =>
    this.expenses().reduce((s, e) => s + e.monto, 0)
  );
  cantidadGastos = computed(() =>
    this.expenses().length
  );
  promedioGasto = computed(() =>
    this.cantidadGastos() > 0 ? this.totalGastos() / this.cantidadGastos() : 0
  );

  ngOnInit(): void {
    this.fetchExpenses();
  }

  fetchExpenses(): void {
    this.loading.set(true);
    this.txService.getExpenses().subscribe({
      next: (data) => {
        // Backend returns _id, map to id and filter only Gastos
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
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEdit(tx: Transaction): void {
    this.editingId.set(tx.id);
    this.form.descripcion = tx.descripcion;
    this.form.monto = tx.monto;
    this.form.tipo = 'Gasto';
    this.form.categoria = tx.categoria;
    this.form.fecha = new Date(tx.fecha).toISOString().split('T')[0];
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
    this.resetForm();
  }

  onSubmit(): void {
    if (!this.form.descripcion.trim() || !this.form.monto || !this.form.categoria) return;

    const dto: CreateTransactionDto = {
      descripcion: this.form.descripcion.trim(),
      monto: this.form.monto,
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
        },
      });
    } else {
      this.txService.addExpense(dto).subscribe({
        next: () => {
          this.closeModal();
          this.fetchExpenses();
        },
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
    return 'Q ' + amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private resetForm(): void {
    this.form.descripcion = '';
    this.form.monto = 0;
    this.form.tipo = 'Gasto';
    this.form.categoria = '';
    this.form.fecha = new Date().toISOString().split('T')[0];
  }
}
