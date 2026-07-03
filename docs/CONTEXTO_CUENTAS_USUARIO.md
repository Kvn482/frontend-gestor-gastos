# Contexto: cuentas del usuario

Este frontend maneja las cuentas del usuario autenticado consumiendo endpoints protegidos por JWT. El frontend no envia `id_usuario` al crear, consultar o modificar cuentas; la relacion usuario-cuentas se resuelve en el backend a partir del token enviado en el header `Authorization`.

## Autenticacion y usuario

- `AuthService` guarda `accessToken` y `refreshToken` en `localStorage`.
- `AuthInterceptor` agrega `Authorization: Bearer <accessToken>` a las requests, excepto cuando la URL incluye `/refresh`.
- Si una request falla con `401`, el interceptor intenta renovar tokens con `/api/auth/refresh`.
- La ruta `/cuentas` vive dentro del layout protegido por `authGuard`.
- `authGuard` permite entrar si existe `refreshToken`, no valida directamente la expiracion del access token.

Archivos principales:

- `src/app/core/services/auth.service.ts`
- `src/app/interceptors/auth.interceptor.ts`
- `src/app/core/guards/auth-guard.ts`
- `src/app/app.routes.ts`

## Servicio de cuentas

Archivo: `src/app/core/services/cuentas.service.ts`

Base URL:

```ts
private api = `${environment.apiUrl}/api/cuentas`;
```

Metodos:

- `crearCuenta(data)`: `POST /api/cuentas`
- `consultarCuentas()`: `GET /api/cuentas`
- `consultarCuentasActivas()`: `GET /api/cuentas/activas`
- `actualizarCuenta(id, data)`: `PATCH /api/cuentas/:id`
- `updateStatus(id, status)`: `PATCH /api/cuentas/update-status`
- `transferirSaldo(data)`: `POST /api/cuentas/transferir-saldo`

Tambien expone `refreshBalanceObservable$`, un observable que notifica cambios cuando se crea una cuenta o se transfiere saldo.

## Servicio de movimientos

Archivo: `src/app/core/services/movimientos.service.ts`

Base URL:

```ts
private api = `${environment.apiUrl}/api`;
```

Metodos relevantes para cuentas:

- `consultarUltimosMovimientos()`: `GET /api/movimientos/ultimos-movimientos`
- `consultarMovimientosPorCuenta(idCuenta)`: `GET /api/movimientos/cuenta/:idCuenta`

`consultarMovimientosPorCuenta(idCuenta)` se usa en el detalle de cuenta para traer exclusivamente el historial de la cuenta seleccionada. El filtrado debe resolverse en backend, no en frontend.

## Pantalla de cuentas

Archivos:

- `src/app/features/cuentas/cuentas.ts`
- `src/app/features/cuentas/cuentas.html`

Flujo:

1. Al inicializar, llama `cargarCuentas()`.
2. `cargarCuentas()` consume `cuentasService.consultarCuentas()`.
3. La respuesta se guarda en `cuentas`.
4. El template renderiza un `app-account-card` por cada cuenta.
5. La pantalla escucha `refreshBalanceObservable$` para recargar cuentas despues de crear una cuenta o transferir saldo.
6. Al hacer click en una tarjeta, `AccountCard.verDetalle()` navega a `/cuentas/:id`.

Campos esperados por la tarjeta:

- `id`
- `nombre`
- `tipo`
- `saldo_actual`
- `color`
- `status`

## Crear cuenta

Archivo: `src/app/features/components/crear-cuenta-modal/crear-cuenta-modal.ts`

Formulario base:

```ts
cuenta = {
  nombre: '',
  tipo: 'DEBITO',
  saldo_inicial: 0,
  color: '#a855f7',
  limite_credito: null,
  dia_corte: null,
  dia_limite_pago: null
};
```

Al guardar:

- Valida que `nombre` no este vacio.
- Convierte `saldo_inicial` a numero.
- Envia el saldo como valor absoluto.
- Si el saldo inicial era negativo, manda `id_tipo_movimiento: 2`.
- Si el saldo inicial era positivo o cero, manda `id_tipo_movimiento: 1`.
- Si `tipo === 'CREDITO'`, muestra campos adicionales:
  - `limite_credito`: opcional, se manda como `0` si queda vacio; no permite negativos.
  - `dia_corte`: requerido para credito, dia del 1 al 31.
  - `dia_limite_pago`: requerido para credito, dia del 1 al 31.
- Si `tipo === 'CREDITO'`, el campo `saldo_inicial` se oculta y se resetea a `0` al cambiar el tipo.
- Si `tipo !== 'CREDITO'`, `limite_credito`, `dia_corte` y `dia_limite_pago` se mandan como `null`.

Payload aproximado:

```ts
{
  nombre,
  tipo,
  saldo_inicial: Math.abs(saldoInicial),
  color,
  id_tipo_movimiento: saldoInicial < 0 ? 2 : 1,
  limite_credito: tipo === 'CREDITO' ? limite_credito : null,
  dia_corte: tipo === 'CREDITO' ? dia_corte : null,
  dia_limite_pago: tipo === 'CREDITO' ? dia_limite_pago : null
}
```

Al completarse correctamente:

- Muestra toast de exito.
- Cierra el modal.
- `CuentasService.crearCuenta()` emite refresh para que la pantalla recargue.

## Editar cuenta

La pantalla reutiliza `CrearCuentaModal` para crear y editar cuentas.

Flujo:

1. En el menu de `app-account-card`, la opcion `Editar` emite `editRequested` con el `id` de la cuenta.
2. `Cuentas.abrirModalEditarCuenta(idCuenta)` busca la cuenta en la lista actual.
3. La cuenta encontrada se pasa al modal con `[cuentaEditar]`.
4. El modal precarga `nombre`, `tipo`, `color`, `limite_credito`, `dia_corte` y `dia_limite_pago`.
5. Al guardar en modo edicion, llama `cuentasService.actualizarCuenta(id, payload)`.

Endpoint usado:

```http
PATCH /api/cuentas/:id
```

Payload aproximado:

```ts
{
  nombre,
  tipo,
  color,
  limite_credito: tipo === 'CREDITO' ? limite_credito : null,
  dia_corte: tipo === 'CREDITO' ? dia_corte : null,
  dia_limite_pago: tipo === 'CREDITO' ? dia_limite_pago : null
}
```

Notas:

- En edicion no se muestra ni se envia `saldo_inicial`, porque ese campo genera un movimiento de apertura solo al crear una cuenta.
- Al completarse correctamente, el servicio emite refresh para recargar la lista de cuentas.

## Tarjeta de cuenta

Archivos:

- `src/app/shared/account-card/account-card.ts`
- `src/app/shared/account-card/account-card.html`

Responsabilidades:

- Muestra saldo, nombre, tipo, color y estado visual de la cuenta.
- Usa un diseno visual tipo tarjeta fisica con fondo dinamico basado en `color`.
- Si `status === 0`, la tarjeta usa un color gris.
- Navega a `/cuentas/:id` al hacer click sobre la tarjeta.
- Emite `statusChanged` cuando se activa/desactiva.
- Emite `editRequested` cuando se pide editar esa cuenta.
- Emite `transferRequested` cuando se pide transferir desde esa cuenta.
- Emite `payRequested` cuando se pide pagar una cuenta de credito.

Notas:

- La opcion `Transferir Saldo` se deshabilita si `status !== 1`.
- La cuenta llamada `Efectivo` no muestra la opcion de activar/desactivar.
- La accion `Editar` abre el modal de cuenta precargado.
- La accion `Ver` navega al detalle de la cuenta.

## Detalle de cuenta

Archivos:

- `src/app/features/cuenta-detalle/cuenta-detalle.ts`
- `src/app/features/cuenta-detalle/cuenta-detalle.html`
- `src/app/features/cuenta-detalle/cuenta-detalle.css`

Ruta:

```ts
{ path: 'cuentas/:id', component: CuentaDetalle }
```

Flujo:

1. Lee el `id` desde `ActivatedRoute.paramMap`.
2. Consulta las cuentas con `cuentasService.consultarCuentas()`.
3. Consulta movimientos exclusivos de esa cuenta con `movimientosService.consultarMovimientosPorCuenta(idCuenta)`.
4. Busca la cuenta seleccionada en la respuesta de cuentas.
5. Renderiza una estructura responsive `grid-cols-1 md:grid-cols-3`.

La columna izquierda muestra una tarjeta fisica con:

- `nombre`
- `tipo`
- saldo mostrado
- color dinamico con `[style.backgroundColor]="cuenta.color"`

Para cuentas de tipo `CREDITO`, el detalle muestra:

- Limite de credito.
- Credito disponible calculado como `limite_credito + saldo_actual`.
- Credito utilizado calculado desde el saldo negativo.
- Barra visual de porcentaje utilizado.
- Dia de corte y fecha limite de pago.
- Boton `Pagar Tarjeta`.

El boton `Pagar Tarjeta` abre `app-pagar-tarjeta-modal` dentro del detalle, pasando `[cuentaDestinoId]="cuenta.id"`. Al cerrar el modal, el detalle recarga cuenta y movimientos para reflejar el nuevo saldo.

La columna derecha muestra el historial devuelto por `GET /api/movimientos/cuenta/:idCuenta`, con fecha, descripcion, etiquetas y monto.

## Activar o desactivar cuenta

Flujo:

1. `AccountCard.actualizarStatus()` alterna localmente `status` entre `1` y `0`.
2. Emite `{ id, status }` al componente padre.
3. `Cuentas.onAccountStatusChange()` actualiza optimistamente la cuenta en la lista.
4. Llama `cuentasService.updateStatus(id, status)`.
5. Si falla, revierte al `statusAnterior`, muestra toast de error y fuerza deteccion de cambios.

Endpoint usado:

```http
PATCH /api/cuentas/update-status
```

Body:

```json
{
  "id_cuenta": "id",
  "status": 1
}
```

## Transferir saldo

Archivo: `src/app/features/components/transferir-saldo/transferir-saldo.ts`

Al abrir el modal:

1. Resetea formulario.
2. Si se abrio desde una tarjeta, precarga `cuentaOrigenId`.
3. Carga cuentas activas con `consultarCuentasActivas()`.

Validaciones:

- Debe existir cuenta origen.
- Debe existir cuenta destino.
- Origen y destino no pueden ser iguales.
- El monto debe ser mayor a cero.
- El monto no puede superar el saldo disponible de la cuenta origen.

Payload:

```ts
{
  id_cuenta_origen: this.transferencia.cuentaOrigen,
  id_cuenta_destino: this.transferencia.cuentaDestino,
  monto: Number(this.transferencia.monto),
  descripcion: this.transferencia.descripcion.trim() || 'Transferencia entre cuentas',
  notas: this.transferencia.notas.trim()
}
```

Endpoint:

```http
POST /api/cuentas/transferir-saldo
```

Al completarse correctamente:

- Muestra toast de exito.
- Cierra el modal.
- `CuentasService.transferirSaldo()` emite refresh para recargar cuentas/balance.

## Pagar tarjeta de credito

Archivo: `src/app/features/components/pagar-tarjeta-modal/pagar-tarjeta-modal.ts`

Este flujo es una transferencia con experiencia separada para cuentas de tipo `CREDITO`.

Desde `AccountCard`:

- Solo aparece la opcion `Pagar saldo` cuando `tipo === 'CREDITO'`.
- Se deshabilita si la cuenta esta inactiva o si no hay saldo pendiente por pagar.
- Emite `payRequested` con el `id` de la cuenta de credito.

En la pantalla de cuentas:

- `Cuentas.abrirModalPagoTarjeta(idCuentaDestino)` abre el modal.
- `cuentaDestinoId` es la tarjeta que recibira el pago.

En la pantalla de detalle de cuenta:

- El boton `Pagar Tarjeta` aparece solo si `cuenta.tipo === 'CREDITO'`.
- `CuentaDetalle.abrirModalPagoTarjeta()` abre el mismo `PagarTarjetaModal`.
- Al cerrar el modal, `CuentaDetalle.cerrarModalPagoTarjeta()` recarga el detalle.

En el modal:

- La cuenta destino queda fija: es la tarjeta de credito seleccionada.
- El usuario elige la cuenta origen, es decir, la cuenta que paga.
- No se capturan `descripcion` ni `notas` en la UI.
- El monto debe ser mayor a cero.
- El monto no puede superar el saldo disponible de la cuenta origen.
- El monto no puede superar el saldo pendiente de la tarjeta.

Payload usado:

```ts
{
  id_cuenta_origen: cuentaOrigen,
  id_cuenta_destino: cuentaDestinoCredito,
  monto,
  descripcion: `Pago de tarjeta ${nombreCuentaDestino}`,
  notas: ''
}
```

Endpoint:

```http
POST /api/cuentas/transferir-saldo
```

Esto genera una salida en la cuenta origen y una entrada en la cuenta destino de credito.

## Cuentas en movimientos

Archivo: `src/app/features/components/nuevo-movimiento-modal/nuevo-movimiento-modal.ts`

Al abrir el modal de nuevo movimiento:

- Carga etiquetas.
- Carga tipos de movimiento.
- Carga cuentas activas con `consultarCuentasActivas()`.
- Si existe una cuenta llamada `Efectivo`, la selecciona por defecto.

Al guardar:

- Si `tipoMovimiento === 2`, convierte el monto a negativo.
- Envia el movimiento a `MovimientosService.crearMovimiento()`.

Esto implica que los movimientos solo pueden registrarse sobre cuentas activas.

## Balance y refrescos

Hay dos servicios que manejan notificaciones de refresh:

- `CuentasService.refreshBalanceObservable$`: se emite al crear cuenta o transferir saldo.
- `MovimientosService.refreshBalanceObservable$`: se emite al crear movimiento.

La pantalla de cuentas escucha el refresh de `CuentasService`.
El componente de balance general escucha el refresh de `MovimientosService`.

Punto a revisar si se busca consistencia total: despues de crear cuenta o transferir saldo, podria requerirse tambien refrescar el balance general si este no se actualiza por otro camino.

## Resumen rapido

- El usuario se identifica por JWT.
- Las cuentas se consultan con `GET /api/cuentas`.
- Las cuentas activas se usan para movimientos y transferencias.
- Crear cuenta y transferir saldo disparan recarga mediante `CuentasService`.
- `Efectivo` es una cuenta especial: se selecciona por defecto en movimientos y no se puede activar/desactivar desde la UI.
- Activar/desactivar cuenta usa actualizacion optimista y revierte si el backend falla.
