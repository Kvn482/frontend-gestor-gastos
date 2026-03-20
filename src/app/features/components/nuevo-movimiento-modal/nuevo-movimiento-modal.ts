import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/modal/modal';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MovimientosService } from '../../../core/services/movimientos.service';
import { finalize } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';

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
    private toastService:ToastService
  ) { }

  // Listas para los selects
  tiposMovimiento = [
    { id: 1, movimiento: 'Ingreso' },
    { id: 2, movimiento: 'Egreso' },
    { id: 3, movimiento: 'Transferencia' }
  ];

  categorias = [
    { id: 1, nombre: 'Comida' },
    { id: 2, nombre: 'Transporte' },
    { id: 3, nombre: 'Servicios' },
    { id: 4, nombre: 'Entretenimiento' }
  ];

  // Objeto único para ngModel
  movimiento = {
    tipoMovimiento: 0,
    categoria: 1,
    monto: 0,
    descripcion: '',
    fecha: ''
  };

  erroresValidacion = signal({
    tipoMovimiento: false,
    categoria: false,
    monto: false,
    descripcion: false,
    fecha: false
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();
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
    const hoy = new Date().toLocaleDateString('es-ES');

    // Reiniciamos el objeto directamente
    this.movimiento = {
      tipoMovimiento: 0,
      categoria: 0,
      monto: 0,
      descripcion: '',
      fecha: hoy
    };

    // Reiniciamos los errores visuales
    this.erroresValidacion.set({
      tipoMovimiento: false,
      categoria: false,
      monto: false,
      descripcion: false,
      fecha: false
    });

    if (this.datepickerInput) {
      this.datepickerInput.nativeElement.value = hoy;
    }
  }

  private initDatepicker() {
    if (typeof window !== 'undefined' && this.datepickerInput) {
      const Datepicker = (window as any).Datepicker;
      if (Datepicker) {
        new Datepicker(this.datepickerInput.nativeElement, {
          autohide: true,
          format: 'dd/mm/yyyy',
        });

        this.datepickerInput.nativeElement.addEventListener('changeDate', (e: any) => {
          // Actualizamos la variable del objeto manualmente
          this.movimiento.fecha = e.target.value;
          this.validarErrores('fecha');
        });
      }
    }
  }

  validarErrores(campo?: keyof typeof this.movimiento) {
    const erroresActuales = { ...this.erroresValidacion() }

    // Validaciones manuales usando el objeto movimiento
    const errores = {
      tipoMovimiento: this.movimiento.tipoMovimiento === 0,
      categoria: !this.movimiento.categoria,
      monto: this.movimiento.monto <= 0,
      descripcion: this.movimiento.descripcion.trim() === '',
      fecha: !this.movimiento.fecha
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
      console.log('Datos listos para enviar:', this.movimiento);

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
          this.toastService.show(err.error.message, 'danger');
        }
      });

    } else {
      console.log('Faltan campos por llenar');
    }
  }
}