# Contexto: detalle de cuenta

La pantalla de detalle de cuenta muestra la informacion de una cuenta especifica del usuario autenticado, junto con su historial de movimientos. Tambien permite pagar tarjetas de credito, ver el detalle de un movimiento, editar movimientos o transferencias y eliminar movimientos.

## Ubicacion en la app

Ruta:

```ts
{ path: 'cuentas/:id', component: CuentaDetalle }
```

La ruta vive dentro del `Layout` protegido por `authGuard`.

Archivos principales:

- `src/app/features/cuenta-detalle/cuenta-detalle.ts`
- `src/app/features/cuenta-detalle/cuenta-detalle.html`
- `src/app/features/cuenta-detalle/cuenta-detalle.css`
- `src/app/core/services/cuentas.service.ts`
- `src/app/core/services/movimientos.service.ts`

Componentes relacionados:

- `src/app/features/components/pagar-tarjeta-modal/pagar-tarjeta-modal.ts`
- `src/app/features/components/nuevo-movimiento-modal/nuevo-movimiento-modal.ts`
- `src/app/features/components/transferir-saldo/transferir-saldo.ts`
- `src/app/shared/modal/modal.ts`

## Carga inicial

Al inicializar, el componente lee el `id` desde la URL:

```ts
this.route.paramMap
```

Luego ejecuta `consultarDetalle(idCuenta)`, que carga en paralelo:

```ts
cuentasService.consultarCuentas()
movimientosService.consultarMovimientosPorCuenta(idCuenta)
```

Endpoints usados:

```http
GET /api/cuentas
GET /api/movimientos/cuenta/:idCuenta
```

El resultado se procesa en `aplicarDetalle()`.

## Manejo de errores

La pantalla distingue entre:

- Error al cargar cuentas.
- Cuenta no encontrada.
- Error al cargar movimientos.
- Cuenta sin movimientos.

Esto evita confundir un error del backend con una lista vacia valida.

Si falla `GET /api/cuentas`, se muestra error general:

```txt
Cuenta no disponible
```

Si la cuenta no existe en la respuesta de cuentas, tambien se muestra error general y un boton para volver a `/cuentas`.

Si la cuenta carga bien pero falla `GET /api/movimientos/cuenta/:idCuenta`, la cuenta se muestra, pero el historial muestra un aviso:

```txt
No pudimos cargar los movimientos de esta cuenta.
```

Si movimientos responde `200 []`, se interpreta correctamente como:

```txt
Aun no hay movimientos para esta cuenta.
```

## Estado principal

Archivo: `src/app/features/cuenta-detalle/cuenta-detalle.ts`

Estado relevante:

```ts
cuenta: CuentaDetalleModel | null = null
movimientos: MovimientoCuenta[] = []
movimientoSeleccionado: MovimientoCuenta | null = null
cargando = true
errorCarga = ''
errorMovimientos = ''
modalPagoTarjetaAbierto = false
modalMovimientoAbierto = false
modalEditarMovimientoAbierto = false
modalEditarTransferenciaAbierto = false
```

Estado de filtros:

```ts
filtrosAbiertos = false
grupoFiltroActivo = 'fecha'
busquedaMovimiento = ''
filtroFecha = 'ultimos_30_dias'
filtroTipoMovimiento = 'todos'
filtrosEtiquetas = []
fechaDesde = ''
fechaHasta = ''
ordenCampo = 'fecha'
ordenDireccion = 'desc'
etiquetasDisponibles = []
```

## Modelo de cuenta

El detalle maneja una cuenta con estos campos principales:

```ts
interface CuentaDetalleModel {
  id: string
  nombre: string
  tipo: 'DEBITO' | 'EFECTIVO' | 'CREDITO'
  saldo_actual: number
  color: string
  limite_credito?: number | string | null
  dia_corte?: number | string | null
  dia_limite_pago?: number | string | null
  fecha_limite_pago?: number | string | null
}
```

Notas:

- `dia_limite_pago` es el campo usado por el formulario de crear/editar cuenta.
- `fecha_limite_pago` se conserva como compatibilidad si alguna respuesta vieja lo envia.
- La pantalla prefiere `dia_limite_pago` mediante el getter `diaLimitePago`.

## Modelo de movimiento

Campos relevantes:

```ts
interface MovimientoCuenta {
  id: number | string
  fecha: string
  descripcion: string
  monto: number
  id_tipo_movimiento: number
  etiquetas: EtiquetaMovimiento[]
  notas?: string | null
  cuenta?: string | null
  tipo_cuenta?: string | null
  id_cuenta?: number | string | null
  id_cuenta_origen?: number | string | null
  id_cuenta_destino?: number | string | null
  id_transferencia?: number | string | null
  id_transferencia_saldo?: number | string | null
  transferencia_id?: number | string | null
}
```

La deteccion de transferencia usa campos de relacion y, como respaldo, etiquetas:

- `id_transferencia`
- `id_transferencia_saldo`
- `transferencia_id`
- `id_cuenta_origen`
- `id_cuenta_destino`
- `cuenta_origen_id`
- `cuenta_destino_id`
- Etiqueta con id `6` o nombre que incluya `transfer`

## Layout visual

Archivo: `src/app/features/cuenta-detalle/cuenta-detalle.html`

La pantalla tiene dos zonas principales:

1. Resumen de cuenta.
2. Historial de movimientos.

El CSS local define el layout responsive:

```css
.cuenta-detalle-layout {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 1025px) {
  .cuenta-detalle-layout {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cuenta-detalle-resumen {
    grid-column: span 1 / span 1;
  }

  .cuenta-detalle-historial {
    grid-column: span 2 / span 2;
  }
}
```

En escritorio:

- Resumen ocupa 1 columna.
- Historial ocupa 2 columnas.

En mobile:

- Todo se apila en una sola columna.

## Resumen de cuenta

La tarjeta principal usa:

- `cuenta.color` como fondo.
- `cuenta.tipo` como badge.
- `saldoMostrado` como saldo visible.
- `cuenta.nombre`.
- Logo de Monetra.

Para cuentas normales, `saldoMostrado` es `saldo_actual`.

Para cuentas de credito, `saldoMostrado` es el credito disponible.

## Cuentas de credito

Si `cuenta.tipo === 'CREDITO'`, se muestra un bloque adicional de credito utilizado.

Getters principales:

```ts
get esCredito(): boolean
get limiteCredito(): number
get creditoDisponible(): number
get creditoUtilizado(): number
get porcentajeCreditoUtilizado(): number
get barraCreditoWidth(): string
get diaLimitePago(): number | string
```

Calculos:

```ts
creditoDisponible = limite_credito + saldo_actual
creditoUtilizado = abs(saldo_actual negativo)
porcentajeCreditoUtilizado = creditoUtilizado / limite_credito
```

La barra de credito se limita a 100%.

El boton `Pagar Tarjeta` abre `PagarTarjetaModal`.

## Pago de tarjeta

El modal recibe:

```html
[cuentaDestinoId]="cuenta.id"
```

Eventos:

```html
(closed)="cerrarModalPagoTarjeta()"
(saved)="pagoTarjetaRealizado()"
```

Importante:

- `closed` solo cierra el modal.
- `saved` indica que el pago si se realizo.
- El detalle solo recarga cuando recibe `saved`.

Esto evita que la pantalla parpadee al cancelar o cerrar el modal sin pagar.

## Historial de movimientos

La seccion de historial muestra:

- Filtros.
- Busqueda.
- Total neto filtrado.
- Lista mobile.
- Tabla desktop.

Ambas vistas usan el mismo getter:

```ts
movimientosFiltrados
```

Por eso filtros y orden se comportan igual en mobile y desktop.

## Filtros

Filtros disponibles:

Fecha:

- `todos`
- `ultimos_7_dias`
- `ultimos_30_dias`
- `este_mes`
- `mes_anterior`
- `personalizado`

Tipo:

- `todos`
- `ingresos`
- `gastos`

Etiquetas:

- Todas.
- Una o varias etiquetas detectadas en los movimientos cargados.

Busqueda:

- Busca en `descripcion`.
- Busca en `notas`.
- Normaliza texto quitando acentos y pasando a minusculas.

## Ordenamiento

Campos disponibles:

- `fecha`
- `descripcion`
- `etiquetas`
- `monto`

Direccion:

- `asc`
- `desc`

Al hacer click en la misma columna, alterna direccion.

Si cambia de campo:

- `fecha` y `monto` inician en `desc`.
- `descripcion` y `etiquetas` inician en `asc`.

Si hay empate, el segundo criterio es fecha descendente.

## Total filtrado

El total se calcula con los movimientos filtrados:

```ts
totalEntradasFiltradas
totalSalidasFiltradas
totalNetoFiltrado
```

Regla:

- `id_tipo_movimiento === 1` cuenta como ingreso.
- Cualquier otro tipo cuenta como salida.

El total neto es:

```ts
entradas - salidas
```

## Detalle de movimiento

Al hacer click en un movimiento:

```ts
abrirDetalleMovimiento(movimiento)
```

Se abre `app-modal` y muestra:

- Fecha.
- Descripcion.
- Monto.
- Tags.
- Cuenta.
- Notas.
- Boton `Eliminar`.
- Boton `Editar`.

## Edicion de movimiento

Al editar:

```ts
abrirEditarMovimiento()
```

Si `esMovimientoTransferencia(movimiento)` devuelve `true`, abre:

```html
<app-transferir-saldo>
```

Si no es transferencia, abre:

```html
<app-nuevo-movimiento-modal>
```

Cuando se guarda la edicion:

```ts
movimientoEditado()
```

Cierra modales, limpia `movimientoSeleccionado` y recarga el detalle.

## Eliminacion de movimiento

Al eliminar:

1. Muestra confirmacion con SweetAlert2.
2. Si se confirma, llama:

```ts
movimientosService.eliminarMovimiento(movimientoSeleccionado.id)
```

Endpoint usado:

```http
DELETE /api/movimientos/:id
```

Al completar:

- Muestra toast de exito.
- Cierra el modal.
- Limpia seleccion.
- Recarga detalle.

Si el movimiento se detecta como transferencia, el texto de confirmacion advierte que se eliminara la transferencia completa y ajustara ambas cuentas.

## Servicios involucrados

`CuentasService`:

- `consultarCuentas()`: `GET /api/cuentas`
- `transferirSaldo()`: `POST /api/cuentas/transferir-saldo`
- `actualizarTransferenciaSaldo()`: `PATCH /api/cuentas/transferir-saldo/edit/:id`

`MovimientosService`:

- `consultarMovimientosPorCuenta(idCuenta)`: `GET /api/movimientos/cuenta/:idCuenta`
- `actualizarMovimiento(id, data)`: `PATCH /api/movimientos/edit/:id`
- `eliminarMovimiento(id)`: `DELETE /api/movimientos/:id`

## Endpoint de movimientos por cuenta

El backend devuelve movimientos de una cuenta con:

```http
GET /api/movimientos/cuenta/:id
```

Respuesta esperada:

- `200 []` si no hay movimientos.
- `200 MovimientoCuenta[]` si hay movimientos.
- `500 { message }` si falla la consulta.

El frontend debe conservar esa diferencia:

- `200 []` significa cuenta sin movimientos.
- `500` significa error al cargar historial.

## Fechas

Para filtros internos se usan utilidades locales:

```ts
crearFechaLocal()
formatearFechaLocal()
```

Esto evita problemas comunes con fechas `YYYY-MM-DD` interpretadas como UTC.

Punto a revisar:

- En algunos lugares del HTML aun se usa `DatePipe` directamente para `movimiento.fecha`.
- Si el backend manda `YYYY-MM-DD`, podria ser mejor usar `formatearFechaLocal()` tambien en la lista/tabla.

## Resumen rapido

- `/cuentas/:id` muestra una cuenta y sus movimientos.
- Carga cuenta y movimientos en paralelo.
- Ya no usa cuenta demo si no encuentra la cuenta.
- Distingue error de movimientos contra lista vacia.
- Para credito muestra disponible, utilizado, porcentaje y dia limite de pago.
- El modal de pago solo recarga el detalle cuando el pago se guarda.
- El historial tiene busqueda, filtros, ordenamiento, vista mobile y tabla desktop.
- Desde el detalle de movimiento se puede editar o eliminar.
