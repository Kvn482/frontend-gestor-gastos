import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cd = inject(ChangeDetectorRef);

  perfil = {
    nombre: '',
    apellido: '',
    email: '',
  };

  perfilOriginal = {
    nombre: '',
    apellido: '',
  };

  avatarPreview: string | null = null;
  archivoAvatar: File | null = null;
  cargando = false;
  guardadoExitoso = false;

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.perfil.nombre = currentUser?.nombre || '';
    this.perfil.apellido = currentUser?.apellido || '';
    this.perfil.email = currentUser?.email || '';
    this.perfilOriginal = {
      nombre: this.perfil.nombre,
      apellido: this.perfil.apellido,
    };
    this.avatarPreview = localStorage.getItem('avatarOverride') || currentUser?.avatar || null;

    // Sincronizar datos frescos del backend
    this.authService
      .getPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfilBackend) => {
          if (perfilBackend?.nombre) {
            const override = localStorage.getItem('perfilOverride');
            if (!override) {
              this.perfil.nombre = perfilBackend.nombre;
              this.perfil.apellido = perfilBackend.apellido || '';
              this.perfil.email = perfilBackend.email || this.perfil.email;
              this.perfilOriginal = {
                nombre: this.perfil.nombre,
                apellido: this.perfil.apellido,
              };
            }
          }
          if (perfilBackend?.avatar_url) {
            this.avatarPreview = perfilBackend.avatar_url;
            localStorage.setItem('avatarOverride', perfilBackend.avatar_url);
          }
          this.cd.detectChanges();
        },
        error: () => {},
      });

    // Suscripción reactiva a actualizaciones
    this.authService.perfilActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ nombre, apellido }) => {
        this.perfil.nombre = nombre;
        this.perfil.apellido = apellido;
        this.perfilOriginal = { nombre, apellido };
        this.cd.detectChanges();
      });

    this.authService.avatarActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((avatarUrl) => {
        this.avatarPreview = avatarUrl || null;
        this.cd.detectChanges();
      });
  }

  get nombreCompleto(): string {
    const n = `${this.perfil.nombre} ${this.perfil.apellido}`.trim();
    return n || 'Usuario';
  }

  get iniciales(): string {
    const n = this.perfil.nombre?.trim().charAt(0).toUpperCase() || '';
    const a = this.perfil.apellido?.trim().charAt(0).toUpperCase() || '';
    return n || a ? `${n}${a}` : 'U';
  }

  get hayCambios(): boolean {
    const nombreCambio = this.perfil.nombre.trim() !== this.perfilOriginal.nombre.trim();
    const apellidoCambio = this.perfil.apellido.trim() !== this.perfilOriginal.apellido.trim();
    const avatarCambio = this.archivoAvatar !== null;
    return nombreCambio || apellidoCambio || avatarCambio;
  }

  async volver() {
    if (this.hayCambios) {
      const result = await Swal.fire({
        title: '¿Descartar cambios?',
        text: 'Tienes modificaciones sin guardar que se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Descartar',
        cancelButtonText: 'Seguir editando',
        reverseButtons: true,
        customClass: monetraSweetAlertClasses,
        buttonsStyling: false,
      });

      if (!result.isConfirmed) return;
    }
    this.router.navigate(['/configuracion']);
  }

  seleccionarAvatar(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(archivo.type)) {
      this.toastService.show('Solo se permiten imágenes PNG, JPG o WEBP', 'error');
      input.value = '';
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (archivo.size > maxSize) {
      this.toastService.show('La imagen no debe superar los 2 MB', 'error');
      input.value = '';
      return;
    }

    this.archivoAvatar = archivo;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.avatarPreview = e.target?.result as string;
      this.cd.detectChanges();
    };
    reader.readAsDataURL(archivo);
  }

  guardarPerfil() {
    const nombre = this.perfil.nombre.trim();
    const apellido = this.perfil.apellido.trim();

    if (!nombre || !apellido) {
      this.toastService.show('El nombre y apellido son obligatorios', 'error');
      return;
    }

    this.cargando = true;
    this.guardadoExitoso = false;

    this.authService
      .actualizarPerfil({ nombre, apellido })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authService.notificarActualizacionPerfil(nombre, apellido);

          if (this.archivoAvatar) {
            const formData = new FormData();
            formData.append('avatar', this.archivoAvatar);
            this.authService
              .actualizarAvatar(formData)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (res: any) => {
                  const avatarUrl = res?.avatar_url || res?.avatar || res?.avatarUrl;
                  if (avatarUrl) {
                    this.authService.notificarActualizacionAvatar(avatarUrl);
                    this.avatarPreview = avatarUrl;
                  }
                  this.perfilOriginal = { nombre, apellido };
                  this.archivoAvatar = null;
                  this.cargando = false;
                  this.guardadoExitoso = true;
                  this.cd.detectChanges();
                  this.toastService.show('Perfil y foto actualizados correctamente', 'success');
                },
                error: (err) => {
                  this.cargando = false;
                  this.cd.detectChanges();
                  this.toastService.show(err?.error?.message || 'Error al subir la nueva foto', 'error');
                },
              });
          } else {
            this.perfilOriginal = { nombre, apellido };
            this.cargando = false;
            this.guardadoExitoso = true;
            this.cd.detectChanges();
            this.toastService.show('Perfil actualizado correctamente', 'success');
          }
        },
        error: (err) => {
          this.cargando = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al actualizar el perfil', 'error');
        },
      });
  }
}
