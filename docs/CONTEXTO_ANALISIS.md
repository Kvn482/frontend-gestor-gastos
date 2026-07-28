# Contexto: pantalla de analisis

La pantalla de analisis muestra una lectura resumida del comportamiento financiero del usuario autenticado. Consume un endpoint protegido por JWT y renderiza ingresos, gastos, balance, tasa de ahorro, tendencia, distribucion por categorias, insights y comparativa mensual.

## Ubicacion en la app

Ruta:

```ts
{ path: 'analisis', component: Analisis }
```

La ruta vive dentro del `Layout` protegido por `authGuard`, por lo que requiere sesion activa.

Archivos principales:

- `src/app/features/analisis/analisis.ts`
- `src/app/features/analisis/analisis.html`
- `src/app/features/analisis/analisis.css`
- `src/app/core/services/analisis.service.ts`
- `src/app/core/models/analisis.interface.ts`
- `src/app/app.routes.ts`

Tambien existe acceso visual desde:

- Sidebar principal en `src/app/layout/layout.html`
- Acciones rapidas del dashboard
- Acciones rapidas de cuentas

## Componente principal

Archivo: `src/app/features/analisis/analisis.ts`

El componente `Analisis` es standalone y usa:

- `CurrencyPipe` para mostrar montos en MXN.
- `FormsModule` para el `select` de cuenta con `ngModel`.
- `NgClass` para clases dinamicas.
- `RouterLink` para volver al dashboard.

Estado principal:

```ts
periodoSeleccionado = 'mes-actual'
cuentaSeleccionada = 'todas'
cargando = true
analisis: AnalisisResponse | null = null
errorCarga = ''
tendenciaSeleccionadaIndex = 0
```

Periodos disponibles:

- `mes-actual`
- `mes-anterior`
- `ultimos-3-meses`

El filtro de cuentas inicia con valores genericos:

- `todas`
- `debito`
- `credito`

Despues, `cargarCuentas()` reemplaza esas opciones con las cuentas activas reales del usuario, manteniendo `Todas las cuentas` como primera opcion.

## Flujo de carga

Al inicializar:

1. `ngOnInit()` llama `cargarCuentas()`.
2. `ngOnInit()` llama `cargarAnalisis()`.
3. `cargarCuentas()` consume `cuentasService.consultarCuentasActivas()`.
4. `cargarAnalisis()` consume `analisisService.consultarAnalisis(periodoSeleccionado, cuentaSeleccionada)`.
5. Si la respuesta es exitosa:
   - Guarda la respuesta en `analisis`.
   - Reinicia `tendenciaSeleccionadaIndex` a `0`.
   - Desactiva `cargando`.
6. Si falla:
   - Limpia `analisis`.
   - Llena `errorCarga`.
   - Muestra estado de error con boton para reintentar.

Cuando el usuario cambia periodo:

```ts
seleccionarPeriodo(periodo)
```

Actualiza `periodoSeleccionado` y vuelve a cargar el analisis.

Cuando el usuario cambia cuenta:

```html
(change)="cargarAnalisis()"
```

Se consulta nuevamente el endpoint con el `cuentaId` seleccionado.

## Servicio de analisis

Archivo: `src/app/core/services/analisis.service.ts`

Base URL:

```ts
private api = `${environment.apiUrl}/api/analisis`
```

Metodo principal:

```ts
consultarAnalisis(periodo: string, cuentaId = 'todas'): Observable<AnalisisResponse>
```

Endpoint usado:

```http
GET /api/analisis?periodo=<periodo>&cuentaId=<cuentaId>
```

Ejemplos:

```http
GET /api/analisis?periodo=mes-actual&cuentaId=todas
GET /api/analisis?periodo=ultimos-3-meses&cuentaId=123
```

Notas:

- Actualmente el servicio devuelve directamente el resultado del backend.
- Existe una funcion privada `obtenerAnalisisDemo(periodo)` con datos de prueba, pero no esta activa.
- Hay un `catchError` comentado que antes podia regresar datos demo si fallaba el backend.

## Contrato de respuesta

Archivo: `src/app/core/models/analisis.interface.ts`

Estructura esperada:

```ts
export interface AnalisisResponse {
  resumen: AnalisisResumen
  categorias: AnalisisCategoria[]
  tendencia: AnalisisTendencia[]
  insights: AnalisisInsight[]
  comparativa: AnalisisMensual[]
}
```

`resumen`:

```ts
{
  ingresos: number
  gastos: number
  balance: number
  tasaAhorro: number
  variacionGastos: number
  variacionIngresos: number
}
```

`categorias`:

```ts
{
  nombre: string
  monto: number
  porcentaje: number
  color: string
  variacion: number
}
```

`tendencia`:

```ts
{
  etiqueta: string
  ingresos: number
  gastos: number
}
```

`insights`:

```ts
{
  titulo: string
  detalle: string
  tipo: 'success' | 'warning' | 'info'
}
```

`comparativa`:

```ts
{
  mes: string
  ingresos: number
  gastos: number
  balance: number
}
```

## Template y secciones visuales

Archivo: `src/app/features/analisis/analisis.html`

La pantalla se organiza asi:

1. Header:
   - Link para volver al dashboard.
   - Titulo `Analisis`.
   - Descripcion breve.
   - Selector de periodo.
   - Selector de cuenta.

2. Estado de carga:
   - Skeletons con `animate-pulse`.

3. Estado de error:
   - Mensaje `Analisis no disponible`.
   - Texto desde `errorCarga`.
   - Boton `Reintentar`.

4. Resumen:
   - Tarjeta de ingresos.
   - Tarjeta de gastos.
   - Tarjeta de balance.
   - Tarjeta de ahorro con barra de progreso.

5. Tendencia:
   - Grafica manual de ingresos vs gastos.
   - Cada periodo de tendencia es un boton seleccionable.
   - Al seleccionar una barra, se actualiza el detalle superior.

6. Categorias:
   - Lista vertical con monto, porcentaje y variacion.
   - Barra horizontal coloreada con `categoria.color`.

7. Insights:
   - Lista de recomendaciones o alertas.
   - El color depende de `insight.tipo`.

8. Comparativa:
   - Tabla de ultimos meses.
   - Muestra ingresos, gastos y balance por mes.

## Grafica de tendencia

No se usa libreria externa de graficas. La grafica esta hecha con HTML, Tailwind y CSS local.

Cada grupo de barras es un `button` con:

- Una barra verde para ingresos.
- Una barra roja para gastos.
- Una etiqueta inferior.
- Estado activo o atenuado segun `tendenciaSeleccionadaIndex`.

La altura se calcula en el componente:

```ts
maxTendencia(): number {
  const valores = this.tendencia.flatMap((item) => [item.ingresos, item.gastos])
  return Math.max(...valores, 1)
}

alturaBarra(valor: number): number {
  return Math.max(8, Math.round((valor / this.maxTendencia()) * 100))
}
```

Esto significa:

- El valor mas alto de ingresos/gastos equivale al 100%.
- Las barras nunca bajan de 8%, para que valores pequenos sigan siendo visibles.
- Si no hay datos, el maximo minimo es `1` para evitar division entre cero.

## Helpers visuales

El componente incluye funciones pequenas para evitar logica pesada en el template:

- `anchoCategoria(categoria)`: limita el porcentaje entre 4 y 100.
- `tasaAhorroClamped()`: limita la tasa de ahorro visual entre 0 y 100.
- `tendenciaTotal(item)`: calcula ingresos menos gastos.
- `balanceNetoClass(item)`: devuelve clase positiva, negativa o neutral.
- `variacionTexto(valor)`: arma texto `+N% vs anterior`.
- `variacionIngresoPositiva(valor)`: ingresos positivos si `valor >= 0`.
- `variacionGastoPositiva(valor)`: gastos positivos si `valor <= 0`.
- `insightClass(insight)`: asigna estilos por tipo de insight.

## Estilos locales

Archivo: `src/app/features/analisis/analisis.css`

Define estilos especificos para:

- `.chart-bar`: ancho, altura minima, bordes y transiciones de las barras.
- `.chart-group`: opacidad base de cada grupo.
- `.chart-group-active`: fondo y borde interno para el grupo seleccionado.
- `.chart-group-muted:hover`: hover de barras no seleccionadas.
- `.net-badge`: badge de balance neto.
- `.net-badge-positive`, `.net-badge-negative`, `.net-badge-neutral`: colores segun balance.
- `.custom-scrollbar`: scrollbars delgados para listas y contenedores.

La mayor parte del layout y tema visual se resuelve con clases Tailwind en el HTML.

## Dependencias de datos

La pantalla depende de dos servicios:

- `AnalisisService`: obtiene el analisis financiero.
- `CuentasService`: obtiene cuentas activas para llenar el filtro.

El JWT no se maneja dentro de esta pantalla. Lo agrega el `AuthInterceptor` al consumir servicios HTTP.

## Puntos a revisar

- `tendenciaGridClass()` existe en el componente, pero no se usa en el HTML actual.
- El fallback a datos demo esta comentado. Si el backend falla, se muestra error en vez de datos de prueba.
- `cargarCuentas()` no maneja error explicitamente; si falla, se quedan las opciones iniciales.
- Los labels visibles no tienen acentos en varios textos (`Analisis`, `Ultimos`, `Categorias`, etc.), consistente con parte del codigo actual.
- La grafica manual funciona para una visualizacion simple, pero si se necesitan ejes, tooltips avanzados o escalas mas formales, podria convenir una libreria de charts.

## Resumen rapido

- `/analisis` es una pantalla protegida dentro del layout principal.
- Consulta `GET /api/analisis` con `periodo` y `cuentaId`.
- Renderiza resumen, tendencia, categorias, insights y comparativa.
- La grafica de tendencia esta hecha a mano con HTML/CSS, no con una dependencia externa.
- Las cuentas del filtro salen de `consultarCuentasActivas()`.
- El contrato completo esta tipado en `AnalisisResponse`.
