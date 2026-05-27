import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  password = '';
  confirmPassword = '';
  token = '';
  darkMode = false;

  errorMessage = signal('');
  successMessage = signal('');
  resetDone = signal(false);

  isloading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  erroresValidacion = signal({
    password: false,
    confirmPassword: false,
  });

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.darkMode = localStorage.getItem('theme') === 'dark';
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.errorMessage.set('El enlace de recuperación no es válido o ha expirado.');
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    if (this.darkMode) { document.documentElement.classList.add('dark'); }
    else { document.documentElement.classList.remove('dark'); }
  }

  resetPassword() {
    if (this.isloading()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const errores = {
      password: !this.password || this.password.length < 6,
      confirmPassword: this.password !== this.confirmPassword,
    };

    this.erroresValidacion.set(errores);

    if (Object.values(errores).some(e => e)) {
      this.errorMessage.set('Por favor, corrige los errores antes de continuar.');
      return;
    }

    this.isloading.set(true);

    this.authService.resetPassword(this.token, this.password).pipe(
      finalize(() => this.isloading.set(false))
    ).subscribe({
      next: () => {
        this.resetDone.set(true);
        this.successMessage.set('¡Contraseña restablecida con éxito!');
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMessage.set(msg ?? 'El enlace ha expirado o no es válido. Solicita uno nuevo.');
      }
    });
  }
}
