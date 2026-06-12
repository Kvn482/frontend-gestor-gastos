import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/modal/modal';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { CuentasService } from '../../../core/services/cuentas.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-crear-cuenta-modal',
  imports: [Modal, FormsModule, CommonModule],
  templateUrl: './crear-cuenta-modal.html',
  styleUrl: './crear-cuenta-modal.css',
})
export class CrearCuentaModal implements OnChanges {
  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();

  constructor(
    private toastService: ToastService,
    private cuentasService: CuentasService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormulario();
    }
  }

  // Objeto principal vinculado al ngModel
  cuenta = {
    nombre: '',
    tipo: 'DEBITO',
    saldo_inicial: 0,
    color: '#a855f7' // Morado Monetra por defecto
  };

  // Signal para los errores (ajusta según lo que uses en tu proyecto)
  erroresValidacion = signal({
    nombre: false
  });

  coloresDisponibles: string[] = [
    '#a855f7', '#3b82f6', '#22c55e', '#eab308',
    '#ef4444', '#f97316', '#06b6d4', '#ec4899'
  ];

  private resetFormulario() {
    // Reiniciamos el objeto directamente
    this.cuenta = {
      nombre: '',
      tipo: 'DEBITO',
      saldo_inicial: 0,
      color: '#a855f7' // Morado Monetra por defecto
    };

    // Reiniciamos los errores visuales
    this.erroresValidacion.set({
      nombre: false
    });
  }

  validarErrores(campo: string) {
    if (campo === 'nombre') {
      this.erroresValidacion.update(prev => ({
        ...prev,
        nombre: this.cuenta.nombre.trim().length === 0
      }));
    }
  }

  isloading = signal(false);

  crearCuenta() {

    if (this.isloading()) return;

    this.isloading.set(true);

    const tieneErrores = this.erroresValidacion().nombre;
    if (tieneErrores) this.isloading.set(false);

    if (!tieneErrores) {
      
      this.cuentasService.crearCuenta(this.cuenta)
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
