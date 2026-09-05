import { Injectable, signal, computed } from '@angular/core';

export type CurrencyCode = 'GTQ' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rateVsGTQ: number; // Factor para convertir 1 GTQ a esta moneda
  rateFromCurrencyToGTQ: number; // Cuántos Quetzales vale 1 unidad de esta moneda
  decimals: number;
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  GTQ: {
    code: 'GTQ',
    symbol: 'Q',
    rateVsGTQ: 1.0,
    rateFromCurrencyToGTQ: 1.0,
    decimals: 2,
    name: 'Quetzal Guatemalteco'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    rateVsGTQ: 1 / 7.75, // Q 7.75 = $ 1
    rateFromCurrencyToGTQ: 7.75,
    decimals: 2,
    name: 'Dólar Estadounidense'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    rateVsGTQ: 1 / 8.45, // Q 8.45 = € 1
    rateFromCurrencyToGTQ: 8.45,
    decimals: 2,
    name: 'Euro'
  }
};

const STORAGE_KEY = 'vought_active_currency';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly _code = signal<CurrencyCode>('GTQ');
  private readonly _customSymbol = signal<string>('Q');
  private readonly _decimals = signal<number>(2);

  readonly code = this._code.asReadonly();
  readonly symbol = this._customSymbol.asReadonly();
  readonly decimals = this._decimals.asReadonly();

  readonly config = computed(() => {
    const c = CURRENCIES[this._code()] || CURRENCIES.GTQ;
    return {
      ...c,
      symbol: this._customSymbol() || c.symbol,
      decimals: this._decimals()
    };
  });

  readonly name = computed(() => this.config().name);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.code && CURRENCIES[parsed.code as CurrencyCode]) {
          this._code.set(parsed.code as CurrencyCode);
          this._customSymbol.set(parsed.symbol || CURRENCIES[parsed.code as CurrencyCode].symbol);
          this._decimals.set(parsed.decimals ?? 2);
        }
      }
    } catch {}
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        code: this._code(),
        symbol: this._customSymbol(),
        decimals: this._decimals()
      }));
    } catch {}
  }

  setCurrency(code: CurrencyCode, symbol?: string, decimals?: number): void {
    const target = CURRENCIES[code] || CURRENCIES.GTQ;
    this._code.set(target.code);
    this._customSymbol.set(symbol || target.symbol);
    if (decimals !== undefined) this._decimals.set(decimals);
    this.persist();
  }

  /**
   * Convierte un monto expresado en GTQ a la moneda activa.
   */
  convertFromGTQ(amountInGTQ: number): number {
    const rate = this.config().rateVsGTQ;
    return Number((amountInGTQ * rate).toFixed(4));
  }

  /**
   * Formatea un monto en GTQ a la moneda activa con su símbolo y formato numérico.
   */
  format(amountInGTQ: number, overrideDecimals?: number): string {
    const cfg = this.config();
    const converted = amountInGTQ * cfg.rateVsGTQ;
    const dec = overrideDecimals !== undefined ? overrideDecimals : cfg.decimals;
    const absVal = Math.abs(converted);
    const formattedNum = absVal.toLocaleString('es-GT', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
    const sign = converted < 0 ? '-' : '';
    return `${sign}${cfg.symbol} ${formattedNum}`;
  }

  /**
   * Formateador compacto para ejes de gráficos o tooltips.
   */
  formatShort(amountInGTQ: number): string {
    const cfg = this.config();
    const converted = amountInGTQ * cfg.rateVsGTQ;
    const absVal = Math.abs(converted);
    const sign = converted < 0 ? '-' : '';
    if (absVal >= 1000) {
      return `${sign}${cfg.symbol} ${(absVal / 1000).toFixed(1)}k`;
    }
    return `${sign}${cfg.symbol} ${absVal.toLocaleString('es-GT', { maximumFractionDigits: 0 })}`;
  }
}
