import {
  Component,
  input,
  output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  computed,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService } from '../../../../core/services/currency.service';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.css'
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
  private currency = inject(CurrencyService);

  id = input.required<string>();
  data = input.required<number[]>();
  labels = input.required<string[]>();
  color = input('var(--accent)');
  ariaLabel = input('Gráfico de línea');

  constructor() {
    effect(() => {
      this.data(); // Trigger dependency
      this.labels(); // Trigger dependency
      this.currency.code(); // Trigger dependency
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
    const zeroY = padTop + (1 - ((0 - minV) / range)) * usableH;
    const areaD = pathD + ' L' + points[points.length - 1].x.toFixed(2) + ',' + zeroY.toFixed(2) + ' L' + points[0].x.toFixed(2) + ',' + zeroY.toFixed(2) + ' Z';

    const zeroRatio = Math.max(0, Math.min(1, (0 - minV) / range));
    const zeroPercent = Math.max(0, Math.min(100, (1 - zeroRatio) * 100));
    const hasNegative = minV < 0;

    let svg = `
      <defs>
        <filter id="glow-line-${this.id()}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        ${hasNegative ? `
        <linearGradient id="line-grad-${this.id()}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${this.color()}"/>
          <stop offset="${Math.max(0, zeroPercent - 0.5).toFixed(1)}%" stop-color="${this.color()}"/>
          <stop offset="${Math.min(100, zeroPercent + 0.5).toFixed(1)}%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
        <linearGradient id="fill-${this.id()}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${this.color()}" stop-opacity="0.3"/>
          <stop offset="${zeroPercent.toFixed(1)}%" stop-color="${this.color()}" stop-opacity="0.02"/>
          <stop offset="${zeroPercent.toFixed(1)}%" stop-color="#f43f5e" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.3"/>
        </linearGradient>
        ` : `
        <linearGradient id="fill-${this.id()}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${this.color()}" stop-opacity="0.3"/>
          <stop offset="70%" stop-color="${this.color()}" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="${this.color()}" stop-opacity="0"/>
        </linearGradient>
        `}
      </defs>
    `;

    // Horizontal grid
    for (let val = minV; val <= maxV + step / 2; val += step) {
      const py = padTop + (1 - ((val - minV) / range)) * usableH;
      const isZero = Math.abs(val) < step / 100;
      if (isZero) {
        svg += `<line x1="0" y1="${py.toFixed(2)}" x2="${w}" y2="${py.toFixed(2)}" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      } else {
        svg += `<line x1="0" y1="${py.toFixed(2)}" x2="${w}" y2="${py.toFixed(2)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>`;
      }
    }

    // Vertical grid
    points.forEach(p => {
      svg += `<line x1="${p.x.toFixed(2)}" y1="0" x2="${p.x.toFixed(2)}" y2="${h}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
    });

    // Area and Line
    const strokeColor = hasNegative ? `url(#line-grad-${this.id()})` : this.color();
    svg += `<path d="${areaD}" fill="url(#fill-${this.id()})"/>`;
    svg += `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow-line-${this.id()})"/>`;

    // Dots con tamaño adaptativo y color por signo
    const dotRadius = points.length > 14 ? 3 : 4.5;
    const innerRadius = points.length > 14 ? 1.5 : 2.5;
    const strokeWidth = points.length > 14 ? 1.5 : 2;

    points.forEach((p, i) => {
      const lbl = this.labels()[i] || '';
      const isPos = p.v >= 0;
      const dotColor = isPos ? this.color() : '#f43f5e';
      const dotGlow = isPos ? 'var(--accent-glow)' : 'rgba(244, 63, 94, 0.4)';

      svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${dotRadius}" fill="var(--surface-card, #121214)" stroke="${dotColor}" stroke-width="${strokeWidth}" style="filter: drop-shadow(0 0 3px ${dotGlow});">
        <title>${lbl ? lbl + ': ' : ''}${this.formatCurrency(p.v)}</title>
      </circle>`;
      svg += `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${innerRadius}" fill="${dotColor}" opacity="0.9">
        <title>${lbl ? lbl + ': ' : ''}${this.formatCurrency(p.v)}</title>
      </circle>`;
    });

    this.svgRef.nativeElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svgRef.nativeElement.innerHTML = svg;
    
    // Clear old HTML dots
    this.dotsRef.nativeElement.innerHTML = '';

    this.yAxisRef.nativeElement.innerHTML = this.generateYLabels(minV, maxV, step).map(t => `<span>${t}</span>`).join('');

    this.xLabelsRef.nativeElement.innerHTML = '';
    const labels = this.labels();
    if (!labels.length || !points.length) return;

    // Calcular cuántos hitos caben cómodamente según el ancho real
    const maxLabels = w < 400 ? 4 : w < 550 ? 5 : 7;
    const labelStep = Math.max(1, Math.ceil((labels.length - 1) / (maxLabels - 1)));

    const indicesToShow = new Set<number>();
    for (let i = 0; i < labels.length; i += labelStep) {
      indicesToShow.add(i);
    }
    indicesToShow.add(labels.length - 1);

    indicesToShow.forEach(index => {
      const p = points[index];
      if (!p) return;
      const s = document.createElement('span');
      s.textContent = labels[index];
      s.style.position = 'absolute';
      s.style.left = `${p.x.toFixed(2)}px`;
      if (index === 0) {
        s.style.transform = 'translateX(0)';
      } else if (index === labels.length - 1) {
        s.style.transform = 'translateX(-100%)';
      } else {
        s.style.transform = 'translateX(-50%)';
      }
      this.xLabelsRef.nativeElement.appendChild(s);
    });
  }

  private getScale(values: number[]): { minV: number; maxV: number; step: number } {
    if (!values.length || values.every(v => v === 0)) {
      return { minV: 0, maxV: 500, step: 100 };
    }
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    let low = Math.min(0, minVal);
    let high = Math.max(0, maxVal);
    if (low === high) {
      const base = Math.abs(low) || 100;
      low -= base * 0.25;
      high += base * 0.25;
    }
    const roughStep = Math.max((high - low) / 4, 1);
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / power;
    const step = Math.max(1, (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power);
    return {
      minV: Math.floor(low / step) * step,
      maxV: Math.ceil(high / step) * step,
      step
    };
  }

  private generateYLabels(minVal: number, maxVal: number, step: number): string[] {
    const out: string[] = [];
    for (let val = maxVal; val >= minVal - step / 2; val -= step) {
      out.push(this.currency.formatShort(val));
    }
    return out;
  }

  private formatCurrency(value: number): string {
    return this.currency.format(value);
  }
}
