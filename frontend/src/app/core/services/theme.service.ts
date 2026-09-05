import { Injectable, signal } from '@angular/core';

export type ThemeId = 'dark' | 'light' | 'sepia' | 'pink' | 'midnight';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  bgHex: string;
  accentHex: string;
  surfaceHex: string;
  icon: string;
  gradient: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'vought_app_theme';

  readonly themes: ThemeOption[] = [
    {
      id: 'dark',
      name: 'Oscuro (Esmeralda Principal)',
      tagline: 'Corporativo & Cyberpunk',
      description: 'Obsidiana profunda y verde esmeralda neón de alta precisión',
      bgHex: '#050608',
      accentHex: '#10b981',
      surfaceHex: '#111115',
      icon: '🟢',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      id: 'light',
      name: 'Blanco (Luz Pro)',
      tagline: 'Claridad & Alta Fidelidad',
      description: 'Minimalismo blanco puro y azul zafiro moderno de alta legibilidad',
      bgHex: '#f8fafc',
      accentHex: '#2563eb',
      surfaceHex: '#ffffff',
      icon: '☀️',
      gradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
    },
    {
      id: 'sepia',
      name: 'Sepia (Vintage Paper)',
      tagline: 'Confort Visual & Editorial',
      description: 'Pergamino orgánico cálido y acentos terracota de descanso ocular',
      bgHex: '#f5eedc',
      accentHex: '#b45309',
      surfaceHex: '#fbf7f0',
      icon: '📜',
      gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
    },
    {
      id: 'pink',
      name: 'Rosado (Cyber Rose)',
      tagline: 'Synthwave & Glamour Neón',
      description: 'Plum terciopelo oscuro con fucsia y magenta neón vibrante',
      bgHex: '#0d050a',
      accentHex: '#ec4899',
      surfaceHex: '#1d0d17',
      icon: '🌸',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
    },
    {
      id: 'midnight',
      name: 'Medianoche (Sapphire Ice)',
      tagline: 'Espacio Profundo & Hielo Cian',
      description: 'Noche profunda aeroespacial y cian glaciar eléctrico de alto contraste',
      bgHex: '#030712',
      accentHex: '#06b6d4',
      surfaceHex: '#0f172a',
      icon: '🌌',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)'
    }
  ];

  activeTheme = signal<ThemeId>('dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem(this.STORAGE_KEY) as ThemeId;
      const isValid = this.themes.some(t => t.id === savedTheme);
      const initial = isValid ? savedTheme : 'dark';
      this.setTheme(initial, false);
    } catch {
      this.setTheme('dark', false);
    }
  }

  setTheme(themeId: ThemeId, saveStorage = true): void {
    this.activeTheme.set(themeId);

    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-morphing');
      document.documentElement.setAttribute('data-theme', themeId);
      document.body.setAttribute('data-theme', themeId);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-morphing');
      }, 400);
    }

    if (saveStorage && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, themeId);
      } catch (err) {
        console.warn('Could not save theme to localStorage:', err);
      }
    }
  }

  getAvailableThemes(): ThemeOption[] {
    return this.themes;
  }

  getCurrentTheme(): ThemeOption {
    return this.themes.find(t => t.id === this.activeTheme()) || this.themes[0];
  }
}
