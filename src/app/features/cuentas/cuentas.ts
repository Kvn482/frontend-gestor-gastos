import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { QuickAction } from "../../shared/quick-action/quick-action";

@Component({
  selector: 'app-cuentas',
  imports: [QuickAction],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas {
  constructor(
    private authService: AuthService,
  ) {}

  modalMovimientoAbierto = false;

  abrirModalMovimiento() {
    this.modalMovimientoAbierto = true;
  }

  cerrarModalMovimiento() {
    this.modalMovimientoAbierto = false;
  }
}
