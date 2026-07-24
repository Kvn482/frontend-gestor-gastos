export interface AnalisisResumen {
  ingresos: number
  gastos: number
  balance: number
  tasaAhorro: number
  variacionGastos: number
  variacionIngresos: number
}

export interface AnalisisCategoria {
  nombre: string
  monto: number
  porcentaje: number
  color: string
  variacion: number
}

export interface AnalisisTendencia {
  etiqueta: string
  ingresos: number
  gastos: number
}

export interface AnalisisInsight {
  titulo: string
  detalle: string
  tipo: 'success' | 'warning' | 'info'
}

export interface AnalisisMensual {
  mes: string
  ingresos: number
  gastos: number
  balance: number
}

export interface AnalisisResponse {
  resumen: AnalisisResumen
  categorias: AnalisisCategoria[]
  tendencia: AnalisisTendencia[]
  insights: AnalisisInsight[]
  comparativa: AnalisisMensual[]
}
