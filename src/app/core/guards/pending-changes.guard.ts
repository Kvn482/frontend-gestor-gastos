import { CanDeactivateFn } from '@angular/router';
import { MovimientoFrecuenteDetalle } from '../../features/movimiento-frecuente-detalle/movimiento-frecuente-detalle';

export const pendingChangesGuard: CanDeactivateFn<MovimientoFrecuenteDetalle> = (component) =>
  component.confirmarSalida();
