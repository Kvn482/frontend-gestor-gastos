import { Component, AfterViewInit } from '@angular/core';
import { QuickAction } from '../../shared/quick-action/quick-action';
import { NuevoMovimientoModal } from '../components/nuevo-movimiento-modal/nuevo-movimiento-modal';
import { BalanceGeneral } from '../../shared/balance-general/balance-general';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-dashboard',
  imports: [QuickAction, NuevoMovimientoModal, BalanceGeneral],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {
  constructor(
    private authService: AuthService,
  ) {}

  nombre = ''

  ngAfterViewInit(): void {
    // Inicialización del datepicker de Flowbite
    if (typeof window !== 'undefined' && (window as any).Datepicker) {
      const datepickerEl = document.getElementById('default-datepicker');
      if (datepickerEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Datepicker(datepickerEl);
      }
    }
  }

  ngOnInit() { // 3. Place your logic here
    const currentUser = this.authService.getCurrentUser();
    this.nombre = currentUser.nombre
  }

  modalMovimientoAbierto = false;

  abrirModalMovimiento() {
    this.modalMovimientoAbierto = true;
  }

  cerrarModalMovimiento() {
    this.modalMovimientoAbierto = false;
  }

}
