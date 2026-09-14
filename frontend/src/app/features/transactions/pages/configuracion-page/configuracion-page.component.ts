import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { ApiService } from '../../../../core/services/api.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CurrencyService, CurrencyCode, CURRENCIES } from '../../../../core/services/currency.service';
import { AuthService } from '../../../auth/services/auth.service';
import { ThemeService, ThemeId } from '../../../../core/services/theme.service';

export type ConfigTab = 'general' | 'perfil' | 'alertas' | 'integraciones';

@Component({
  selector: 'app-configuracion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './configuracion-page.component.html',
  styleUrl: './configuracion-page.component.css'
})
export class ConfiguracionPageComponent implements OnInit {
  private api = inject(ApiService);
  private notification = inject(NotificationService);
  readonly auth = inject(AuthService);
  readonly currencyService = inject(CurrencyService);
  readonly themeService = inject(ThemeService);

  activeTab = signal<ConfigTab>('general');
  saving = signal(false);
  testingApi = signal(false);

  // Conversor interactivo en vivo
  testAmountGTQ = signal<number>(1000);
  convertedUSD = computed(() => (this.testAmountGTQ() / 7.75).toFixed(2));
  convertedEUR = computed(() => (this.testAmountGTQ() / 8.45).toFixed(2));

  // Settings model vinculado a la BD y al CurrencyService
  settings = {
    moneda: 'GTQ',
    simboloMoneda: 'Q',
    decimales: '2',
    zonaHoraria: 'America/Guatemala (UTC-6)',
    idioma: 'es-GT',
    entidad: 'Vought International Finance Corp.',
    nit: '9845210-4',
    emailAuditoria: 'auditoria@vought.corp',
    alerta80: true,
    alerta90: true,
    alertaSonora: false,
    jwtDuration: '10s',
    autoLock: true
  };

  // Avatar y Foto de Perfil
  availableAvatars = [
    '/assets/images/perfil.png',
    '/assets/images/perfil2.png',
    '/assets/images/perfil3.png'
  ];
  selectedPhoto = signal<string>('/assets/images/perfil.png');

  selectTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
    this.notification.show({
      type: 'success',
      message: `Tema cambiado a: ${this.themeService.getCurrentTheme().name}`
    });
  }

  ngOnInit(): void {
    // Sincronizar inicialmente con la configuración de moneda activa
    this.settings.moneda = this.currencyService.code();
    this.settings.simboloMoneda = this.currencyService.symbol();
    this.settings.decimales = String(this.currencyService.decimals());

    const currentPhoto = this.auth.currentUser()?.photo;
    if (currentPhoto) {
      this.selectedPhoto.set(currentPhoto);
    }

    this.fetchProfile();
  }

  async fetchProfile(): Promise<void> {
    try {
      const data = await this.api.get<any>('/api/user/profile');
      if (data) {
        if (data.foto) {
          this.selectedPhoto.set(data.foto);
          this.auth.updatePhoto(data.foto);
        }
        if (data.settings) {
          this.settings = { ...this.settings, ...data.settings };
          if (data.settings.moneda) {
            this.currencyService.setCurrency(
              data.settings.moneda as CurrencyCode,
              data.settings.simboloMoneda,
              Number(data.settings.decimales) || 2
            );
          }
        }
      }
    } catch {
      // Fallback si la sesión no responde
    }
  }

  selectAvatar(photo: string): void {
    this.selectedPhoto.set(photo);
  }

  onMonedaChange(code: string): void {
    const target = CURRENCIES[code as CurrencyCode];
    if (target) {
      this.settings.simboloMoneda = target.symbol;
    }
  }

  setTab(tab: ConfigTab): void {
    if (tab === 'integraciones' && !this.auth.isAdmin()) {
      this.activeTab.set('general');
      return;
    }
    this.activeTab.set(tab);
  }

  async saveSettings(): Promise<void> {
    this.saving.set(true);
    try {
      // Actualizar CurrencyService inmediatamente para que toda la app reaccione
      this.currencyService.setCurrency(
        this.settings.moneda as CurrencyCode,
        this.settings.simboloMoneda,
        Number(this.settings.decimales)
      );

      await this.api.put('/api/user/profile', {
        foto: this.selectedPhoto(),
        settings: this.settings
      });

      this.auth.updatePhoto(this.selectedPhoto());
      this.saving.set(false);
      this.notification.show({
        type: 'success',
        message: `Configuración y perfil guardados con éxito.`
      });
    } catch (e) {
      this.saving.set(false);
      this.notification.show({
        type: 'error',
        message: 'Error al persistir configuración en el servidor.'
      });
    }
  }

  async testConnection(): Promise<void> {
    this.testingApi.set(true);
    const start = performance.now();
    try {
      await this.api.get('/api/expenses');
      const elapsed = Math.round(performance.now() - start);
      this.testingApi.set(false);
      this.notification.show({
        type: 'success',
        message: `Servidor Vought Core en línea (Latencia: ${elapsed}ms). MongoDB operativo.`
      });
    } catch {
      this.testingApi.set(false);
      this.notification.show({
        type: 'error',
        message: 'No se pudo contactar al servidor Vought Core.'
      });
    }
  }

  async resetAllExpenses(): Promise<void> {
    if (confirm('¿Seguro que deseas eliminar TODOS los movimientos de la base de datos? Esta acción es irreversible.')) {
      try {
        await this.api.delete('/api/expenses');
        this.notification.show({
          type: 'success',
          message: 'Todos los movimientos fueron eliminados de la base de datos.'
        });
      } catch {
        this.notification.show({
          type: 'error',
          message: 'Error eliminando registros de la base de datos.'
        });
      }
    }
  }
}
