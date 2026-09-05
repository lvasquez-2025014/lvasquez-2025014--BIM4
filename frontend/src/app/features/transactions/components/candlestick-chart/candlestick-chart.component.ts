import { AfterViewInit, Component, computed, effect, ElementRef, input, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService } from '../../../../core/services/currency.service';

export interface CashFlowChartData { labels: string[]; income: number[]; expense: number[]; net: number[]; }

@Component({
  selector: 'app-candlestick-chart', standalone: true, imports: [CommonModule],
  templateUrl: './candlestick-chart.component.html', styleUrl: './candlestick-chart.component.css'
})
export class CandlestickChartComponent implements AfterViewInit, OnDestroy {
  private currency = inject(CurrencyService);

  id = input.required<string>();
  symbol = input('Resumen');
  subtitle = input('Flujo de efectivo');
  data = input.required<CashFlowChartData>();
  currentPrice = input(0);

  @ViewChild('chartArea') chartAreaRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svg') svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('yAxis') yAxisRef!: ElementRef<HTMLDivElement>;
  @ViewChild('xAxis') xAxisRef!: ElementRef<HTMLDivElement>;
  @ViewChild('crossV') crossVRef!: ElementRef<HTMLDivElement>;
  @ViewChild('crossH') crossHRef!: ElementRef<HTMLDivElement>;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;

  readonly formattedCurrentPrice = computed(() => this.formatCurrency(this.currentPrice()));

  private resizeObserver?: ResizeObserver;
  private chartHeight = 0;

  constructor() {
    effect(() => {
      this.data();
      this.currency.code();
      setTimeout(() => this.render(), 0);
    });
  }

  ngAfterViewInit(): void {
    this.render();
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.chartAreaRef.nativeElement);
  }

  ngOnDestroy(): void { this.resizeObserver?.disconnect(); }

  onMouseMove(event: MouseEvent): void {
    const rect = this.chartAreaRef.nativeElement.getBoundingClientRect();
    const labels = this.data().labels;
    if (!labels || !labels.length) return;

    const padX = 20;
    const usableWidth = rect.width - padX * 2;
    const relativeX = event.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(relativeX - padX, usableWidth));
    const index = labels.length <= 1 ? 0 : Math.round((clampedX / (usableWidth || 1)) * (labels.length - 1));
    if (index < 0 || index >= labels.length) return this.hideHover();

    const x = this.getX(index, labels.length, rect.width);
    this.crossVRef.nativeElement.style.left = `${x}px`;
    this.crossHRef.nativeElement.style.top = `${Math.min(Math.max(0, event.clientY - rect.top), this.chartHeight)}px`;
    this.crossVRef.nativeElement.style.opacity = '1';
    this.crossHRef.nativeElement.style.opacity = '1';
    this.showTooltip(index, x, rect.width);
  }

  onMouseLeave(): void { this.hideHover(); }

  private render(): void {
    if (!this.chartAreaRef?.nativeElement || !this.svgRef?.nativeElement) return;
    const rect = this.chartAreaRef.nativeElement.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.max(160, Math.floor(rect.height - 28));
    const { labels, net } = this.data();
    this.chartHeight = height;

    if (!width || !labels.length) {
      this.svgRef.nativeElement.innerHTML = '';
      this.yAxisRef.nativeElement.innerHTML = '';
      this.xAxisRef.nativeElement.innerHTML = '';
      return;
    }

    // Calcular saldo acumulado para una línea continua
    const cumulative: number[] = [];
    let acc = 0;
    for (const v of net) {
      acc += (v || 0);
      cumulative.push(acc);
    }

    const { min, max, step } = this.getScale(
      Math.min(...cumulative, 0),
      Math.max(...cumulative, 0)
    );
    const range = max - min || 1;
    const padX = 24; // Padding horizontal
    const padTop = 16;
    const padBottom = 16;
    const usableWidth = width - padX * 2;
    const usableHeight = height - padTop - padBottom;
    const y = (value: number) => padTop + (1 - ((value - min) / range)) * usableHeight;
    const getXPadded = (index: number, total: number) => {
      return total <= 1 ? width / 2 : padX + (index / (total - 1)) * usableWidth;
    };

    const zeroY = y(0);
    const zeroRatio = Math.max(0, Math.min(1, (0 - min) / range));
    const zeroPercent = Math.max(0, Math.min(100, (1 - zeroRatio) * 100));

    const lineGradId = `line-grad-${this.id()}`;
    const areaGradId = `area-fill-${this.id()}`;
    const glowId = `glow-${this.id()}`;

    let svg = `
      <defs>
        <filter id="${glowId}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <linearGradient id="${lineGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)"/>
          <stop offset="${Math.max(0, zeroPercent - 0.5).toFixed(1)}%" stop-color="var(--accent)"/>
          <stop offset="${Math.min(100, zeroPercent + 0.5).toFixed(1)}%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
        <linearGradient id="${areaGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="${zeroPercent.toFixed(1)}%" stop-color="var(--accent)" stop-opacity="0.02"/>
          <stop offset="${zeroPercent.toFixed(1)}%" stop-color="#f43f5e" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
    `;

    // Grilla horizontal con línea cero destacada
    for (let value = min; value <= max + step / 2; value += step) {
      const py = y(value);
      const isZero = Math.abs(value) < step / 100;
      if (isZero) {
        svg += `<line x1="0" y1="${py.toFixed(2)}" x2="${width}" y2="${py.toFixed(2)}" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
      } else {
        svg += `<line x1="0" y1="${py.toFixed(2)}" x2="${width}" y2="${py.toFixed(2)}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>`;
      }
    }

    // Grilla vertical
    labels.forEach((_, index) => {
      const x = getXPadded(index, labels.length);
      svg += `<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${height}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
    });

    // Calcular puntos en el plano cartesiano
    const points = cumulative.map((value, index) => ({
      x: getXPadded(index, labels.length),
      y: y(value),
      value
    }));

    // Área rellena hasta la línea cero
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const areaPath = pathD + ` L${points[points.length - 1].x.toFixed(2)},${zeroY.toFixed(2)} L${points[0].x.toFixed(2)},${zeroY.toFixed(2)} Z`;
    svg += `<path d="${areaPath}" fill="url(#${areaGradId})"/>`;

    // Línea principal con degradado verde/rojo según esté arriba o abajo de cero
    svg += `<path d="${pathD}" fill="none" stroke="url(#${lineGradId})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})"/>`;

    // Puntos con efecto adaptativo según signo
    const dotRadius = points.length > 14 ? 3 : 4.5;
    const innerRadius = points.length > 14 ? 1.5 : 2.5;
    const strokeWidth = points.length > 14 ? 1.5 : 2;

    points.forEach((point, index) => {
      const isPos = point.value >= 0;
      const color = isPos ? 'var(--accent)' : '#f43f5e';
      const glow = isPos ? 'var(--accent-glow)' : 'rgba(244, 63, 94, 0.4)';
      svg += `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${dotRadius}" fill="var(--surface-card, #121214)" stroke="${color}" stroke-width="${strokeWidth}" style="filter: drop-shadow(0 0 4px ${glow});">
        <title>${labels[index]}: ${this.formatCurrency(point.value)}</title>
      </circle>`;
      svg += `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${innerRadius}" fill="${color}" opacity="0.9">
        <title>${labels[index]}: ${this.formatCurrency(point.value)}</title>
      </circle>`;
    });

    this.svgRef.nativeElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svgRef.nativeElement.innerHTML = svg;
    this.renderYAxis(min, max, step);
    this.renderXAxis(labels, width);
  }

  private getScale(rawMin: number, rawMax: number): { min: number; max: number; step: number } {
    if (rawMin === 0 && rawMax === 0) {
      return { min: 0, max: 500, step: 100 };
    }
    if (rawMin === rawMax) {
      const base = Math.abs(rawMin) || 100;
      rawMin -= base * 0.25;
      rawMax += base * 0.25;
    }
    if (rawMin > 0) rawMin = 0;
    if (rawMax < 0) rawMax = 0;

    const roughStep = Math.max((rawMax - rawMin) / 5, 1);
    const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / power;
    const step = Math.max(1, (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power);
    return {
      min: Math.floor(rawMin / step) * step,
      max: Math.ceil(rawMax / step) * step,
      step
    };
  }

  private getX(index: number, total: number, width: number): number {
    const padX = 20;
    const usableWidth = width - padX * 2;
    return total <= 1 ? width / 2 : padX + (index / (total - 1)) * usableWidth;
  }

  private renderYAxis(min: number, max: number, step: number): void {
    const axis = this.yAxisRef.nativeElement;
    axis.innerHTML = '';
    for (let value = max; value >= min - step / 2; value -= step) {
      const label = document.createElement('span');
      label.textContent = this.formatCurrencyShort(value);
      Object.assign(label.style, { display: 'block', textAlign: 'right', color: '#94a3b8', fontSize: '11px', fontWeight: '600', lineHeight: '1' });
      axis.appendChild(label);
    }
  }

  private renderXAxis(labels: string[], width: number): void {
    const axis = this.xAxisRef.nativeElement;
    axis.innerHTML = '';
    if (!labels.length) return;

    const padX = 20;
    const usableWidth = width - padX * 2;
    const maxLabels = width < 500 ? 5 : 7;
    const labelStep = Math.max(1, Math.ceil((labels.length - 1) / (maxLabels - 1)));

    const indicesToShow = new Set<number>();
    for (let i = 0; i < labels.length; i += labelStep) {
      indicesToShow.add(i);
    }
    indicesToShow.add(labels.length - 1);

    indicesToShow.forEach(index => {
      const x = labels.length <= 1 ? width / 2 : padX + (index / (labels.length - 1)) * usableWidth;
      const label = document.createElement('span');
      label.textContent = labels[index];
      label.style.position = 'absolute';
      label.style.left = `${x.toFixed(2)}px`;
      if (index === 0) {
        label.style.transform = 'translateX(0)';
      } else if (index === labels.length - 1) {
        label.style.transform = 'translateX(-100%)';
      } else {
        label.style.transform = 'translateX(-50%)';
      }
      Object.assign(label.style, {
        color: '#94a3b8',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '24px',
        whiteSpace: 'nowrap'
      });
      axis.appendChild(label);
    });
  }

  private showTooltip(index: number, x: number, width: number): void {
    const tooltip = this.tooltipRef.nativeElement;
    const { labels, income, expense, net } = this.data();
    if (!labels || index < 0 || index >= labels.length) return;

    // Calcular acumulado hasta este punto
    let acc = 0;
    for (let i = 0; i <= index; i++) acc += (net[i] || 0);

    const dateEl = document.getElementById(`csTtDate-${this.id()}`);
    const incomeEl = document.getElementById(`csTtIncome-${this.id()}`);
    const expenseEl = document.getElementById(`csTtExpense-${this.id()}`);
    const netEl = document.getElementById(`csTtNet-${this.id()}`);

    if (dateEl) dateEl.textContent = labels[index] || '';
    if (incomeEl) incomeEl.textContent = this.formatCurrency(income[index] || 0);
    if (expenseEl) expenseEl.textContent = this.formatCurrency(expense[index] || 0);
    if (netEl) {
      netEl.textContent = this.formatCurrency(acc);
      netEl.className = acc >= 0 ? 'positive' : 'negative';
    }
    tooltip.classList.add('visible');
    tooltip.style.left = x > width * .62 ? '12px' : 'auto';
    tooltip.style.right = x > width * .62 ? 'auto' : '12px';
  }

  private hideHover(): void {
    this.crossVRef.nativeElement.style.opacity = '0';
    this.crossHRef.nativeElement.style.opacity = '0';
    this.tooltipRef.nativeElement.classList.remove('visible');
  }

  private formatCurrency(value: number): string { return this.currency.format(value); }

  private formatCurrencyShort(value: number): string { return this.currency.formatShort(value); }
}
