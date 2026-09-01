import {
  Component,
  input,
  output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.css'
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  id = input.required<string>();
  data = input.required<number[]>();
  labels = input.required<string[]>();
  color = input('#10b981');
  ariaLabel = input('Gráfico de línea');

  constructor() {
    effect(() => {
      this.data(); // Trigger dependency
      setTimeout(() => this.render(), 0);
    });
  }

  @ViewChild('svg') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('dots') dotsRef!: ElementRef<HTMLDivElement>;
  @ViewChild('yAxis') yAxisRef!: ElementRef<HTMLDivElement>;
  @ViewChild('xLabels') xLabelsRef!: ElementRef<HTMLDivElement>;

  private resizeObserver!: ResizeObserver;

  ngAfterViewInit(): void {
    this.render();
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.svgRef.nativeElement.parentElement!);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private render(): void {
    if (!this.svgRef?.nativeElement) return;

    const data = this.data();
    if (!data.length) {
      this.svgRef.nativeElement.innerHTML = '';
      this.dotsRef.nativeElement.innerHTML = '';
      this.yAxisRef.nativeElement.innerHTML = '';
      this.xLabelsRef.nativeElement.innerHTML = '';
      return;
    }

    const { minV, maxV, step } = this.getScale(data);
    const range = maxV - minV || 1;

    const parent = this.svgRef.nativeElement.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (!w || !h) return;

    const padX = 20, padTop = 15, padBottom = 15;
    const usableH = h - padTop - padBottom;
    const usableW = w - padX * 2;
    
    const points = data.map((v, i) => {
      const x = data.length > 1 ? padX + (i / (data.length - 1)) * usableW : w / 2;
      const y = padTop + (1 - ((v - minV) / range)) * usableH;
      return { x, y, v };
    });

    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ');
    const zeroY = padTop + (1 - ((Math.max(minV, 0) - minV) / range)) * usableH;
    const areaD = pathD + ' L' + points[points.length - 1].x.toFixed(2) + ',' + zeroY.toFixed(2) + ' L' + points[0].x.toFixed(2) + ',' + zeroY.toFixed(2) + ' Z';

    let svg = `
      <defs>
        <filter id="glow-line-${this.id()}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="fill-${this.id()}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${this.color()}" stop-opacity="0.3"/>
          <stop offset="70%" stop-color="${this.color()}" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="${this.color()}" stop-opacity="0"/>
        </linearGradient>
      </defs>
    `;

    // Horizontal grid
    for (let val = minV; val <= maxV + step / 2; val += step) {
      const py = padTop + (1 - ((val - minV) / range)) * usableH;
      const isZero = Math.abs(val) < step / 100;
      svg += `<line x1="0" y1="${py.toFixed(2)}" x2="${w}" y2="${py.toFixed(2)}" stroke="${isZero ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)'}" stroke-width="1" ${isZero ? '' : 'stroke-dasharray="4 4"'}/>`;
    }

    // Vertical grid
    points.forEach(p => {
      svg += `<line x1="${p.x.toFixed(2)}" y1="0" x2="${p.x.toFixed(2)}" y2="${h}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
    });

    // Area and Line
    svg += `<path d="${areaD}" fill="url(#fill-${this.id()})"/>`;
    svg += `<path d="${pathD}" fill="none" stroke="${this.color()}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-line-${this.id()})"/>`;

    // Dots
    points.forEach(p => {
      svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5" fill="#0b1410" stroke="${this.color()}" stroke-width="2.5">
        <title>${this.formatCurrency(p.v)}</title>
      </circle>`;
      svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3" fill="${this.color()}" opacity="0.8">
        <title>${this.formatCurrency(p.v)}</title>
      </circle>`;
    });

    this.svgRef.nativeElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svgRef.nativeElement.innerHTML = svg;
    
    // Clear old HTML dots
    this.dotsRef.nativeElement.innerHTML = '';

    this.yAxisRef.nativeElement.innerHTML = this.generateYLabels(minV, maxV, step).map(t => `<span>${t}</span>`).join('');

    this.xLabelsRef.nativeElement.innerHTML = '';
    this.labels().forEach(l => {
      const s = document.createElement('span');
      s.textContent = l;
      this.xLabelsRef.nativeElement.appendChild(s);
    });
  }

  private getScale(values: number[]): { minV: number; maxV: number; step: number } {
    const magnitude = Math.max(...values.map(Math.abs), 1);
    const roughStep = magnitude / 4;
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / power;
    const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
    return {
      minV: Math.min(0, Math.floor(Math.min(...values) / step) * step),
      maxV: Math.max(0, Math.ceil(Math.max(...values) / step) * step),
      step
    };
  }

  private generateYLabels(minVal: number, maxVal: number, step: number): string[] {
    const out: string[] = [];
    for (let val = maxVal; val >= minVal - step / 2; val -= step) {
      out.push(this.formatCurrency(val));
    }
    return out;
  }

  private formatCurrency(value: number): string {
    return 'Q ' + value.toLocaleString('es-GT');
  }
}
