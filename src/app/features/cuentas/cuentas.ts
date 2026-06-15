import { ChangeDetectorRef, Component } from '@angular/core';
import { QuickAction } from "../../shared/quick-action/quick-action";
import { CrearCuentaModal } from '../components/crear-cuenta-modal/crear-cuenta-modal';
import { AccountCard } from '../../shared/account-card/account-card';
import { CuentasService } from '../../core/services/cuentas.service';

@Component({
  selector: 'app-cuentas',
  imports: [QuickAction, CrearCuentaModal, AccountCard],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas {
[x: string]: any;

  constructor(
    private cuentasService: CuentasService,
    private cd: ChangeDetectorRef
  ) { }

  cuentas: any[] = []
  modalAbierto = false;

  abrirModalCrearCuenta() {
    this.modalAbierto = true;
  }

  cerrarModalCrearCuenta() {
    this.modalAbierto = false;
  }

  ngOnInit() {
    this.cargarCuentas()

    // escucha cuando se crea un movimiento
    this.cuentasService.refreshBalanceObservable$
      .subscribe(() => {
        this.cargarCuentas()
      })

  }

  cargarCuentas() {
    this.cuentasService.consultarCuentas().subscribe((res: any) => {
      this.cuentas = res;
      this.cd.detectChanges()

    })
  }
}
