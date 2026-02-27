import { Component } from '@angular/core';
import { QuickAction } from '../../shared/quick-action/quick-action';
import { Modal } from '../../shared/modal/modal';
@Component({
  selector: 'app-dashboard',
  imports: [QuickAction, Modal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {

  modalMovimientoAbierto = false;

  abrirModalMovimiento() {
    this.modalMovimientoAbierto = true;
  }

  cerrarModalMovimiento() {
    this.modalMovimientoAbierto = false;
  }

}
