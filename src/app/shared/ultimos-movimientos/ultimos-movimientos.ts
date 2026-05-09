import { ChangeDetectorRef, Component } from '@angular/core'
import { MovimientosService } from '../../core/services/movimientos.service'
import { Modal } from '../modal/modal'
import { CurrencyPipe } from '@angular/common'

@Component({
  selector: 'app-ultimos-movimientos',
  standalone: true,
  imports: [Modal, CurrencyPipe],
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
  movimientoSeleccionado: any = null

  abrirDetalle(mov: any) {
    this.movimientoSeleccionado = mov
    this.modalAbierto = true
  }

  cerrarModal() {
    this.modalAbierto = false
    this.movimientoSeleccionado = null
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
        fecha_formateada: new Date(mov.fecha).toLocaleString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      }))

      this.cd.detectChanges()

    })
  }
}
