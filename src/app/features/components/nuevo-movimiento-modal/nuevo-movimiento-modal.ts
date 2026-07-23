import { ChangeDetectorRef, Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/modal/modal';
import { CommonModule } from '@angular/common';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { CuentasService } from '../../../core/services/cuentas.service';

@Component({
  selector: 'app-nuevo-movimiento-modal',
  standalone: true,
  imports: [Modal, FormsModule, CommonModule],
  templateUrl: './nuevo-movimiento-modal.html',
})
export class NuevoMovimientoModal implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() movimientoEditar: any | null = null;
  @Input() cuentaInicialId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @ViewChild('datepicker') datepickerInput!: ElementRef;

  constructor(
    private movimientosService: MovimientosService,
    private toastService:ToastService,
    private cuentasService: CuentasService,
    private cd: ChangeDetectorRef
  ) { }

  // Etiquetas
  etiquetasDisponibles: { id: number; nombre: string; color: string }[] = [];

  etiquetasSeleccionadas: { id: number; nombre: string; color: string }[] = [];
  busquedaEtiqueta = '';
  mostrarDropdownEtiquetas = false;

  get etiquetasFiltradas() {
    return this.etiquetasDisponibles.filter(e =>
      !this.etiquetasSeleccionadas.find(s => s.id === e.id) &&
      e.nombre.toLowerCase().includes(this.busquedaEtiqueta.toLowerCase())
    );
  }

  agregarEtiqueta(etiqueta: { id: number; nombre: string; color: string }) {
    if (!this.etiquetasSeleccionadas.find(e => e.id === etiqueta.id)) {
      this.etiquetasSeleccionadas = [...this.etiquetasSeleccionadas, etiqueta];
    }
    this.busquedaEtiqueta = '';
  }

  quitarEtiqueta(etiqueta: { id: number; nombre: string; color: string }) {
    this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter(e => e.id !== etiqueta.id);
  }

  onBlurEtiqueta() {
    setTimeout(() => {
      this.mostrarDropdownEtiquetas = false;
      this.busquedaEtiqueta = '';
    }, 150);
  }

  // Listas para los selects
  tiposMovimiento: { id: number; movimiento: string }[] = [];
  cuentas: {
    id: string;
    nombre: string;
    tipo: string;
    saldo_actual: number;
    limite_credito?: number | string | null;
  }[] = [];

  // Objeto único para ngModel
  movimiento = {
    tipoMovimiento: 0,
    cuenta: '0',
    etiquetas: [],
    monto: 0,
    descripcion: '',
    notas: '',
    fecha: ''
  };

  erroresValidacion = signal({
    tipoMovimiento: false,
    cuenta: false,
    monto: false,
    saldoInsuficiente: false,
    descripcion: false,
    fecha: false
  });

  get cuentaSeleccionada() {
    return this.cuentas.find(cuenta => cuenta.id === this.movimiento.cuenta);
  }

  get esEgreso() {
    return Number(this.movimiento.tipoMovimiento) === 2;
  }

  get editando() {
    return !!this.movimientoEditar;
  }

  saldoMostradoCuenta(cuenta: {
    tipo: string;
    saldo_actual: number;
    limite_credito?: number | string | null;
  }): number {
    const saldoActual = this.toNumber(cuenta.saldo_actual);

    if (cuenta.tipo === 'CREDITO') {
      const limiteCredito = this.toNumber(cuenta.limite_credito);

      return Math.max(limiteCredito + Math.min(saldoActual, 0), 0);
    }

    return saldoActual;
  }

  etiquetaSaldoCuenta(cuenta: {
    tipo: string;
    saldo_actual: number;
    limite_credito?: number | string | null;
  }): string {
    return cuenta.tipo === 'CREDITO' ? 'Disponible' : 'Saldo';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();

      this.movimientosService.consultarEtiquetas().subscribe((res: any) => {
        this.etiquetasDisponibles = res;
        this.precargarEtiquetasEdicion();
      });

      this.movimientosService.consultarTiposMovimiento().subscribe((res: any) => {
        this.tiposMovimiento = res;
      });

      this.cuentasService.consultarCuentasActivas().subscribe((res: any) => {
        this.cuentas = (Array.isArray(res) ? res : []).map((cuenta) => ({
          ...cuenta,
          saldo_actual: Number(cuenta.saldo_actual),
        }));

        const cuentaEfectivo = this.cuentas.find(c => c.nombre === 'Efectivo');

        if (this.editando) {
          this.movimiento.cuenta = String(
            this.movimientoEditar.id_cuenta ??
            this.movimientoEditar.cuenta_id ??
            this.cuentaInicialId ??
            ''
          );
        } else if (this.cuentaInicialId) {
          this.movimiento.cuenta = this.cuentaInicialId;
        } else if (cuentaEfectivo) {
          this.movimiento.cuenta = cuentaEfectivo.id;
        }

        this.cd.detectChanges();
      });

      setTimeout(() => this.initDatepicker(), 100);

      if (this.editando) {
        this.precargarMovimientoEdicion();
      }
    }
  }

  soloNumeros(event: any) {
    // Obtenemos el valor actual del input
    const valor = event.target.value;

    // Reemplazamos todo lo que NO sea número (0-9) o punto decimal (.)
    // Si no quieres decimales, usa: /[^0-9]/g
    const limpio = valor.replace(/[^0-9.]/g, '');

    // Actualizamos tanto el input visual como el modelo de Angular
    this.movimiento.monto = Number(limpio);
    event.target.value = limpio;
    this.validarErrores('monto');
  }

  private resetFormulario() {
    const now = new Date();
    const hoy = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

    // Reiniciamos el objeto directamente
    this.movimiento = {
      tipoMovimiento: 0,
      cuenta: '',
      etiquetas: [],
      monto: 0,
      descripcion: '',
      notas: '',
      fecha: hoy
    };

    // Reiniciamos los errores visuales
    this.erroresValidacion.set({
      tipoMovimiento: false,
      cuenta: false,
      monto: false,
      saldoInsuficiente: false,
      descripcion: false,
      fecha: false
    });

    if (this.datepickerInput) {
      this.datepickerInput.nativeElement.value = hoy;
    }

    this.etiquetasSeleccionadas = [];
    this.busquedaEtiqueta = '';
    this.mostrarDropdownEtiquetas = false;
  }

  private precargarMovimientoEdicion() {
    if (!this.movimientoEditar) return;

    this.movimiento = {
      tipoMovimiento: Number(this.movimientoEditar.id_tipo_movimiento ?? 0),
      cuenta: String(
        this.movimientoEditar.id_cuenta ??
        this.movimientoEditar.cuenta_id ??
        this.cuentaInicialId ??
        ''
      ),
      etiquetas: [],
      monto: Math.abs(Number(this.movimientoEditar.monto ?? 0)),
      descripcion: this.movimientoEditar.descripcion ?? '',
      notas: this.movimientoEditar.notas ?? '',
      fecha: this.formatearFechaFormulario(this.movimientoEditar.fecha)
    };

    this.precargarEtiquetasEdicion();
  }

  private precargarEtiquetasEdicion() {
    if (!this.movimientoEditar?.etiquetas?.length) return;

    this.etiquetasSeleccionadas = this.movimientoEditar.etiquetas.map((etiqueta: any) => {
      const etiquetaDisponible = this.etiquetasDisponibles.find(
        (item) => String(item.id) === String(etiqueta.id)
      );

      return etiquetaDisponible ?? etiqueta;
    });
  }

  private formatearFechaFormulario(fecha: string | null | undefined): string {
    if (!fecha) return this.movimiento.fecha;

    const [fechaBase] = fecha.split('T');
    const partes = fechaBase.includes('-') ? fechaBase.split('-') : fechaBase.split('/');

    if (partes.length !== 3) return fecha;

    return `${partes[0]}/${partes[1].padStart(2, '0')}/${partes[2].padStart(2, '0')}`;
  }

  private initDatepicker() {
    if (typeof window !== 'undefined' && this.datepickerInput) {
      const Datepicker = (window as any).Datepicker;
      if (Datepicker) {
        new Datepicker(this.datepickerInput.nativeElement, {
          autohide: true,
          format: 'yyyy/mm/dd',
        });

        this.datepickerInput.nativeElement.addEventListener('changeDate', (e: any) => {
          // Actualizamos la variable del objeto manualmente
          this.movimiento.fecha = e.target.value;
          this.validarErrores('fecha');
        });
      }
    }
  }

  validarErrores(campo?: 'tipoMovimiento' | 'monto' | 'descripcion' | 'fecha' | 'cuenta') {
    const erroresActuales = { ...this.erroresValidacion() }
    const monto = Number(this.movimiento.monto);
    const saldoDisponible = this.cuentaSeleccionada ? this.saldoMostradoCuenta(this.cuentaSeleccionada) : 0;

    // Validaciones manuales usando el objeto movimiento
    const errores = {
      tipoMovimiento: Number(this.movimiento.tipoMovimiento) === 0,
      monto: !Number.isFinite(monto) || monto <= 0,
      saldoInsuficiente: !this.editando && !!this.movimiento.cuenta && this.esEgreso && Number.isFinite(monto) && monto > saldoDisponible,
      descripcion: this.movimiento.descripcion.trim() === '',
      fecha: !this.movimiento.fecha,
      cuenta: !this.movimiento.cuenta
    }

    if (campo) {
      // Si mandamos un campo, solo actualizamos ese error específico
      erroresActuales[campo] = errores[campo]
      erroresActuales.saldoInsuficiente = errores.saldoInsuficiente
    } else {
      // Si no mandamos nada, actualizamos todos los errores (para el botón Guardar)
      Object.assign(erroresActuales, errores)
    }

    this.erroresValidacion.set(erroresActuales)

    return Object.values(erroresActuales).some(v => v)
  }

  private toNumber(valor: number | string | null | undefined): number {
    const numero = Number(valor ?? 0);

    return Number.isFinite(numero) ? numero : 0;
  }

  isloading = signal(false);

  guardar() {

    if (this.isloading()) return;

    this.isloading.set(true);

    const tieneErrores = this.validarErrores()
    if (tieneErrores) this.isloading.set(false);

    if (!tieneErrores) {
      const payload = {
        ...this.movimiento,
        etiquetas: this.etiquetasSeleccionadas.map(e => e.id),
        monto: Number(this.movimiento.tipoMovimiento) === 2 ? Math.abs(Number(this.movimiento.monto)) * -1 : Math.abs(Number(this.movimiento.monto))
      };

      const request$ = this.editando
        ? this.movimientosService.actualizarMovimiento(this.movimientoEditar.id, payload)
        : this.movimientosService.crearMovimiento(payload);

      request$
      .pipe(
        finalize(() => {
          this.isloading.set(false);
        })
      ).subscribe({
        next: (res: any) => {

          this.toastService.show(res.message, 'success');
          this.saved.emit();
          this.closed.emit();

        },
        error: (err) => {
          this.toastService.show(err.error.message, 'error');
        }
      });

    } else {
      console.log('Faltan campos por llenar');
    }
  }
}
