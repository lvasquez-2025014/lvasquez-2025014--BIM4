import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService } from '../../../../core/services/currency.service';

export interface ActivityItem {
  icon: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-list.component.html',
  styleUrl: './activity-list.component.css'
})
export class ActivityListComponent {
  private currency = inject(CurrencyService);

  activities = input.required<ActivityItem[]>();
  ariaLabel = input('Actividad reciente');

  formatCurrency(value: number): string {
    return this.currency.format(value);
  }
}