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
- `updateStatus(id, status)`: `PATCH /api/cuentas/update-status`
- `transferirSaldo(data)`: `POST /api/cuentas/transferir-saldo`

Tambien expone `refreshBalanceObservable$`, un observable que notifica cambios cuando se crea una cuenta o se transfiere saldo.

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

## Tarjeta de cuenta

Archivos:

- `src/app/shared/account-card/account-card.ts`
- `src/app/shared/account-card/account-card.html`

Responsabilidades:

- Muestra saldo, nombre, tipo, color y estado visual de la cuenta.
- Si `status === 0`, la tarjeta usa un color gris en el gradiente.
- Emite `statusChanged` cuando se activa/desactiva.
- Emite `transferRequested` cuando se pide transferir desde esa cuenta.

Notas:

- La opcion `Transferir Saldo` se deshabilita si `status !== 1`.
- La cuenta llamada `Efectivo` no muestra la opcion de activar/desactivar.
- La accion `Ver` aparece en el menu, pero no tiene comportamiento implementado.

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
