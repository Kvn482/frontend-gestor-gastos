import { Component, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { Modal } from '../../../shared/modal/modal';

@Component({
  selector: 'app-nuevo-movimiento-modal',
  imports: [Modal],
  templateUrl: './nuevo-movimiento-modal.html',
  styleUrl: './nuevo-movimiento-modal.css',
})
export class NuevoMovimientoModal {
  ngAfterViewInit(): void {
    // Inicialización del datepicker de Flowbite
    if (typeof window !== 'undefined' && (window as any).Datepicker) {
      const datepickerEl = document.getElementById('datepicker-autohide');
      if (datepickerEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Datepicker(datepickerEl);
      }
    }
  }

  @Input() isOpen: boolean = false;
  @Output() closed = new EventEmitter<void>();
}
