import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  mensajeError = '';
  cargando = false;
  exito = false;
  shake = false;
  mostrarPassword = false;

  form = this.fb.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required],
  });

  onMouseMove(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    target.style.setProperty('--my', `${event.clientY - rect.top}px`);
    document.documentElement.style.setProperty('--px', `${event.clientX}px`);
    document.documentElement.style.setProperty('--py', `${event.clientY}px`);
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.shake = true;
      setTimeout(() => (this.shake = false), 400);
      return;
    }

    const { usuario, password } = this.form.value;
    this.cargando = true;
    this.mensajeError = '';

    this.auth.login(usuario!, password!).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.exito = true;
        this.auth.guardarSesion(respuesta);
        setTimeout(() => this.router.navigate(['/notFound']), 900);
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Usuario o contraseña incorrectos';
      },
    });
  }
}