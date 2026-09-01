import { AfterViewInit, Component, computed, effect, ElementRef, input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CashFlowChartData { labels: string[]; income: number[]; expense: number[]; net: number[]; }

@Component({
  selector: 'app-candlestick-chart', standalone: true, imports: [CommonModule],
  templateUrl: './candlestick-chart.component.html', styleUrl: './candlestick-chart.component.css'
})
export class CandlestickChartComponent implements AfterViewInit, OnDestroy {
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

  constructor() { effect(() => { this.data(); setTimeout(() => this.render(), 0); }); }

  ngAfterViewInit(): void {
    this.render();
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.chartAreaRef.nativeElement);
  }

  ngOnDestroy(): void { this.resizeObserver?.disconnect(); }

  onMouseMove(event: MouseEvent): void {
    const rect = this.chartAreaRef.nativeElement.getBoundingClientRect();
    const labels = this.data().labels;
    const relativeX = event.clientX - rect.left;
    const index = labels.length === 1 ? 0 : Math.round((relativeX / rect.width) * (labels.length - 1));
    if (index < 0 || index >= labels.length) return this.hideHover();

    const x = this.getX(index, labels.length, rect.width);
    this.crossVRef.nativeElement.style.left = `${x}px`;
    this.crossHRef.nativeElement.style.top = `${Math.min(event.clientY - rect.top, this.chartHeight)}px`;
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

    // Calcular saldo acumulado para una línea suave
    const cumulative: number[] = [];
    let acc = 0;
    for (const v of net) {
      acc += v;
      cumulative.push(acc);
    }

    const hasMovements = cumulative.some(v => v !== 0);
    if (!hasMovements) {
      this.svgRef.nativeElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      this.svgRef.nativeElement.innerHTML = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#9aa9a2" font-size="14">No hay movimientos registrados en este período</text>`;
      this.yAxisRef.nativeElement.innerHTML = '';
      this.renderXAxis(labels);
      return;
    }

    const { min, max, step } = this.getScale(
      Math.min(...cumulative, 0),
      Math.max(...cumulative, 0)
    );
    const range = max - min || 1;
    const padX = 20; // Padding horizontal
    const usableWidth = width - padX * 2;
    const y = (value: number) => height - ((value - min) / range) * height;
    const getXPadded = (index: number, total: number) => {
      return total === 1 ? width / 2 : padX + (index / (total - 1)) * usableWidth;
    };

    let svg = '';

    // Grilla horizontal
    for (let value = min; value <= max + step / 2; value += step) {
      const py = y(value);
      const isZero = Math.abs(value) < step / 100;
      svg += `<line x1="0" y1="${py}" x2="${width}" y2="${py}" stroke="${isZero ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.06)'}" stroke-width="1" ${isZero ? '' : 'stroke-dasharray="4 4"'}/>`;
    }

    // Grilla vertical sutil
    labels.forEach((_, index) => {
      const x = getXPadded(index, labels.length);
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,.04)" stroke-width="1"/>`;
    });

    // Calcular puntos
    const points = cumulative.map((value, index) => ({
      x: getXPadded(index, labels.length),
      y: y(value)
    }));

    // Área de relleno con gradiente
    const gradientId = `area-fill-${this.id()}`;
    const glowId = `glow-${this.id()}`;
    svg += `
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.3"/>
          <stop offset="70%" stop-color="#10b981" stop-opacity="0.05"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
        </linearGradient>
        <filter id="${glowId}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
    `;

    // Área rellena
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const baseY = y(Math.max(min, 0));
    const areaPath = pathD + ` L${points[points.length - 1].x.toFixed(2)},${baseY.toFixed(2)} L${points[0].x.toFixed(2)},${baseY.toFixed(2)} Z`;
    svg += `<path d="${areaPath}" fill="url(#${gradientId})"/>`;

    // Línea principal
    svg += `<path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})"/>`;

    // Puntos con efecto
    points.forEach((point, index) => {
      svg += `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0b1410" stroke="#10b981" stroke-width="2.5">
        <title>${labels[index]}: ${this.formatCurrency(cumulative[index])}</title>
      </circle>`;
      svg += `<circle cx="${point.x}" cy="${point.y}" r="3" fill="#10b981" opacity="0.8">
        <title>${labels[index]}: ${this.formatCurrency(cumulative[index])}</title>
      </circle>`;
    });

    this.svgRef.nativeElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svgRef.nativeElement.innerHTML = svg;
    this.renderYAxis(min, max, step);
    this.renderXAxis(labels);
  }

  private getScale(rawMin: number, rawMax: number): { min: number; max: number; step: number } {
    if (rawMin === rawMax) {
      const base = Math.abs(rawMin) || 100;
      rawMin -= base * 0.2;
      rawMax += base * 0.2;
    }
    const roughStep = (rawMax - rawMin) / 5;
    const power = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
    const normalized = roughStep / power;
    const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
    return {
      min: Math.floor(rawMin / step) * step,
      max: Math.ceil(rawMax / step) * step,
      step
    };
  }

  private getX(index: number, total: number, width: number): number {
    const padX = 20;
    const usableWidth = width - padX * 2;
    return total === 1 ? width / 2 : padX + (index / (total - 1)) * usableWidth;
  }

  private renderYAxis(min: number, max: number, step: number): void {
    const axis = this.yAxisRef.nativeElement;
    axis.innerHTML = '';
    for (let value = max; value >= min - step / 2; value -= step) {
      const label = document.createElement('span');
      label.textContent = this.formatCurrencyShort(value);
      Object.assign(label.style, { display: 'block', textAlign: 'right', color: '#9aa9a2', fontSize: '11px', fontWeight: '600', lineHeight: '1' });
      axis.appendChild(label);
    }
  }

  private renderXAxis(labels: string[]): void {
    const axis = this.xAxisRef.nativeElement;
    axis.innerHTML = '';
    Object.assign(axis.style, { display: 'flex', justifyContent: 'space-between', padding: '0 20px' });
    // En períodos largos se muestran etiquetas de referencia sin amontonarlas.
    const maxLabels = 7;
    const labelStep = Math.max(1, Math.ceil(labels.length / maxLabels));
    labels.forEach((text, index) => {
      const label = document.createElement('span');
      label.textContent = index % labelStep === 0 || index === labels.length - 1 ? text : '';
      Object.assign(label.style, {
        textAlign: 'center', color: '#9aa9a2', fontSize: '11px', fontWeight: '600',
        lineHeight: '24px', whiteSpace: 'nowrap'
      });
      axis.appendChild(label);
    });
  }

  private showTooltip(index: number, x: number, width: number): void {
    const tooltip = this.tooltipRef.nativeElement;
    const { labels, income, expense, net } = this.data();

    // Calcular acumulado hasta este punto
    let acc = 0;
    for (let i = 0; i <= index; i++) acc += net[i];

    const dateEl = document.getElementById(`csTtDate-${this.id()}`);
    const incomeEl = document.getElementById(`csTtIncome-${this.id()}`);
    const expenseEl = document.getElementById(`csTtExpense-${this.id()}`);
    const netEl = document.getElementById(`csTtNet-${this.id()}`);

    if (dateEl) dateEl.textContent = labels[index];
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

  private formatCurrency(value: number): string { return `Q ${value.toLocaleString('es-GT', { maximumFractionDigits: 2 })}`; }

  private formatCurrencyShort(value: number): string {
    if (Math.abs(value) >= 1000) {
      return `Q ${(value / 1000).toFixed(1)}k`;
    }
    return `Q ${value.toLocaleString('es-GT', { maximumFractionDigits: 0 })}`;
  }
}
