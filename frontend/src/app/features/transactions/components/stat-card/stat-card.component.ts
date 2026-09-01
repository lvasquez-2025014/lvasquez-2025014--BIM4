import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css'
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string>();
  footerText = input.required<string>();
  trendIcon = input.required<string>();
  valueClass = input<string>('');
  trendClass = input<'positive' | 'negative' | 'accent'>('accent');

  cardClasses = computed(() => {
    const classes = ['stat-card'];
    if (this.valueClass()) classes.push(this.valueClass());
    if (this.trendClass()) classes.push(this.trendClass());
    return classes.join(' ');
  });
}