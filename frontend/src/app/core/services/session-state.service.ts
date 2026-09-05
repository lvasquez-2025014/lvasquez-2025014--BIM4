import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  readonly isExpired = signal(false);

  lockSession(): void {
    localStorage.removeItem('token');
    this.isExpired.set(true);
  }

  reset(): void {
    this.isExpired.set(false);
  }
}
