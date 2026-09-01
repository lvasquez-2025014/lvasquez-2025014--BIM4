import {
  Component,
  input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface DonutData {
  labels: string[];
  data: number[];
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.css'
})
export class DonutChartComponent implements AfterViewInit, OnDestroy {
  id = input.required<string>();
  data = input.required<DonutData>();
  ariaLabel = input('Gráfico de dona');

  constructor() {
    effect(() => {
      this.data(); // Trigger dependency
      setTimeout(() => this.render(), 0);
    });
  }

  @ViewChild('donutSvg') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('donutLegend') legendRef!: ElementRef<HTMLDivElement>;

  private donutColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6'];

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnDestroy(): void {}

  private render(): void {
    if (!this.svgRef?.nativeElement || !this.legendRef?.nativeElement) return;

    const d = this.data();
    const total = d.data.reduce((a, b) => a + b, 0);
    const cx = 100, cy = 100, r = 70, sw = 16;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    
    let circles = `
      <defs>
        <filter id="glow-${this.id()}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    `;

    d.data.forEach((v, i) => {
      if (v <= 0 || !total) return;
      const pct = v / total;
      // Subtract a small amount from dash to create a gap between segments
      const gapSize = 4; // 4px gap
      const dash = Math.max(0, (pct * circ) - gapSize);
      const gap = circ - dash;
      const col = this.donutColors[i % this.donutColors.length];
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" stroke-linecap="round" filter="url(#glow-${this.id()})" transform="rotate(-90 ${cx} ${cy})"/>`;
      offset += (pct * circ);
    });

    if (!total) {
      circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.09)" stroke-width="${sw}"/>`;
    }
    circles += `<circle cx="${cx}" cy="${cy}" r="${r - sw / 2 - 12}" fill="var(--surface)"/>`;
    circles += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="18" font-weight="800" fill="var(--text)">${this.formatCurrency(total)}</text>`;
    circles += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="9" font-weight="600" letter-spacing="0.1em" text-transform="uppercase" fill="var(--muted)">total</text>`;

    this.svgRef.nativeElement.innerHTML = circles;

    this.legendRef.nativeElement.innerHTML = '';
    d.data.forEach((v, i) => {
      const col = this.donutColors[i % this.donutColors.length];
      const pct = total ? ((v / total) * 100).toFixed(1) : '0.0';
      const item = document.createElement('div');
      item.className = 'donut-legend-item';
      item.innerHTML = `<div class="donut-legend-dot" style="background:${col}"></div><div class="donut-legend-text"><strong>${d.labels[i]}</strong><small>${this.formatCurrency(v)} · ${pct}%</small></div>`;
      this.legendRef.nativeElement.appendChild(item);
    });
  }

  private formatCurrency(value: number): string {
    return 'Q ' + value.toLocaleString('es-GT');
  }
}
