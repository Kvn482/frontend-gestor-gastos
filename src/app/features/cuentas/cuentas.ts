import { ChangeDetectorRef, Component } from '@angular/core';
import { QuickAction } from "../../shared/quick-action/quick-action";
import { CrearCuentaModal } from '../components/crear-cuenta-modal/crear-cuenta-modal';
import { AccountCard } from '../../shared/account-card/account-card';
import { CuentasService } from '../../core/services/cuentas.service';
import { ToastService } from '../../core/services/toast.service';
import { TransferirSaldo } from '../components/transferir-saldo/transferir-saldo';

@Component({
  selector: 'app-cuentas',
  imports: [QuickAction, CrearCuentaModal, TransferirSaldo, AccountCard],
  templateUrl: './cuentas.html',
  styleUrl: './cuentas.css',
})
export class Cuentas {
[x: string]: any;

  constructor(
    private cuentasService: CuentasService,
    private cd: ChangeDetectorRef,
    private toastService:ToastService
  ) { }

  cuentas: any[] = []
  modalAbierto = false;
  modalTransferenciaAbierto = false;
  cuentaOrigenTransferencia = '';

  abrirModalCrearCuenta() {
    this.modalAbierto = true;
  }

  cerrarModalCrearCuenta() {
    this.modalAbierto = false;
  }

  abrirModalTransferencia(idCuentaOrigen = '') {
    this.cuentaOrigenTransferencia = idCuentaOrigen;
    this.modalTransferenciaAbierto = true;
  }

  cerrarModalTransferencia() {
    this.modalTransferenciaAbierto = false;
    this.cuentaOrigenTransferencia = '';
  }

  ngOnInit() {
    this.cargarCuentas()

    // escucha cuando se crea un movimiento
    this.cuentasService.refreshBalanceObservable$
      .subscribe(() => {
        this.cargarCuentas()
      })

  }

  onAccountStatusChange(event: { id: string, status: number }) {
    const cuentaEnLista = this.cuentas.find(c => c.id === event.id);
    if (!cuentaEnLista) return;

    const statusAnterior = cuentaEnLista.status; 
    cuentaEnLista.status = event.status;

    this.cuentasService.updateStatus(event.id, event.status).subscribe({
      next: () => {
        // console.log('Status actualizado en servidor');
      },
      error: (err) => {
        // console.error('Error al actualizar', err);

        cuentaEnLista.status = statusAnterior;

        this.toastService.show('No se pudo actualizar el estado de la cuenta. Inténtalo de nuevo.', 'error');
        this.cd.detectChanges()
      }
    });
  }

  cargarCuentas() {
    this.cuentasService.consultarCuentas().subscribe((res: any) => {
      this.cuentas = res;
      this.cd.detectChanges()

    })
  }
}
