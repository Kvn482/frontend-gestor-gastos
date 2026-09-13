import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';
import { environment } from '../../../environments/environment';

export interface Etiqueta {
  id: number;
  nombre: string;
  color: string;
  id_usuario: number | null;
}

export type TemaOpcion = 'oscuro' | 'claro' | 'sistema';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  constructor(
    public authService: AuthService,
    public movimientosService: MovimientosService,
    public toastService: ToastService,
    public cd: ChangeDetectorRef,
  ) {}

  // Versión de la app
  appVersion = environment.appVersion;

  // Estados de modales
  modalPerfilAbierto = false;
  modalContrasenaAbierto = false;
  modalEtiquetasAbierto = false;
  modalMonedaAbierto = false;
  modalTemaAbierto = false;
  modalPeriodoAbierto = false;
  modalInfoAbierto = false;

  infoModalTitulo = '';
  infoModalDescripcion = '';

  // Perfil
  perfil = { nombre: '', apellido: '', email: '' };
  cargandoPerfil = false;

  // Avatar
  avatarPreview: string | null = null;
  archivoAvatar: File | null = null;

  // Contraseña
  contrasena = { actual: '', nueva: '', confirmar: '' };
  cargandoContrasena = false;
  mostrarContrasenaActual = false;
  mostrarContrasenaNueva = false;
  mostrarContrasenaConfirmar = false;

  // Etiquetas
  etiquetas: Etiqueta[] = [];
  nuevaEtiqueta = { nombre: '', color: '#6366f1' };
  creandoEtiqueta = false;

  coloresPredefinidos = [
    '#6366f1', '#4f46e5', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#64748b',
  ];

  // Preferencias
  idiomaActual = 'Español';
  temaActual: TemaOpcion = 'oscuro';
  monedaActual = 'USD';
  periodoPresupuesto = 'Mensual';
  safeToSpend = true;
  notificaciones = true;
  exportandoCSV = false;

  opcionesMoneda = [
    { codigo: 'USD', nombre: 'USD - Dólar Estadounidense', simbolo: '$', bandera: '🇺🇸' },
    { codigo: 'EUR', nombre: 'EUR - Euro', simbolo: '€', bandera: '🇪🇺' },
    { codigo: 'MXN', nombre: 'MXN - Peso Mexicano', simbolo: '$', bandera: '🇲🇽' },
    { codigo: 'COP', nombre: 'COP - Peso Colombiano', simbolo: '$', bandera: '🇨🇴' },
    { codigo: 'ARS', nombre: 'ARS - Peso Argentino', simbolo: '$', bandera: '🇦🇷' },
    { codigo: 'CLP', nombre: 'CLP - Peso Chileno', simbolo: '$', bandera: '🇨🇱' },
  ];

  opcionesPeriodo = [
    { valor: 'Mensual', descripcion: 'Reinicia el primer día de cada mes' },
    { valor: 'Quincenal', descripcion: 'Cada 15 días (quincena laboral)' },
    { valor: 'Semanal', descripcion: 'Cada lunes' },
  ];

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.perfil.nombre = currentUser?.nombre || '';
    this.perfil.apellido = currentUser?.apellido || '';
    this.perfil.email = currentUser?.email || '';
    this.avatarPreview = localStorage.getItem('avatarOverride') || currentUser?.avatar || null;

    // Cargar preferencias guardadas
    const themeStorage = localStorage.getItem('theme');
    const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    const systemPrefersDark = hasMatchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (themeStorage === 'dark') {
      this.temaActual = 'oscuro';
      document.documentElement.classList.add('dark');
    } else if (themeStorage === 'light') {
      this.temaActual = 'claro';
      document.documentElement.classList.remove('dark');
    } else {
      this.temaActual = 'sistema';
      if (systemPrefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    if (hasMatchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (this.temaActual === 'sistema') {
            if (e.matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
            this.cd.detectChanges();
          }
        });
      } catch (_) {}
    }

    this.monedaActual = localStorage.getItem('moneda') || 'USD';
    this.periodoPresupuesto = localStorage.getItem('periodo_presupuesto') || 'Mensual';
    this.safeToSpend = localStorage.getItem('safe_to_spend') !== 'false';
    this.notificaciones = localStorage.getItem('notificaciones_push') !== 'false';

    this.cargarEtiquetas();
  }

  get nombreCompleto(): string {
    const completo = `${this.perfil.nombre} ${this.perfil.apellido}`.trim();
    return completo || 'Usuario';
  }

  get temaActualLabel(): string {
    switch (this.temaActual) {
      case 'oscuro':
        return 'Oscuro';
      case 'claro':
        return 'Claro';
      case 'sistema':
        return 'Sistema';
      default:
        return 'Oscuro';
    }
  }

  get monedaActualData() {
    return this.opcionesMoneda.find((m) => m.codigo === this.monedaActual) || this.opcionesMoneda[0];
  }

  get etiquetasPredeterminadas(): Etiqueta[] {
    return this.etiquetas.filter((etiqueta) => !etiqueta.id_usuario);
  }

  get etiquetasUsuario(): Etiqueta[] {
    return this.etiquetas.filter((etiqueta) => etiqueta.id_usuario);
  }

  swatchShadow(color: string): string {
    if (this.nuevaEtiqueta.color === color) {
      return `0 0 0 2px #0f172a, 0 0 0 4px ${color}`;
    }
    return 'none';
  }

  mostrarInfoIdioma() {
    this.toastService.show('Monetra está configurado en Español actualmente', 'info');
  }

  // ----- Métodos de Preferencias -----
  seleccionarTema(tema: TemaOpcion) {
    this.temaActual = tema;
    if (tema === 'oscuro') {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    } else if (tema === 'claro') {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    } else {
      localStorage.setItem('theme', 'system');
      const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      const prefersDark = hasMatchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
    this.modalTemaAbierto = false;
    this.toastService.show(`Tema cambiado a ${this.temaActualLabel}`, 'success');
  }

  seleccionarMoneda(codigo: string) {
    this.monedaActual = codigo;
    localStorage.setItem('moneda', codigo);
    this.modalMonedaAbierto = false;
    this.toastService.show(`Moneda principal: ${codigo}`, 'success');
  }

  seleccionarPeriodo(periodo: string) {
    this.periodoPresupuesto = periodo;
    localStorage.setItem('periodo_presupuesto', periodo);
    this.modalPeriodoAbierto = false;
    this.toastService.show(`Período de presupuesto: ${periodo}`, 'success');
  }

  toggleSafeToSpend() {
    this.safeToSpend = !this.safeToSpend;
    localStorage.setItem('safe_to_spend', String(this.safeToSpend));
    this.toastService.show(
      this.safeToSpend ? 'Disponible para gastar visible en inicio' : 'Disponible para gastar ocultado',
      'info'
    );
  }

  toggleNotificaciones() {
    this.notificaciones = !this.notificaciones;
    localStorage.setItem('notificaciones_push', String(this.notificaciones));
    this.toastService.show(
      this.notificaciones ? 'Recordatorios y alertas activados' : 'Recordatorios y alertas pausados',
      'info'
    );
  }

  // ----- Exportar CSV -----
  exportarDatosCSV() {
    if (this.exportandoCSV) return;
    this.exportandoCSV = true;

    this.movimientosService
      .consultarMovimientos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.exportandoCSV = false;
          const lista: any[] = Array.isArray(res) ? res : res?.movimientos || [];

          if (!lista.length) {
            this.toastService.show('No hay movimientos registrados para exportar', 'info');
            this.cd.detectChanges();
            return;
          }

          const headers = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Cuenta', 'Etiquetas', 'Notas'];
          const csvRows = [headers.join(',')];

          for (const m of lista) {
            const fecha = m.fecha ? new Date(m.fecha).toISOString().slice(0, 10) : '';
            const desc = `"${(m.descripcion || '').toString().replace(/"/g, '""')}"`;
            const tipo = m.id_tipo_movimiento === 1 ? 'Ingreso' : 'Gasto';
            const monto = m.monto ?? 0;
            const cuenta = `"${(m.cuenta || m.tipo_cuenta || '').toString().replace(/"/g, '""')}"`;
            const etiqs = `"${(m.etiquetas || []).map((e: any) => e.nombre).join('; ')}"`;
            const notas = `"${(m.notas || '').toString().replace(/"/g, '""')}"`;

            csvRows.push([fecha, desc, tipo, monto, cuenta, etiqs, notas].join(','));
          }

          const csvString = '\uFEFF' + csvRows.join('\r\n');
          const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `monetra_movimientos_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          this.toastService.show('Reporte CSV descargado con éxito', 'success');
          this.cd.detectChanges();
        },
        error: () => {
          this.exportandoCSV = false;
          this.toastService.show('Error al descargar los datos de movimientos', 'error');
          this.cd.detectChanges();
        },
      });
  }

  // ----- Avatar -----
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
      this.toastService.show('La imagen no debe superar 2 MB', 'error');
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

  // ----- Perfil -----
  guardarPerfil() {
    if (!this.perfil.nombre.trim() || !this.perfil.apellido.trim()) {
      this.toastService.show('El nombre y apellido son requeridos', 'error');
      return;
    }
    this.cargandoPerfil = true;
    this.authService
      .actualizarPerfil({ nombre: this.perfil.nombre, apellido: this.perfil.apellido })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.authService.notificarActualizacionPerfil(this.perfil.nombre, this.perfil.apellido);
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
                  this.archivoAvatar = null;
                  this.cargandoPerfil = false;
                  this.modalPerfilAbierto = false;
                  this.cd.detectChanges();
                  this.toastService.show('Perfil actualizado correctamente', 'success');
                },
                error: (err) => {
                  this.cargandoPerfil = false;
                  this.cd.detectChanges();
                  this.toastService.show(err?.error?.message || 'Error al subir el avatar', 'error');
                },
              });
          } else {
            this.cargandoPerfil = false;
            this.modalPerfilAbierto = false;
            this.cd.detectChanges();
            this.toastService.show('Perfil actualizado correctamente', 'success');
          }
        },
        error: (err) => {
          this.cargandoPerfil = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al actualizar el perfil', 'error');
        },
      });
  }

  // ----- Contraseña -----
  cambiarContrasena() {
    if (!this.contrasena.actual) {
      this.toastService.show('Ingresa tu contraseña actual', 'error');
      return;
    }
    if (this.contrasena.nueva.length < 6) {
      this.toastService.show('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (this.contrasena.nueva !== this.contrasena.confirmar) {
      this.toastService.show('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    this.cargandoContrasena = true;
    this.authService
      .cambiarContrasena({
        contrasenaActual: this.contrasena.actual,
        nuevaContrasena: this.contrasena.nueva,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.contrasena = { actual: '', nueva: '', confirmar: '' };
          this.cargandoContrasena = false;
          this.modalContrasenaAbierto = false;
          this.cd.detectChanges();
          this.toastService.show('Contraseña actualizada correctamente', 'success');
        },
        error: (err) => {
          this.cargandoContrasena = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al cambiar la contraseña', 'error');
        },
      });
  }

  // ----- Etiquetas -----
  cargarEtiquetas() {
    this.movimientosService
      .consultarEtiquetas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.etiquetas = Array.isArray(res) ? res : [];
          this.cd.detectChanges();
        },
        error: () => {
          this.etiquetas = [];
          this.cd.detectChanges();
        },
      });
  }

  crearEtiqueta() {
    if (!this.nuevaEtiqueta.nombre.trim()) {
      this.toastService.show('El nombre de la etiqueta es requerido', 'error');
      return;
    }
    this.creandoEtiqueta = true;
    this.movimientosService
      .crearEtiqueta(this.nuevaEtiqueta)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (etiqueta: any) => {
          this.etiquetas = [...this.etiquetas, etiqueta];
          this.nuevaEtiqueta = { nombre: '', color: '#6366f1' };
          this.creandoEtiqueta = false;
          this.cd.detectChanges();
          this.toastService.show('Etiqueta creada correctamente', 'success');
        },
        error: (err) => {
          this.creandoEtiqueta = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al crear la etiqueta', 'error');
        },
      });
  }

  async eliminarEtiqueta(etiqueta: Etiqueta): Promise<void> {
    const result = await Swal.fire({
      title: 'Eliminar etiqueta',
      text: `La etiqueta "${etiqueta.nombre}" se eliminará de tus opciones personalizadas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.movimientosService
      .eliminarEtiqueta(etiqueta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.show('Etiqueta eliminada', 'success');
          this.etiquetas = this.etiquetas.filter((e) => e.id !== etiqueta.id);
          this.cd.detectChanges();
        },
        error: (err) =>
          this.toastService.show(err?.error?.message || 'Error al eliminar la etiqueta', 'error'),
      });
  }

  // ----- Modales informativos -----
  abrirInfoModal(tipo: 'terminos' | 'privacidad' | 'frecuentes' | 'programados' | 'backup' | 'acceso_rapido') {
    if (tipo === 'terminos') {
      this.infoModalTitulo = 'Términos de Servicio';
      this.infoModalDescripcion =
        'Monetra te permite organizar tus finanzas personales y movimientos contables de forma segura y privada. Todos los datos registrados pertenecen exclusivamente a tu cuenta.';
    } else if (tipo === 'privacidad') {
      this.infoModalTitulo = 'Política de Privacidad';
      this.infoModalDescripcion =
        'Tus datos financieros, cuentas y contraseñas están encriptados y protegidos. Monetra no comercializa tu información con terceros.';
    } else if (tipo === 'frecuentes') {
      this.infoModalTitulo = 'Movimientos Frecuentes';
      this.infoModalDescripcion =
        'Configura accesos directos para registrar tus gastos rutinarios (café, transporte, comida) en un solo toque desde el panel de inicio.';
    } else if (tipo === 'programados') {
      this.infoModalTitulo = 'Transacciones Programadas';
      this.infoModalDescripcion =
        'Planifica pagos periódicos como suscripciones, servicios o alquileres para que se registren automáticamente en tus balances.';
    } else if (tipo === 'backup') {
      this.infoModalTitulo = 'Copia de Seguridad y Restauración';
      this.infoModalDescripcion =
        'Tus movimientos se sincronizan en la nube. Puedes exportar en cualquier momento una copia local en formato CSV desde la sección de Exportar Datos.';
    } else if (tipo === 'acceso_rapido') {
      this.infoModalTitulo = 'Acceso Rápido';
      this.infoModalDescripcion =
        'Atajos directos para registrar movimientos rápidamente desde la barra de accesos o notificaciones de tu dispositivo.';
    }
    this.modalInfoAbierto = true;
  }

  // ----- Cerrar sesión / Eliminar datos -----
  async confirmarCerrarSesion(): Promise<void> {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Tu sesión actual se cerrará y deberás ingresar tus credenciales nuevamente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar sesión',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  conectarDesarrollador() {
    window.open('https://www.instagram.com/kevinacostaespinoza/', '_blank');
  }
}
