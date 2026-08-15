import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.css',
})
export class NotFoundPageComponent {
  private router = inject(Router);

  volverAlInicio(): void {
    this.router.navigate(['/login']);
  }
}