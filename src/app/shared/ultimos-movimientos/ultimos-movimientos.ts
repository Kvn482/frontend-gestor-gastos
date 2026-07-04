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
      console.log('ultimos movimientos', res)

      this.movimientos = res.map((mov: any) => {
        console.log({
          original: mov.fecha,
          parsed: new Date(mov.fecha).toString(),
          iso: new Date(mov.fecha).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })

        return {
          ...mov,
          fecha_formateada: this.formatearFechaMovimiento(mov.fecha)
        }
      })

      this.cd.detectChanges()

    })
  }

  private formatearFechaMovimiento(fecha: string): string {
    const [year, month, day] = fecha.split('T')[0].split('-')

    if (!year || !month || !day) return fecha

    return `${day}/${month}/${year}`
  }
}
