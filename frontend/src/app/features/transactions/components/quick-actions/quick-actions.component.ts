import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface QuickAction {
  icon: string;
  title: string;
  description: string;
  route: string;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-actions.component.html',
  styleUrl: './quick-actions.component.css'
})
export class QuickActionsComponent {
  private router = inject(Router);

  actions = input.required<QuickAction[]>();
  ariaLabel = input('Acciones rápidas');
  actionClick = output<string>();

  onActionClick(route: string): void {
    this.router.navigate([route]);
    this.actionClick.emit(route);
  }
}