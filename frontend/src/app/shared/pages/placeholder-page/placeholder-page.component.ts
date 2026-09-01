import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../../../features/transactions/components/sidebar/sidebar.component';
import { TopbarComponent } from '../../../features/transactions/components/topbar/topbar.component';

@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  template: `
    <app-sidebar #sidebar></app-sidebar>
    <div class="layout">
      <app-topbar (menuToggle)="sidebar.openMobileMenu()"></app-topbar>
      <main class="main-content" role="main">
        <div class="page-header">
          <div class="header-content">
            <h1 class="page-title">{{ title }}</h1>
            <p class="page-subtitle">Esta sección está en construcción. Pronto agregaremos las funcionalidades completas.</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      width: calc(100% - 258px);
      margin-left: 258px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .main-content {
      flex: 1;
      padding: 30px 34px 52px;
      animation: page-in 0.18s ease;
    }
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 22px;
      margin-bottom: 20px;
    }
    .page-title {
      margin-top: 7px;
      color: var(--text);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(27px, 2.2vw, 34px);
      line-height: 1.05;
      letter-spacing: -0.035em;
    }
    .page-subtitle {
      max-width: 760px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.55;
    }
    @keyframes page-in {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 900px) {
      .layout { width: 100%; margin-left: 0; }
      .main-content { padding: 24px 16px 40px; }
    }
    @media (max-width: 620px) {
      .main-content { padding: 20px 12px 48px; }
    }
  `]
})
export class PlaceholderPageComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] || 'Página en construcción';
}
