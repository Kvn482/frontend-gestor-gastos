import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-resend-activation',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './resend-activation.html',
  styleUrl: './resend-activation.css',
})
export class ResendActivation {
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

  resendActivationMail() {
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
    this.authService.resendActivationMail(this.email).pipe(
      finalize(() => this.isloading.set(false))
    ).subscribe({
      next: () => {
        this.emailSent.set(true);
        this.successMessage.set('Si el email está registrado, recibirás un enlace para activar tu cuenta.');
      },
      error: (err) => {
        const msg = err?.error?.message;
        this.errorMessage.set(msg ?? 'Ocurrió un error. Inténtalo de nuevo.');
      }
    });
  }
}
