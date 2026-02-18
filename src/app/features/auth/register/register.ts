import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  nombre = '';
  username = '';
  email = '';
  password = '';

  errorMessage = signal('');
  successMessage = signal('');
  successRegister = signal(false);
  
  // Signals para validación
  erroresValidacion = signal({
    nombre: false,
    username: false,
    email: false,
    password: false
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  register() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.successRegister.set(false);
    
    // Validar que todos los campos estén llenos
    const errores = {
      nombre: !this.nombre.trim(),
      username: !this.username.trim(),
      email: !this.email.trim(),
      password: !this.password.trim()
    };
    
    this.erroresValidacion.set(errores);
    
    // Si hay errores, no enviar
    if (Object.values(errores).some(error => error)) {
      this.errorMessage.set('Por favor, completa todos los campos');
      return;
    }

    this.authService.register({
      nombre: this.nombre,
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {

        // this.successMessage.set('Registro exitoso. Revisa tu correo para verificar tu cuenta.');
        this.successRegister.set(true);

        // setTimeout(() => {
        //   this.router.navigate(['/login']);
        // }, 2000);
      },
      error: (err) => {
        if (err.error?.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Error al registrar usuario');
        }
      }
    });
  }
}
