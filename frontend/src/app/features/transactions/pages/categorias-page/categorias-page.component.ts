import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { TransactionService } from '../../services/transaction.service';
import { CategoryService, Category, CreateCategoryDto } from '../../services/category.service';
import { CurrencyService } from '../../../../core/services/currency.service';
import { exportToCsv } from '../../../../core/utils/export.utils';
import { getLocalTodayString } from '../../../../core/utils/date.utils';
import type { Transaction } from '../../models/transaction.model';

const DEFAULT_CORPORATE_CATEGORIES: CreateCategoryDto[] = [
  { nombre: 'Alimentación', tipo: 'Gasto', icono: 'restaurant', color: '#f59e0b', descripcion: 'Comidas corporativas, cafetería y catering' },
  { nombre: 'Transporte', tipo: 'Gasto', icono: 'local_shipping', color: '#3b82f6', descripcion: 'Combustible, peajes, parqueo y viáticos' },
  { nombre: 'Vivienda', tipo: 'Gasto', icono: 'shield', color: '#8b5cf6', descripcion: 'Arrendamiento de inmuebles e instalaciones' },
  { nombre: 'Servicios', tipo: 'Gasto', icono: 'payments', color: '#06b6d4', descripcion: 'Electricidad, agua, conectividad y cloud' },
  { nombre: 'Salud', tipo: 'Gasto', icono: 'biotech', color: '#ef4444', descripcion: 'Seguros médicos corporativos y botiquín' },
  { nombre: 'Educación', tipo: 'Gasto', icono: 'laptop_chromebook', color: '#8b5cf6', descripcion: 'Capacitación ejecutiva y licencias técnicas' },
  { nombre: 'Entretenimiento', tipo: 'Gasto', icono: 'campaign', color: '#ec4899', descripcion: 'Eventos corporativos y relaciones públicas' },
  { nombre: 'Salario', tipo: 'Ingreso', icono: 'payments', color: '#3b82f6', descripcion: 'Remuneraciones y nómina principal' },
  { nombre: 'Freelance', tipo: 'Ingreso', icono: 'work', color: '#06b6d4', descripcion: 'Servicios de consultoría externa y contratos' },
  { nombre: 'Ahorro', tipo: 'Ingreso', icono: 'savings', color: '#3b82f6', descripcion: 'Rendimientos de tesorería e inversiones' },
  { nombre: 'Otros', tipo: 'Gasto', icono: 'category', color: '#64748b', descripcion: 'Partidas y gastos operativos diversos' }
];

@Component({
  selector: 'app-categorias-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './categorias-page.component.html',
  styleUrl: './categorias-page.component.css'
})
export class CategoriasPageComponent implements OnInit {
  private txService = inject(TransactionService);
  private catService = inject(CategoryService);
  readonly currency = inject(CurrencyService);

  categories = signal<Category[]>([]);
  transactions = signal<Transaction[]>([]);
  loading = signal(false);
  activeTab = signal<'all' | 'Gasto' | 'Ingreso'>('all');
  searchQuery = signal('');
  showModal = signal(false);
  editingCategory = signal<Category | null>(null);

  form = {
    nombre: '',
    tipo: 'Gasto' as 'Gasto' | 'Ingreso',
    icono: 'category',
    color: '#3b82f6',
    descripcion: ''
  };

  iconList = ['campaign', 'cloud', 'shield', 'biotech', 'local_shipping', 'restaurant', 'payments', 'savings', 'laptop_chromebook', 'category', 'work', 'flight'];

  ngOnInit(): void {
    this.fetchData();
  }

  async fetchData(): Promise<void> {
    this.loading.set(true);
    try {
      let cats = await firstValueFrom(this.catService.getCategories());
      if (!cats || cats.length === 0) {
        cats = await Promise.all(
          DEFAULT_CORPORATE_CATEGORIES.map(c => firstValueFrom(this.catService.addCategory(c)))
        );
      }
      this.categories.set(cats || []);
      this.fetchTransactions();
    } catch {
      this.loading.set(false);
    }
  }

  fetchTransactions(): void {
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

  // Métricas agregadas por categoría desde transacciones de la BD
  categoryStats = computed(() => {
    const txs = this.transactions();
    const stats: Record<string, { total: number; count: number }> = {};

    for (const tx of txs) {
      const cat = tx.categoria || 'Otros';
      if (!stats[cat]) stats[cat] = { total: 0, count: 0 };
      stats[cat].total += tx.monto;
      stats[cat].count += 1;
    }
    return stats;
  });

  // Lista filtrada con estadísticas
  filteredCategories = computed(() => {
    const tab = this.activeTab();
    const query = this.searchQuery().toLowerCase().trim();
    const stats = this.categoryStats();

    return this.categories()
      .filter(c => tab === 'all' || c.tipo === tab)
      .filter(c => !query || c.nombre.toLowerCase().includes(query) || (c.descripcion && c.descripcion.toLowerCase().includes(query)))
      .map(c => {
        const s = stats[c.nombre] || { total: 0, count: 0 };
        return {
          ...c,
          total: s.total,
          count: s.count
        };
      });
  });

  countGastos = computed(() => this.categories().filter(c => c.tipo === 'Gasto').length);
  countIngresos = computed(() => this.categories().filter(c => c.tipo === 'Ingreso').length);

  totalGastos = computed(() =>
    this.transactions().filter(t => t.tipo === 'Gasto').reduce((s, t) => s + t.monto, 0)
  );

  mayorErogacion = computed(() => {
    const stats = this.categoryStats();
    let maxName = 'Sin registros';
    let maxAmount = 0;

    for (const cat of this.categories().filter(c => c.tipo === 'Gasto')) {
      const s = stats[cat.nombre]?.total || 0;
      if (s > maxAmount) {
        maxAmount = s;
        maxName = cat.nombre;
      }
    }
    const pct = this.totalGastos() > 0 ? Math.round((maxAmount / this.totalGastos()) * 100) : 0;
    return { name: maxName, amount: maxAmount, percentage: pct };
  });

  openCreate(): void {
    this.editingCategory.set(null);
    this.form = {
      nombre: '',
      tipo: 'Gasto',
      icono: 'category',
      color: '#3b82f6',
      descripcion: ''
    };
    this.showModal.set(true);
  }

  openEdit(cat: Category): void {
    this.editingCategory.set(cat);
    this.form = {
      nombre: cat.nombre,
      tipo: cat.tipo,
      icono: cat.icono,
      color: cat.color,
      descripcion: cat.descripcion || ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCategory.set(null);
  }

  saveCategory(): void {
    if (!this.form.nombre.trim()) return;

    const edit = this.editingCategory();
    if (edit) {
      this.catService.updateCategory(edit.id, {
        nombre: this.form.nombre.trim(),
        tipo: this.form.tipo,
        icono: this.form.icono,
        color: this.form.color,
        descripcion: this.form.descripcion
      }).subscribe({
        next: () => {
          this.closeModal();
          this.fetchData();
        }
      });
    } else {
      this.catService.addCategory({
        nombre: this.form.nombre.trim(),
        tipo: this.form.tipo,
        icono: this.form.icono,
        color: this.form.color,
        descripcion: this.form.descripcion
      }).subscribe({
        next: () => {
          this.closeModal();
          this.fetchData();
        }
      });
    }
  }

  deleteCategory(id: string): void {
    if (confirm('¿Deseas eliminar esta categoría de la base de datos?')) {
      this.catService.deleteCategory(id).subscribe({
        next: () => this.fetchData()
      });
    }
  }

  exportMatrix(): void {
    const stats = this.categoryStats();
    const code = this.currency.code();
    const rows = this.categories().map(c => [
      c.nombre,
      c.tipo,
      this.currency.convertFromGTQ(stats[c.nombre]?.total || 0).toFixed(2),
      stats[c.nombre]?.count || 0,
      c.descripcion || ''
    ]);

    exportToCsv({
      filename: `Categorias_Vought_${getLocalTodayString()}`,
      headers: ['Categoría', 'Tipo', `Monto Total (${code})`, 'Transacciones', 'Descripción'],
      rows
    });
  }

  formatCurrency(amount: number): string {
    return this.currency.format(amount);
  }
}
