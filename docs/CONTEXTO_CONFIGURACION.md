# Contexto: pantalla de configuracion

La pantalla de configuracion permite al usuario autenticado administrar datos basicos de perfil, avatar, cambio de contrasena y etiquetas personalizadas para clasificar movimientos.

## Ubicacion en la app

Ruta:

```ts
{ path: 'configuracion', component: Settings }
```

La ruta vive dentro del `Layout` protegido por `authGuard`, por lo que requiere sesion activa.

Archivos principales:

- `src/app/features/settings/settings.ts`
- `src/app/features/settings/settings.html`
- `src/app/features/settings/settings.css`
- `src/app/core/services/auth.service.ts`
- `src/app/core/services/movimientos.service.ts`
- `src/app/app.routes.ts`

Acceso visual:

- Menu de perfil en `src/app/layout/layout.html`

## Componente principal

Archivo: `src/app/features/settings/settings.ts`

El componente `Settings` es standalone y usa:

- `FormsModule` para formularios con `ngModel`.
- `RouterLink` para el enlace de regreso al dashboard.
- `AuthService` para perfil, avatar y contrasena.
- `MovimientosService` para etiquetas.
- `ToastService` para mensajes de exito/error.
- `takeUntilDestroyed` para limpiar subscripciones HTTP al destruir el componente.

Estado principal:

```ts
tabActivo: 'perfil' | 'etiquetas' = 'perfil'
perfil = { nombre: '', apellido: '', email: '' }
cargandoPerfil = false
avatarPreview: string | null = null
archivoAvatar: File | null = null
contrasena = { actual: '', nueva: '', confirmar: '' }
cargandoContrasena = false
etiquetas: Etiqueta[] = []
nuevaEtiqueta = { nombre: '', color: '#6366f1' }
creandoEtiqueta = false
```

## Flujo de inicializacion

Al inicializar:

1. Lee el usuario actual desde `authService.getCurrentUser()`.
2. Precarga `nombre`, `apellido` y `email`.
3. Precarga `avatarPreview` desde `localStorage.avatarOverride` o desde el usuario decodificado.
4. Carga etiquetas con `cargarEtiquetas()`.

El usuario actual proviene del JWT decodificado y puede mezclarse con `perfilOverride` guardado en `localStorage`.

## Tabs

La pantalla tiene dos tabs:

- `Perfil`
- `Etiquetas`

El estado activo se controla con:

```ts
tabActivo: 'perfil' | 'etiquetas'
```

Las clases visuales se calculan con:

```ts
getTabClass(tab: string): string
```

## Perfil

La seccion de perfil permite cambiar:

- Nombre
- Apellido
- Avatar

El correo electronico se muestra deshabilitado y no puede editarse desde esta pantalla.

### Guardar perfil

Metodo:

```ts
guardarPerfil()
```

Validaciones actuales:

- `nombre` requerido.
- `apellido` requerido.

Flujo:

1. Valida nombre y apellido.
2. Activa `cargandoPerfil`.
3. Llama `authService.actualizarPerfil({ nombre, apellido })`.
4. Si la respuesta es exitosa, notifica al layout con `notificarActualizacionPerfil()`.
5. Si hay archivo de avatar pendiente, sube `FormData` con `authService.actualizarAvatar(formData)`.
6. Si el avatar responde con URL, llama `notificarActualizacionAvatar(avatarUrl)`.
7. Limpia `archivoAvatar`, desactiva loading y muestra toast.

Endpoint de perfil:

```http
PATCH /api/auth/perfil
```

Endpoint de avatar:

```http
PATCH /api/auth/perfil/avatar
```

Payload de perfil:

```ts
{
  nombre: string
  apellido: string
}
```

Payload de avatar:

```ts
FormData {
  avatar: File
}
```

## Avatar

Metodo:

```ts
seleccionarAvatar(event)
```

Validaciones:

- Tipos permitidos: `image/jpeg`, `image/png`, `image/webp`.
- Tamano maximo: 2 MB.

Si la imagen es valida:

- Guarda el archivo en `archivoAvatar`.
- Genera una vista previa con `FileReader`.
- El avatar no se sube inmediatamente; se sube al guardar cambios.

Punto importante:

- Si el usuario selecciona un avatar nuevo y luego no guarda, la vista previa queda visible solo en memoria. No se persiste hasta `guardarPerfil()`.

## Cambio de contrasena

Metodo:

```ts
cambiarContrasena()
```

Validaciones actuales:

- La contrasena actual es requerida.
- La nueva contrasena debe tener al menos 6 caracteres.
- La confirmacion debe coincidir.

Endpoint:

```http
PATCH /api/auth/cambiar-contrasena
```

Payload:

```ts
{
  contrasenaActual: string
  nuevaContrasena: string
}
```

Al completarse correctamente:

- Limpia los campos de contrasena.
- Desactiva `cargandoContrasena`.
- Muestra toast de exito.

La UI incluye botones para mostrar/ocultar cada campo de contrasena.

## Etiquetas

La pantalla permite:

- Consultar etiquetas disponibles.
- Crear etiquetas personalizadas.
- Eliminar etiquetas del usuario.
- Mostrar etiquetas predeterminadas como no eliminables.

Modelo local usado:

```ts
interface Etiqueta {
  id: number
  nombre: string
  color: string
  id_usuario: number | null
}
```

### Cargar etiquetas

Metodo:

```ts
cargarEtiquetas()
```

Servicio:

```ts
movimientosService.consultarEtiquetas()
```

Endpoint:

```http
GET /api/movimientos/etiquetas
```

Actualmente no hay estado de carga ni manejo explicito de error para esta consulta.

### Crear etiqueta

Metodo:

```ts
crearEtiqueta()
```

Validaciones actuales:

- El nombre de la etiqueta es requerido.

Endpoint:

```http
POST /api/movimientos/etiquetas
```

Payload:

```ts
{
  nombre: string
  color: string
}
```

Al completarse correctamente:

- Agrega la etiqueta devuelta por el backend al arreglo local.
- Reinicia el formulario a nombre vacio y color `#6366f1`.
- Muestra toast de exito.

### Eliminar etiqueta

Metodo:

```ts
eliminarEtiqueta(id: number)
```

Endpoint:

```http
DELETE /api/movimientos/etiquetas/:id
```

Regla visual:

- Si `id_usuario` es `null`, se muestra como `Predeterminada` y no aparece boton de borrar.
- Si `id_usuario` tiene valor, se considera etiqueta del usuario y puede eliminarse.

Punto importante:

- Actualmente se elimina sin confirmacion previa.

## Relacion con el layout

El layout muestra nombre, apellido, email y avatar en el menu de perfil.

Archivo: `src/app/layout/layout.ts`

La pantalla de configuracion notifica cambios con:

```ts
authService.notificarActualizacionPerfil(nombre, apellido)
authService.notificarActualizacionAvatar(avatarUrl)
```

El `Layout` escucha:

```ts
perfilActualizado$
avatarActualizado$
```

Tambien consulta `authService.getPerfil()` al inicializar para refrescar datos reales desde backend.

## Servicios involucrados

`AuthService`:

- `getCurrentUser()`
- `actualizarPerfil(data)`
- `actualizarAvatar(formData)`
- `cambiarContrasena(data)`
- `getPerfil()`
- `notificarActualizacionPerfil(nombre, apellido)`
- `notificarActualizacionAvatar(avatarUrl)`

`MovimientosService`:

- `consultarEtiquetas()`
- `crearEtiqueta(data)`
- `eliminarEtiqueta(id)`

## Observaciones de UX

- La estructura es clara y consistente con el resto del dashboard.
- Las secciones estan separadas por tarjetas: informacion personal, contrasena, nueva etiqueta y lista de etiquetas.
- El cambio de avatar muestra vista previa antes de guardar.
- Los botones principales tienen estado deshabilitado durante la operacion.
- Las etiquetas tienen swatches de color y vista previa.

Puntos mejorables:

- Agregar confirmacion antes de eliminar etiquetas.
- Agregar loading/error en la carga de etiquetas.
- Mostrar validaciones inline, no solo toast.
- Agregar `aria-label` a botones de ojo, swatches de color y boton de eliminar.
- Agregar estados de foco mas claros a los swatches.
- Deshabilitar submit cuando el formulario no tiene cambios reales.

## Riesgos tecnicos detectados

### Contrato de etiquetas

El modelo `CategoriasResponse` actual declara:

```ts
export interface CategoriasResponse {
  id: number
  categoria: string
  id_usuario: number | null
}
```

Pero la pantalla de configuracion espera:

```ts
{
  id: number
  nombre: string
  color: string
  id_usuario: number | null
}
```

Si el backend devuelve `categoria` en lugar de `nombre`, o no devuelve `color`, la lista de etiquetas podria mostrarse incorrectamente. Conviene unificar el contrato de etiquetas en el modelo compartido.

### `localStorage` como override

El perfil y avatar se cachean en `localStorage`:

- `perfilOverride`
- `avatarOverride`

Esto hace que la UI se actualice rapido, pero tambien puede dejar datos antiguos si el backend cambia fuera de esta pantalla. El layout compensa parcialmente con `getPerfil()`.

### Avatar tras error parcial

El perfil se actualiza antes que el avatar. Si `actualizarPerfil()` funciona pero `actualizarAvatar()` falla, el nombre/apellido ya quedaron guardados y notificados, pero el toast final indica error al subir avatar. Esta secuencia es valida, pero podria comunicarse mejor al usuario como exito parcial.

### Manejo de errores en etiquetas

`cargarEtiquetas()` no maneja error. Si falla la API, `etiquetas` queda vacio y el template muestra:

```txt
No hay etiquetas disponibles
```

Eso puede confundir un error de red/API con una lista vacia real.

## Verificacion realizada

Se ejecuto:

```bash
npm run build
```

Resultado:

- Build exitoso fuera del sandbox.
- La pantalla de configuracion no rompe compilacion.

Warnings globales detectados:

- `@import` en `src/styles.css` no aparece antes de todas las reglas.
- Bundle inicial excede el presupuesto configurado.
- `sweetalert2` aparece como dependencia CommonJS en otra pantalla.
- Algunas reglas CSS fueron omitidas por selector invalido.

Estos warnings no parecen especificos de `settings`.

## Resumen rapido

- `/configuracion` es una pantalla protegida dentro del layout principal.
- Administra perfil, avatar, contrasena y etiquetas.
- Perfil usa `PATCH /api/auth/perfil`.
- Avatar usa `PATCH /api/auth/perfil/avatar`.
- Contrasena usa `PATCH /api/auth/cambiar-contrasena`.
- Etiquetas usan endpoints bajo `/api/movimientos/etiquetas`.
- El layout se actualiza mediante subjects de `AuthService`.
- El principal riesgo funcional esta en el contrato de etiquetas (`categoria` vs `nombre/color`).
- La principal mejora UX pendiente es confirmar antes de eliminar etiquetas.
