import { Component, inject, ViewChild, ElementRef, AfterViewInit, QueryList, ViewChildren, HostListener, OnDestroy } from '@angular/core';
import gsap from 'gsap';
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
export class LoginPageComponent implements AfterViewInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  private _mensajeError = '';
  get mensajeError() { return this._mensajeError; }
  set mensajeError(val: string) {
    this._mensajeError = val;
    if (val) {
      setTimeout(() => {
        gsap.fromTo('.api-error', 
          { y: -15, opacity: 0, scale: 0.95 }, 
          { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
        );
      }, 0); // Wait for Angular to render the @if block
    }
  }
  
  cargando = false;
  exito = false;
  shake = false;
  mostrarPassword = false;

  form = this.fb.group({
    usuario: ['', Validators.required],
    password: ['', Validators.required],
  });

  @ViewChild('bgVideo') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChildren('heroWords') heroWordsContainer!: QueryList<ElementRef>;
  @ViewChild('googleBtnContainer') googleBtnContainer!: ElementRef<HTMLElement>;

  private googleInitialized = false;

  heroContents = [
    {
      badge: 'Plataforma Activa',
      title: 'Optimiza tu',
      word: 'Trading',
      subtitle: 'La plataforma institucional definitiva para gestión de capital inteligente y análisis de mercados en tiempo real.'
    },
    {
      badge: 'Análisis Avanzado',
      title: 'Maximiza tus',
      word: 'Ganancias',
      subtitle: 'Herramientas de nivel profesional con datos en tiempo real y ejecución ultrarrápida.'
    },
    {
      badge: 'Seguridad Total',
      title: 'Protege tu',
      word: 'Portafolio',
      subtitle: 'Infraestructura de grado bancario para mantener tus activos seguros en todo momento.'
    }
  ];
  currentHeroIndex = 0;

  ngAfterViewInit() {
    this.initVideo();
    this.initTextAnimation();
    this.initCustomCursor();
    this.preRenderGoogleButton();
  }

  /**
   * Renderiza el botón oficial de Google en un contenedor oculto
   * apenas cargue el script de Google Identity Services, para que
   * el clic en nuestro botón personalizado abra el selector de
   * cuentas de Google al primer intento (One Tap suele ser suprimido
   * por el navegador).
   */
  private preRenderGoogleButton(): void {
    let attempts = 0;
    const tryInit = () => {
      if (this.googleInitialized || attempts >= 20) return;
      attempts++;
      if (!this.initGoogleButton()) {
        setTimeout(tryInit, 300);
      }
    };
    tryInit();
  }

  private initGoogleButton(): boolean {
    const google = (window as any).google;
    if (!google?.accounts?.id || !this.googleBtnContainer?.nativeElement) {
      return false;
    }
    if (!this.googleInitialized) {
      google.accounts.id.initialize({
        client_id: '3201301134-1sb2cjj5loq57otp2cub80n07usnm9oq.apps.googleusercontent.com',
        callback: (response: any) => this.handleGoogleCredential(response),
      });
      google.accounts.id.renderButton(this.googleBtnContainer.nativeElement, {
        theme: 'outline',
        size: 'large',
        width: 240,
        text: 'signin_with',
        shape: 'pill',
      });
      this.googleInitialized = true;
    }
    return true;
  }

  private handleGoogleCredential(response: any): void {
    if (response.credential) {
      this.auth.loginWithGoogle(response.credential).subscribe({
        next: (respuesta) => {
          this.cargando = false;
          this.exito = true;
          this.auth.guardarSesion(respuesta);
          setTimeout(() => this.router.navigate(['/gastos']), 900);
        },
        error: () => {
          this.cargando = false;
          this.mensajeError = 'Error al verificar la cuenta de Google';
        },
      });
    } else {
      this.cargando = false;
      this.mensajeError = 'No se recibió respuesta de Google';
    }
  }

  private initCustomCursor() {
    const cursor = document.querySelector('.custom-cursor') as HTMLElement;
    const follower = document.querySelector('.custom-cursor-follower') as HTMLElement;
    if (!cursor || !follower) return;

    // Para el anillo usamos gsap quickTo que es fluido
    const xToFollower = gsap.quickTo(follower, 'left', { duration: 0.35, ease: 'power3.out' });
    const yToFollower = gsap.quickTo(follower, 'top', { duration: 0.35, ease: 'power3.out' });

    window.addEventListener('mousemove', (e) => {
      // Usar JS nativo para el punto central garantiza latencia cero absoluta (soluciona el problema de que se trabe)
      cursor.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      
      xToFollower(e.clientX);
      yToFollower(e.clientY);
    });

    // Efecto hover magnético
    const interactables = document.querySelectorAll('button, a, input, .word');
    interactables.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        follower.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        follower.classList.remove('hovering');
      });
    });
  }

  private initTextAnimation() {
    // Timeline de entrada escalonada para todos los elementos del hero
    const entranceTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    entranceTl
      .to('.hero-badge', {
        opacity: 1,
        y: 0,
        duration: 0.8,
      })
      .to('.hero-line', {
        opacity: 1,
        y: 0,
        duration: 0.8,
      }, '-=0.4')
      .to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 0.8,
      }, '-=0.4')
      .to('.hero-stats', {
        opacity: 1,
        y: 0,
        duration: 0.8,
      }, '-=0.3');

    // Timeline de rotación de TODO el texto (título, palabra, subtítulo, badge)
    setInterval(() => {
      const elementsToFade = ['.hero-badge', '.hero-line', '.hero-words', '.hero-subtitle'];
      
      gsap.to(elementsToFade, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.in',
        onComplete: () => {
          this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroContents.length;
          // Forzar la detección de cambios para Angular si es necesario, pero setInterval lo hace.
          // Restablecemos la posición inicial y animamos de entrada
          gsap.set(elementsToFade, { y: 20 });
          gsap.to(elementsToFade, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out'
          });
        }
      });
    }, 4500);

    // Animar los números de las estadísticas con un efecto de conteo
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((el) => {
      gsap.from(el, {
        textContent: '0',
        duration: 2,
        delay: 1.2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        onUpdate: function() {
          // Mantener el texto original ya que no son solo números
        }
      });
      gsap.from(el, {
        opacity: 0,
        y: 15,
        duration: 0.8,
        delay: 1,
        ease: 'power3.out',
        stagger: 0.15,
      });
    });
  }

  private initVideo() {
    if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      
      // Asegurar explícitamente desde JS que está muteado (a veces el atributo HTML es ignorado al refrescar)
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      
      const playVideo = () => {
        video.play().catch(error => {
          console.warn('El autoplay fue bloqueado. Reintentando...', error);
          // Si falla, intentamos de nuevo en 1 segundo
          setTimeout(() => video.play().catch(e => console.error(e)), 1000);
        });
      };

      // Intentar reproducir inmediatamente
      playVideo();

      // Asegurar que se reproduzca cuando los datos estén listos
      video.addEventListener('loadeddata', playVideo);
      video.addEventListener('canplay', playVideo);
    }
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
        setTimeout(() => this.router.navigate(['/gastos']), 900);
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Usuario o contraseña incorrectos';
      },
    });
  }

  loginGoogle(): void {
    this.mensajeError = '';

    if (!this.initGoogleButton()) {
      this.mensajeError = 'Error cargando Google Sign-In. Recarga la página.';
      return;
    }

    // Disparamos el clic sobre el botón oficial de Google (renderizado oculto)
    // para que se abra el selector de cuentas con un solo toque del usuario.
    const botonGoogle = this.googleBtnContainer.nativeElement.querySelector(
      'div[role="button"], button, div[tabindex]'
    ) as HTMLElement | null;

    if (botonGoogle) {
      botonGoogle.click();
      return;
    }

    // Respaldo: intentar One Tap si el botón oculto aún no está listo.
    this.cargando = true;
    (window as any).google.accounts.id.prompt();
  }
}