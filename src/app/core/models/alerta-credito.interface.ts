export type EstadoAlertaCredito =
  | 'atrasado'
  | 'vence-hoy'
  | 'corte-hoy'
  | 'corte-manana'
  | 'proximo';

export interface AlertaCredito {
  cuentaId: number | string;
  cuenta: string;
  titulo: string;
  detalle: string;
  fecha: string;
  monto?: number;
  estado: EstadoAlertaCredito;
  accion: string;
}
