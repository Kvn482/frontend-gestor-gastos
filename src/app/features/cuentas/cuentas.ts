import { Component } from '@angular/core';
import { QuickAction } from "../../shared/quick-action/quick-action";
import { CrearCuentaModal } from '../components/crear-cuenta-modal/crear-cuenta-modal';

@Component({
  selector: 'app-cuentas',
  imports: [QuickAction, CrearCuentaModal],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas {

  modalAbierto = false;

  abrirModalCrearCuenta() {
    this.modalAbierto = true;
  }

  cerrarModalCrearCuenta() {
    this.modalAbierto = false;
  }
}
