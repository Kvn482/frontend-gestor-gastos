import { CurrencyPipe, NgClass } from '@angular/common'
import { ChangeDetectorRef, Component } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
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
  tendenciaSeleccionadaIndex = 0

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
    private router: Router,
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
        this.tendenciaSeleccionadaIndex = 0
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

  seleccionarTendencia(index: number) {
    this.tendenciaSeleccionadaIndex = index
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

  balanceNetoClass(item: AnalisisTendencia): string {
    const total = this.tendenciaTotal(item)

    if (total > 0) return 'net-badge-positive'
    if (total < 0) return 'net-badge-negative'

    return 'net-badge-neutral'
  }

  get tendenciaSeleccionada(): AnalisisTendencia | null {
    return this.tendencia[this.tendenciaSeleccionadaIndex] ?? this.tendencia.at(-1) ?? null
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

  abrirMovimientos(tipo: 'ingresos' | 'gastos' | 'todos' = 'todos', extra: Record<string, string> = {}) {
    const queryParams: Record<string, string> = {
      ...this.obtenerQueryPeriodo(),
      ...extra,
      origen: 'analisis',
      transferencias: 'false',
    }

    if (tipo !== 'todos') {
      queryParams['tipo'] = tipo
    }

    if (this.cuentaSeleccionada !== 'todas') {
      queryParams['cuentaId'] = this.cuentaSeleccionada
    }

    this.router.navigate(['/movimientos'], { queryParams })
  }

  abrirMovimientosCategoria(categoria: AnalisisCategoria) {
    this.abrirMovimientos('gastos', { categoria: categoria.nombre })
  }

  abrirMovimientosMes(mes: AnalisisMensual, tipo: 'ingresos' | 'gastos' | 'todos' = 'todos') {
    const mesQuery = this.obtenerMesQuery(mes.mes)
    this.abrirMovimientos(tipo, mesQuery ? { mes: mesQuery } : {})
  }

  private obtenerQueryPeriodo(): Record<string, string> {
    const hoy = new Date()
    const desdeHasta = (desde: Date, hasta: Date) => ({
      desde: this.formatearInputDate(desde),
      hasta: this.formatearInputDate(hasta),
    })

    if (this.periodoSeleccionado === 'mes-anterior') {
      return desdeHasta(
        new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      )
    }

    if (this.periodoSeleccionado === 'ultimos-3-meses') {
      return desdeHasta(
        new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1),
        new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      )
    }

    return desdeHasta(new Date(hoy.getFullYear(), hoy.getMonth(), 1), hoy)
  }

  private obtenerMesQuery(mes: string): string {
    const meses: Record<string, number> = {
      enero: 1,
      febrero: 2,
      marzo: 3,
      abril: 4,
      mayo: 5,
      junio: 6,
      julio: 7,
      agosto: 8,
      septiembre: 9,
      octubre: 10,
      noviembre: 11,
      diciembre: 12,
    }
    const numeroMes = meses[mes.toLowerCase()]

    if (!numeroMes) return ''

    return `${new Date().getFullYear()}-${String(numeroMes).padStart(2, '0')}`
  }

  private formatearInputDate(fecha: Date): string {
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const day = String(fecha.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
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
