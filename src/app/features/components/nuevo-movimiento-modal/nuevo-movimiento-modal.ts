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
  @Output() closed = new EventEmitter<void>();
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
  cuentas: { id: string; nombre: string; }[] = [];

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
    descripcion: false,
    fecha: false
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();

      this.movimientosService.consultarEtiquetas().subscribe((res: any) => {
        this.etiquetasDisponibles = res;
      });

      this.movimientosService.consultarTiposMovimiento().subscribe((res: any) => {
        this.tiposMovimiento = res;
      });

      this.cuentasService.consultarCuentasActivas().subscribe((res: any) => {
        this.cuentas = res;

        const cuentaEfectivo = this.cuentas.find(c => c.nombre === 'Efectivo');

        if (cuentaEfectivo) {
          this.movimiento.cuenta = cuentaEfectivo.id;
        }

        this.cd.detectChanges();
      });

      setTimeout(() => this.initDatepicker(), 100);
    }
  }

  soloNumeros(event: any) {
    // Obtenemos el valor actual del input
    const valor = event.target.value;

    // Reemplazamos todo lo que NO sea número (0-9) o punto decimal (.)
    // Si no quieres decimales, usa: /[^0-9]/g
    const limpio = valor.replace(/[^0-9.]/g, '');

    // Actualizamos tanto el input visual como el modelo de Angular
    this.movimiento.monto = limpio;
    event.target.value = limpio;
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

    // Validaciones manuales usando el objeto movimiento
    const errores = {
      tipoMovimiento: this.movimiento.tipoMovimiento === 0,
      monto: this.movimiento.monto <= 0,
      descripcion: this.movimiento.descripcion.trim() === '',
      fecha: !this.movimiento.fecha,
      cuenta: !this.movimiento.cuenta
    }

    if (campo) {
      // Si mandamos un campo, solo actualizamos ese error específico
      erroresActuales[campo] = errores[campo]
    } else {
      // Si no mandamos nada, actualizamos todos los errores (para el botón Guardar)
      Object.assign(erroresActuales, errores)
    }

    this.erroresValidacion.set(erroresActuales)

    return Object.values(erroresActuales).some(v => v)
  }

  isloading = signal(false);

  guardar() {

    if (this.isloading()) return;

    this.isloading.set(true);

    const tieneErrores = this.validarErrores()
    if (tieneErrores) this.isloading.set(false);

    if (!tieneErrores) {
      this.movimiento.etiquetas = this.etiquetasSeleccionadas.map(e => e.id) as any;
      this.movimiento.monto = Number(this.movimiento.tipoMovimiento) === 2 ? Number(this.movimiento.monto) * -1 : Number(this.movimiento.monto);

      this.movimientosService.crearMovimiento(this.movimiento)
      .pipe(
        finalize(() => {
          this.isloading.set(false);
        })
      ).subscribe({
        next: (res: any) => {

          this.toastService.show(res.message, 'success');
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
