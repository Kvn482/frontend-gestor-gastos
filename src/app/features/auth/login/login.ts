import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  email = '';
  password = '';
  darkMode = false;

  errorMessage = signal('');
  successMessage = signal('');

  // Signals para validación
  erroresValidacion = signal({
    email: false,
    password: false
  });

  isloading = signal(false);
  showPassword = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
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

  login() {

    if (this.isloading()) return;

    this.isloading.set(true);

    this.errorMessage.set('');
    this.successMessage.set('');

    // Validar que todos los campos estén llenos
    const errores = {
      email: !this.email || !this.isValidEmail(this.email),
      password: !this.password.trim()
    };

    this.erroresValidacion.set(errores);

    // Si hay errores, no enviar
    if (Object.values(errores).some(error => error)) {
      this.errorMessage.set('Por favor, completa todos los campos');
      this.isloading.set(false);
      return;
    }

    this.authService.login({
      email: this.email,
      password: this.password
    }).pipe(
      finalize(() => {
        this.isloading.set(false);
      })
    ).subscribe({
      next: (res: any) => {

        this.authService.saveSession(res.accessToken, res.refreshToken);
        this.successMessage.set('Inicio de sesión exitoso.');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

        setTimeout(() => {
          this.router.navigate([returnUrl]);
        }, 800);

      },
      error: (err) => {
        if (err.error?.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Credenciales inválidas')
        }
      }
    });
  }
}
