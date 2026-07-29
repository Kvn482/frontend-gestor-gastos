import { ChangeDetectorRef, Component } from '@angular/core'
import { MovimientosService } from '../../core/services/movimientos.service'
import { CurrencyPipe } from '@angular/common'
import { formatearFechaLocal } from '../utils/fechas'
import { NuevoMovimientoModal } from '../../features/components/nuevo-movimiento-modal/nuevo-movimiento-modal'
import { TransferirSaldo } from '../../features/components/transferir-saldo/transferir-saldo'
import { MovimientoDetalleModal } from '../../features/components/movimiento-detalle-modal/movimiento-detalle-modal'
import { ToastService } from '../../core/services/toast.service'
import { finalize } from 'rxjs'
import Swal from 'sweetalert2'
import { monetraSweetAlertClasses } from '../utils/sweet-alert'

@Component({
  selector: 'app-ultimos-movimientos',
  standalone: true,
  imports: [CurrencyPipe, MovimientoDetalleModal, NuevoMovimientoModal, TransferirSaldo],
  templateUrl: './ultimos-movimientos.html',
  styleUrl: './ultimos-movimientos.css',
})
export class UltimosMovimientos {
  constructor(
    private movimientosService: MovimientosService,
    private toastService: ToastService,
    private cd: ChangeDetectorRef
  ) { }

  movimientos: any[] = []
  modalAbierto = false
  modalEditarAbierto = false
  modalEditarTransferenciaAbierto = false
  movimientoSeleccionado: any = null
  eliminandoMovimiento = false

  abrirDetalle(mov: any) {
    this.movimientoSeleccionado = mov
    this.modalAbierto = true
  }

  cerrarModal() {
    this.modalAbierto = false
    this.movimientoSeleccionado = null
  }

  abrirEditarMovimiento() {
    if (!this.movimientoSeleccionado) return

    this.modalAbierto = false

    if (this.esMovimientoTransferencia(this.movimientoSeleccionado)) {
      this.modalEditarTransferenciaAbierto = true
      return
    }

    this.modalEditarAbierto = true
  }

  cerrarEditarMovimiento() {
    this.modalEditarAbierto = false
    this.modalEditarTransferenciaAbierto = false
    this.movimientoSeleccionado = null
  }

  movimientoEditado() {
    this.modalEditarAbierto = false
    this.modalEditarTransferenciaAbierto = false
    this.movimientoSeleccionado = null
    this.cargarUltimosMovimientos()
  }

  async eliminarMovimiento() {
    if (!this.movimientoSeleccionado || this.eliminandoMovimiento) return

    const esTransferencia = this.esMovimientoTransferencia(this.movimientoSeleccionado)
    const result = await Swal.fire({
      title: esTransferencia ? 'Eliminar transferencia' : 'Eliminar movimiento',
      text: esTransferencia
        ? 'Esto eliminara la transferencia completa y ajustara ambas cuentas.'
        : 'Este movimiento se eliminara y se ajustara el saldo de la cuenta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: monetraSweetAlertClasses,
      reverseButtons: true,
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    this.eliminandoMovimiento = true

    this.movimientosService.eliminarMovimiento(this.movimientoSeleccionado.id)
      .pipe(finalize(() => this.eliminandoMovimiento = false))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message ?? 'Movimiento eliminado correctamente.', 'success')
          this.modalAbierto = false
          this.movimientoSeleccionado = null
          this.cargarUltimosMovimientos()
        },
        error: (err) => {
          this.toastService.show(err?.error?.message ?? 'No se pudo eliminar el movimiento.', 'error')
        },
      })
  }

  esMovimientoTransferencia(movimiento: any): boolean {
    if (!movimiento) return false

    const tieneRelacionTransferencia = [
      movimiento.id_transferencia,
      movimiento.id_transferencia_saldo,
      movimiento.transferencia_id,
      movimiento.id_cuenta_origen,
      movimiento.id_cuenta_destino,
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ].some((valor) => valor !== null && valor !== undefined && valor !== '')

    if (tieneRelacionTransferencia) return true

    return movimiento.etiquetas?.some((etiqueta: any) => {
      const nombre = String(etiqueta.nombre ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      return String(etiqueta.id) === '6' || nombre.includes('transfer')
    }) ?? false
  }

  ngOnInit() {
    this.cargarUltimosMovimientos()

    // escucha cuando se crea un movimiento
    this.movimientosService.refreshBalanceObservable$
      .subscribe(() => {
        this.cargarUltimosMovimientos()
      })

  }

  cargarUltimosMovimientos() {
    this.movimientosService.consultarUltimosMovimientos().subscribe((res: any) => {

      this.movimientos = res.map((mov: any) => ({
        ...mov,
        fecha_formateada: formatearFechaLocal(mov.fecha)
      }))

      this.cd.detectChanges()

    })
  }
}
