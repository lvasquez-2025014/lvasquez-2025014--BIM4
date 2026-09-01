import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  activities = input.required<ActivityItem[]>();
  ariaLabel = input('Actividad reciente');

  formatCurrency(value: number): string {
    return 'Q ' + value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}