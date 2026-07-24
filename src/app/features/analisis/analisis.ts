import { CurrencyPipe, NgClass } from '@angular/common'
import { ChangeDetectorRef, Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import {
  AnalisisCategoria,
  AnalisisInsight,
  AnalisisMensual,
  AnalisisResponse,
  AnalisisTendencia,
} from '../../core/models/analisis.interface'
import { AnalisisService } from '../../core/services/analisis.service'
import { CuentasService } from '../../core/services/cuentas.service'

@Component({
  selector: 'app-analisis',
  imports: [CurrencyPipe, FormsModule, NgClass, RouterLink],
  templateUrl: './analisis.html',
  styleUrl: './analisis.css',
})
export class Analisis {
  periodoSeleccionado = 'mes-actual'
  cuentaSeleccionada = 'todas'
  cargando = true
  analisis: AnalisisResponse | null = null
  errorCarga = ''

  periodos = [
    { valor: 'mes-actual', label: 'Mes actual' },
    { valor: 'mes-anterior', label: 'Mes anterior' },
    { valor: 'ultimos-3-meses', label: 'Ultimos 3 meses' },
  ]

  cuentas = [
    { valor: 'todas', label: 'Todas las cuentas' },
    { valor: 'debito', label: 'Debito' },
    { valor: 'credito', label: 'Credito' },
  ]

  constructor(
    private analisisService: AnalisisService,
    private cuentasService: CuentasService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarCuentas()
    this.cargarAnalisis()
  }

  cargarCuentas() {
    this.cuentasService.consultarCuentasActivas().subscribe({
      next: (res: any) => {
        const cuentasUsuario = (Array.isArray(res) ? res : []).map((cuenta: any) => ({
          valor: cuenta.id,
          label: cuenta.nombre,
        }))

        if (cuentasUsuario.length) {
          this.cuentas = [{ valor: 'todas', label: 'Todas las cuentas' }, ...cuentasUsuario]
          this.cd.detectChanges()
        }
      },
    })
  }

  cargarAnalisis() {
    this.cargando = true
    this.errorCarga = ''
    this.analisisService.consultarAnalisis(this.periodoSeleccionado, this.cuentaSeleccionada).subscribe({
      next: (res) => {
        this.analisis = res
        this.cargando = false
        this.cd.detectChanges()
      },
      error: () => {
        this.analisis = null
        this.errorCarga = 'No pudimos cargar tu informacion en este momento. Intenta de nuevo en unos segundos.'
        this.cargando = false
        this.cd.detectChanges()
      },
    })
  }

  seleccionarPeriodo(periodo: string) {
    if (this.periodoSeleccionado === periodo) return
    this.periodoSeleccionado = periodo
    this.cargarAnalisis()
  }

  maxTendencia(): number {
    const valores = this.tendencia.flatMap((item) => [item.ingresos, item.gastos])
    return Math.max(...valores, 1)
  }

  alturaBarra(valor: number): number {
    return Math.max(8, Math.round((valor / this.maxTendencia()) * 100))
  }

  anchoCategoria(categoria: AnalisisCategoria): number {
    return Math.max(4, Math.min(100, categoria.porcentaje))
  }

  tendenciaGridClass(): string {
    const total = this.tendencia.length

    if (total <= 1) return 'grid-cols-1'
    if (total === 2) return 'grid-cols-2'
    if (total === 3) return 'grid-cols-2 min-[420px]:grid-cols-3 xl:grid-cols-3'
    if (total === 4) return 'grid-cols-2 xl:grid-cols-4'
    if (total === 5) return 'grid-cols-2 min-[420px]:grid-cols-3 xl:grid-cols-5'

    return 'grid-cols-2 min-[420px]:grid-cols-3 xl:grid-cols-6'
  }

  tasaAhorroClamped(): number {
    return Math.max(0, Math.min(100, this.resumen?.tasaAhorro ?? 0))
  }

  tendenciaTotal(item: AnalisisTendencia): number {
    return item.ingresos - item.gastos
  }

  tendenciaDetalle(item: AnalisisTendencia): string {
    const moneda = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
    })

    return `Ingresos: ${moneda.format(item.ingresos)} | Gastos: ${moneda.format(item.gastos)}`
  }

  variacionTexto(valor: number): string {
    return `${valor > 0 ? '+' : ''}${valor}% vs anterior`
  }

  variacionIngresoPositiva(valor: number): boolean {
    return valor >= 0
  }

  variacionGastoPositiva(valor: number): boolean {
    return valor <= 0
  }

  insightClass(insight: AnalisisInsight): string {
    if (insight.tipo === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300'
    if (insight.tipo === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300'
    return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/25 dark:text-indigo-300'
  }

  get resumen() {
    return this.analisis?.resumen
  }

  get categorias(): AnalisisCategoria[] {
    return this.analisis?.categorias ?? []
  }

  get tendencia(): AnalisisTendencia[] {
    return this.analisis?.tendencia ?? []
  }

  get insights(): AnalisisInsight[] {
    return this.analisis?.insights ?? []
  }

  get comparativa(): AnalisisMensual[] {
    return this.analisis?.comparativa ?? []
  }
}
