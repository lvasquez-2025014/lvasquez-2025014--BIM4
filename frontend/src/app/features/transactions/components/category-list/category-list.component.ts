import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  categories = input.required<CategoryRow[]>();
  ariaLabel = input('Top categorías');

  formatCurrency(value: number): string {
    return 'Q ' + value.toLocaleString('es-GT');
  }
}
