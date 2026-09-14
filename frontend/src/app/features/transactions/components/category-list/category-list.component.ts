import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService } from '../../../../core/services/currency.service';

export interface CategoryRow {
  name: string;
  movements: number;
  spent: number;
}

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.css'
})
export class CategoryListComponent {
  private currency = inject(CurrencyService);

  categories = input.required<CategoryRow[]>();
  ariaLabel = input('Top categorías');

  formatCurrency(value: number): string {
    return this.currency.format(value);
  }
}
