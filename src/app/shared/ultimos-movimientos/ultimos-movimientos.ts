import { ChangeDetectorRef, Component } from '@angular/core'
import { MovimientosService } from '../../core/services/movimientos.service'
import { Modal } from '../modal/modal'
import { CurrencyPipe } from '@angular/common'
import { formatearFechaLocal } from '../utils/fechas'
import { NuevoMovimientoModal } from '../../features/components/nuevo-movimiento-modal/nuevo-movimiento-modal'

@Component({
  selector: 'app-ultimos-movimientos',
  standalone: true,
  imports: [Modal, CurrencyPipe, NuevoMovimientoModal],
  templateUrl: './ultimos-movimientos.html',
  styleUrl: './ultimos-movimientos.css',
})
export class UltimosMovimientos {
  constructor(
    private movimientosService: MovimientosService,
    private cd: ChangeDetectorRef
  ) { }

  movimientos: any[] = []
  modalAbierto = false
  modalEditarAbierto = false
  movimientoSeleccionado: any = null

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
    this.modalEditarAbierto = true
  }

  cerrarEditarMovimiento() {
    this.modalEditarAbierto = false
    this.movimientoSeleccionado = null
  }

  movimientoEditado() {
    this.modalEditarAbierto = false
    this.movimientoSeleccionado = null
    this.cargarUltimosMovimientos()
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
