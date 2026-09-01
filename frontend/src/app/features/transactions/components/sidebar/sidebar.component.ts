import { Component, HostListener, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private router = inject(Router);

  activePage = signal<string>('resumen');
  isCollapsed = signal(false);
  isMobileMenuOpen = signal(false);
  logoFailed = signal(false);

  onLogoError(): void {
    this.logoFailed.set(true);
  }

  constructor() {
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects;
      const pageMap: Record<string, string> = {
        '/gastos': 'resumen',
        '/gastos/nuevo': 'gastos',
        '/ingresos': 'ingresos',
        '/presupuestos': 'presupuestos',
        '/categorias': 'categorias',
        '/movimientos': 'movimientos',
        '/reportes': 'reportes',
        '/configuracion': 'configuracion'
      };
      const page = pageMap[url] || 'resumen';
      this.activePage.set(page);
      this.closeMobileMenu();
    });
  }

  navigate(page: string): void {
    const routes: Record<string, string> = {
      resumen: '/gastos',
      gastos: '/gastos/nuevo',
      ingresos: '/ingresos',
      presupuestos: '/presupuestos',
      categorias: '/categorias',
      movimientos: '/movimientos',
      reportes: '/reportes',
      configuracion: '/configuracion'
    };
    this.router.navigate([routes[page] || '/gastos']);
    this.activePage.set(page);
    this.closeMobileMenu();
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }

  openMobileMenu(): void {
    this.isMobileMenuOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }



  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileMenu();
  }
}