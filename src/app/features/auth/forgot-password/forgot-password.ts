import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';
  darkMode = false;

  errorMessage = signal('');
  successMessage = signal('');
  emailSent = signal(false);

  isloading = signal(false);

  emailError = signal(false);

  constructor(private authService: AuthService) {
    this.darkMode = localStorage.getItem('theme') === 'dark';
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    if (this.darkMode) { document.documentElement.classList.add('dark'); }
    else { document.documentElement.classList.remove('dark'); }
  }

  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  sendResetLink() {
    if (this.isloading()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const hasEmailError = !this.email || !this.isValidEmail(this.email);
    this.emailError.set(hasEmailError);

    if (hasEmailError) {
      this.errorMessage.set('Por favor, ingresa un email válido');
      return;
    }

    this.isloading.set(true);

    this.authService.forgotPassword(this.email).pipe(
      finalize(() => this.isloading.set(false))
    ).subscribe({
      next: () => {
        this.emailSent.set(true);
        this.successMessage.set('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMessage.set(msg ?? 'Ocurrió un error. Inténtalo de nuevo.');
      }
    });
  }
}
