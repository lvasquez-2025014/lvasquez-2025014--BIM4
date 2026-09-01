import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardDataService, Period } from '../../services/dashboard-data.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { StatCardComponent } from '../../components/stat-card/stat-card.component';
import { CandlestickChartComponent, CashFlowChartData } from '../../components/candlestick-chart/candlestick-chart.component';
import { LineChartComponent } from '../../components/line-chart/line-chart.component';
import { DonutChartComponent } from '../../components/donut-chart/donut-chart.component';
import { ActivityListComponent } from '../../components/activity-list/activity-list.component';
import { CategoryListComponent } from '../../components/category-list/category-list.component';
import { QuickActionsComponent } from '../../components/quick-actions/quick-actions.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    TopbarComponent,
    StatCardComponent,
    CandlestickChartComponent,
    LineChartComponent,
    DonutChartComponent,
    ActivityListComponent,
    CategoryListComponent,
    QuickActionsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private dashboardData = inject(DashboardDataService);
  private router = inject(Router);

  readonly data = this.dashboardData;

  ngOnInit() {
    this.dashboardData.fetchExpenses();
  }

  periods = [
    { value: 'day' as Period, label: 'Hoy' },
    { value: 'week' as Period, label: 'Semana' },
    { value: 'month' as Period, label: 'Mes' },
    { value: 'year' as Period, label: 'Año' }
  ];

  currentDate = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  });

  cashFlowData = computed((): CashFlowChartData => {
    return this.dashboardData.generateCashFlowData(this.dashboardData.currentPeriod());
  });

  onPeriodChange(period: Period): void {
    this.dashboardData.setPeriod(period);
  }

  navigateToGastos(): void {
    this.router.navigate(['/gastos/nuevo']);
  }

  formatCurrency(value: number): string {
    return this.dashboardData.formatCurrency(value);
  }
}
