import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';
import { environment } from '../../../environments/environment';

import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { getCategoryIconName } from '../../shared/utils/category-icons';

export type TemaOpcion = 'oscuro' | 'claro' | 'sistema';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIcon, CurrencyPipe],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private cuentasService = inject(CuentasService);

  constructor(
    public authService: AuthService,
    public movimientosService: MovimientosService,
    public toastService: ToastService,
    public cd: ChangeDetectorRef,
  ) {}

  // Versión de la app
  appVersion = environment.appVersion;

  // Estados de modales
  modalContrasenaAbierto = false;
  modalMonedaAbierto = false;
  modalTemaAbierto = false;
  modalInfoAbierto = false;

  // Movimientos Frecuentes
  modalFrecuentesAbierto = false;
  cargandoFrecuentes = false;
  guardandoFrecuente = false;
  vistaFrecuentes: 'lista' | 'formulario' = 'lista';
  editandoFrecuenteId: number | string | null = null;
  movimientosFrecuentes: any[] = [];

  frecuenteForm = {
    nombre: '',
    tipoMovimiento: 2, // 2 = Gasto, 1 = Ingreso
    monto: '' as number | string,
    cuenta: '',
    categoria: null as any,
  };

  cuentasFrecuentes: any[] = [];
  categoriasFrecuentes: any[] = [];
  mostrarSelectorCategoriasFrecuente = false;
  busquedaCategoriaFrecuente = '';

  infoModalTitulo = '';
  infoModalDescripcion = '';

  // Perfil
  perfil = { nombre: '', apellido: '', email: '' };

  // Avatar
  avatarPreview: string | null = null;

  // Contraseña
  contrasena = { actual: '', nueva: '', confirmar: '' };
  cargandoContrasena = false;
  mostrarContrasenaActual = false;
  mostrarContrasenaNueva = false;
  mostrarContrasenaConfirmar = false;

  // Preferencias
  idiomaActual = 'Español';
  temaActual: TemaOpcion = 'oscuro';
  monedaActual = 'USD';
  exportandoCSV = false;

  opcionesMoneda = [
    { codigo: 'USD', nombre: 'USD - Dólar Estadounidense', simbolo: '$', bandera: '🇺🇸' },
    { codigo: 'EUR', nombre: 'EUR - Euro', simbolo: '€', bandera: '🇪🇺' },
    { codigo: 'MXN', nombre: 'MXN - Peso Mexicano', simbolo: '$', bandera: '🇲🇽' },
    { codigo: 'COP', nombre: 'COP - Peso Colombiano', simbolo: '$', bandera: '🇨🇴' },
    { codigo: 'ARS', nombre: 'ARS - Peso Argentino', simbolo: '$', bandera: '🇦🇷' },
    { codigo: 'CLP', nombre: 'CLP - Peso Chileno', simbolo: '$', bandera: '🇨🇱' },
  ];

  @HostListener('window:keydown.escape')
  onEscapeKey() {
    if (this.mostrarSelectorCategoriasFrecuente) {
      this.mostrarSelectorCategoriasFrecuente = false;
      return;
    }
    if (this.modalFrecuentesAbierto && this.vistaFrecuentes === 'formulario') {
      this.vistaFrecuentes = 'lista';
      return;
    }
    this.cerrarModalFrecuentes();
    this.cerrarModalContrasena();
    this.modalMonedaAbierto = false;
    this.modalTemaAbierto = false;
    this.modalInfoAbierto = false;
  }

  ngOnInit() {
    const currentUser = this.authService.getCurrentUser();
    this.perfil.nombre = currentUser?.nombre || '';
    this.perfil.apellido = currentUser?.apellido || '';
    this.perfil.email = currentUser?.email || '';
    this.avatarPreview = localStorage.getItem('avatarOverride') || currentUser?.avatar || null;

    // Sincronizar perfil con datos frescos del backend
    this.authService
      .getPerfil()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (perfilBackend) => {
          if (perfilBackend?.nombre) {
            this.perfil.nombre = perfilBackend.nombre;
            this.perfil.apellido = perfilBackend.apellido || '';
            this.perfil.email = perfilBackend.email || this.perfil.email;
          }
          if (perfilBackend?.avatar_url) {
            this.avatarPreview = perfilBackend.avatar_url;
            localStorage.setItem('avatarOverride', perfilBackend.avatar_url);
          }
          this.cd.detectChanges();
        },
        error: () => {},
      });

    // Escuchar actualizaciones reactivas de perfil y avatar
    this.authService.perfilActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ nombre, apellido }) => {
        this.perfil.nombre = nombre;
        this.perfil.apellido = apellido;
        this.cd.detectChanges();
      });

    this.authService.avatarActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((avatarUrl) => {
        this.avatarPreview = avatarUrl || null;
        this.cd.detectChanges();
      });

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
  }

  get nombreCompleto(): string {
    const completo = `${this.perfil.nombre} ${this.perfil.apellido}`.trim();
    return completo || 'Usuario';
  }

  get iniciales(): string {
    const n = this.perfil.nombre?.trim().charAt(0).toUpperCase() || '';
    const a = this.perfil.apellido?.trim().charAt(0).toUpperCase() || '';
    return n || a ? `${n}${a}` : 'U';
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

          try {
            const headers = ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Cuenta', 'Etiquetas', 'Notas'];
            const csvRows = [headers.join(',')];

            for (const m of lista) {
              let fecha = '';
              if (m.fecha) {
                const d = new Date(m.fecha);
                fecha = isNaN(d.getTime()) ? String(m.fecha).slice(0, 10) : d.toISOString().slice(0, 10);
              }
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
          } catch (_) {
            this.toastService.show('Error al procesar el archivo CSV', 'error');
          }
          this.cd.detectChanges();
        },
        error: () => {
          this.exportandoCSV = false;
          this.toastService.show('Error al descargar los datos de movimientos', 'error');
          this.cd.detectChanges();
        },
      });
  }

  // ----- Contraseña Modal Controls -----
  abrirModalContrasena() {
    this.contrasena = { actual: '', nueva: '', confirmar: '' };
    this.mostrarContrasenaActual = false;
    this.mostrarContrasenaNueva = false;
    this.mostrarContrasenaConfirmar = false;
    this.modalContrasenaAbierto = true;
  }

  cerrarModalContrasena() {
    this.modalContrasenaAbierto = false;
    this.contrasena = { actual: '', nueva: '', confirmar: '' };
    this.mostrarContrasenaActual = false;
    this.mostrarContrasenaNueva = false;
    this.mostrarContrasenaConfirmar = false;
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
          this.cargandoContrasena = false;
          this.cerrarModalContrasena();
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




  // ----- Modales informativos -----
  abrirInfoModal(tipo: 'terminos' | 'privacidad' | 'frecuentes' | 'programados') {
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
    }
    this.modalInfoAbierto = true;
  }

  getIconName(icono?: string | null): string {
    return getCategoryIconName(icono);
  }

  get categoriasFrecuentesFiltradas(): any[] {
    const q = this.busquedaCategoriaFrecuente.trim().toLowerCase();
    if (!q) return this.categoriasFrecuentes;
    return this.categoriasFrecuentes.filter((cat) =>
      (cat.nombre || cat.categoria || '').toLowerCase().includes(q)
    );
  }

  get cuentaFrecuenteSeleccionada() {
    return this.cuentasFrecuentes.find((c) => String(c.id) === String(this.frecuenteForm.cuenta));
  }

  abrirMovimientosFrecuentes() {
    this.modalFrecuentesAbierto = true;
    this.vistaFrecuentes = 'lista';
    this.editandoFrecuenteId = null;
    this.mostrarSelectorCategoriasFrecuente = false;
    this.cargarMovimientosFrecuentes();
    this.cargarCatalogosFrecuentes();
  }

  cerrarModalFrecuentes() {
    this.modalFrecuentesAbierto = false;
    this.vistaFrecuentes = 'lista';
    this.mostrarSelectorCategoriasFrecuente = false;
    this.editandoFrecuenteId = null;
  }

  cargarMovimientosFrecuentes() {
    this.cargandoFrecuentes = true;
    this.movimientosService.consultarMovimientosRapidos().subscribe({
      next: (res) => {
        this.movimientosFrecuentes = Array.isArray(res) ? res : [];
        this.cargandoFrecuentes = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.cargandoFrecuentes = false;
        this.toastService.show('Error al cargar movimientos frecuentes', 'error');
        this.cd.detectChanges();
      },
    });
  }

  cargarCatalogosFrecuentes() {
    if (this.cuentasFrecuentes.length === 0) {
      this.cuentasService.consultarCuentasActivas().subscribe({
        next: (res: any) => {
          this.cuentasFrecuentes = Array.isArray(res) ? res : [];
          this.cd.detectChanges();
        },
      });
    }
    if (this.categoriasFrecuentes.length === 0) {
      this.movimientosService.consultarEtiquetas().subscribe({
        next: (res: any) => {
          this.categoriasFrecuentes = Array.isArray(res) ? res : [];
          this.cd.detectChanges();
        },
      });
    }
  }

  abrirCrearFrecuente() {
    this.editandoFrecuenteId = null;
    this.frecuenteForm = {
      nombre: '',
      tipoMovimiento: 2,
      monto: '',
      cuenta: '',
      categoria: null,
    };
    this.mostrarSelectorCategoriasFrecuente = false;
    this.busquedaCategoriaFrecuente = '';
    this.vistaFrecuentes = 'formulario';
    this.cd.detectChanges();
  }

  abrirEditarFrecuente(m: any) {
    this.editandoFrecuenteId = m.id;
    const cat = this.categoriasFrecuentes.find((c) => String(c.id) === String(m.categoriaId)) || {
      id: m.categoriaId,
      nombre: m.categoriaNombre,
      color: m.categoriaColor,
      icono: m.categoriaIcono,
    };

    this.frecuenteForm = {
      nombre: m.nombre,
      tipoMovimiento: Number(m.tipoMovimiento) || 2,
      monto: Math.abs(Number(m.monto)),
      cuenta: String(m.cuentaId || (this.cuentasFrecuentes.length > 0 ? this.cuentasFrecuentes[0].id : '')),
      categoria: cat,
    };
    this.mostrarSelectorCategoriasFrecuente = false;
    this.busquedaCategoriaFrecuente = '';
    this.vistaFrecuentes = 'formulario';
    this.cd.detectChanges();
  }

  volverAListaFrecuentes() {
    this.vistaFrecuentes = 'lista';
    this.mostrarSelectorCategoriasFrecuente = false;
    this.editandoFrecuenteId = null;
    this.cd.detectChanges();
  }

  abrirSelectorCategoriasFrecuente() {
    this.mostrarSelectorCategoriasFrecuente = true;
    this.busquedaCategoriaFrecuente = '';
  }

  cerrarSelectorCategoriasFrecuente() {
    this.mostrarSelectorCategoriasFrecuente = false;
    this.busquedaCategoriaFrecuente = '';
  }

  seleccionarCategoriaFrecuente(cat: any) {
    this.frecuenteForm.categoria = cat;
    this.mostrarSelectorCategoriasFrecuente = false;
    this.busquedaCategoriaFrecuente = '';
    this.cd.detectChanges();
  }

  permitirSoloDigitosYPunto(event: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (event.key === '.' && !input.value.includes('.')) {
      return;
    }

    event.preventDefault();
  }

  soloNumerosFrecuente(event: Event) {
    const input = event.target as HTMLInputElement;
    let valor = input.value.replace(/[^0-9.]/g, '');
    const partes = valor.split('.');
    if (partes.length > 2) {
      valor = `${partes.shift()}.${partes.join('')}`;
    }
    if (valor.includes('.')) {
      const [entero, decimales] = valor.split('.');
      valor = `${entero}.${decimales.slice(0, 2)}`;
    }
    input.value = valor;
    this.frecuenteForm.monto = valor;
  }

  guardarFrecuente() {
    const nombre = this.frecuenteForm.nombre.trim();
    const monto = Number(this.frecuenteForm.monto);

    if (!nombre) {
      this.toastService.show('Ingresa un nombre para el movimiento frecuente', 'warning');
      return;
    }
    if (!monto || monto <= 0) {
      this.toastService.show('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }
    if (!this.frecuenteForm.categoria?.id) {
      this.toastService.show('Selecciona una etiqueta para el movimiento frecuente', 'warning');
      return;
    }
    if (!this.frecuenteForm.cuenta) {
      this.toastService.show('Selecciona una cuenta asociada', 'warning');
      return;
    }

    this.guardandoFrecuente = true;
    const payload = {
      nombre,
      tipoMovimiento: Number(this.frecuenteForm.tipoMovimiento),
      monto,
      cuentaId: Number(this.frecuenteForm.cuenta),
      categoriaId: Number(this.frecuenteForm.categoria.id),
      icono: this.frecuenteForm.categoria?.icono || 'tag',
      color: this.frecuenteForm.categoria?.color || '#6366f1',
    };

    if (this.editandoFrecuenteId) {
      this.movimientosService.actualizarMovimientoRapido(this.editandoFrecuenteId, payload).subscribe({
        next: () => {
          this.guardandoFrecuente = false;
          this.toastService.show('✓ Movimiento frecuente actualizado', 'success');
          this.vistaFrecuentes = 'lista';
          this.cargarMovimientosFrecuentes();
          this.cd.detectChanges();
        },
        error: (err) => {
          this.guardandoFrecuente = false;
          this.toastService.show(err?.error?.message || 'Error al actualizar', 'error');
          this.cd.detectChanges();
        },
      });
    } else {
      this.movimientosService.crearMovimientoRapido(payload).subscribe({
        next: () => {
          this.guardandoFrecuente = false;
          this.toastService.show('✓ Movimiento frecuente guardado', 'success');
          this.vistaFrecuentes = 'lista';
          this.cargarMovimientosFrecuentes();
          this.cd.detectChanges();
        },
        error: (err) => {
          this.guardandoFrecuente = false;
          this.toastService.show(err?.error?.message || 'Error al guardar', 'error');
          this.cd.detectChanges();
        },
      });
    }
  }

  async eliminarMovimientoFrecuente(id: number | string, event?: Event): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    const result = await Swal.fire({
      title: '¿Eliminar atajo frecuente?',
      text: 'Este atajo se eliminará de tu cuenta. No afectará tus transacciones ya registradas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.movimientosService.eliminarMovimientoRapido(id).subscribe({
      next: () => {
        this.movimientosFrecuentes = this.movimientosFrecuentes.filter((m) => String(m.id) !== String(id));
        this.toastService.show('Movimiento frecuente eliminado', 'warning');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Error al eliminar', 'error');
      },
    });
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
