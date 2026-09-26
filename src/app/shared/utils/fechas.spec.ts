import { crearFechaLocal, formatearFechaLocal } from './fechas';

describe('utilidades de fechas locales', () => {
  it('crea la fecha en horario local sin restar un día', () => {
    const fecha = crearFechaLocal('2026-09-26');

    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(8);
    expect(fecha.getDate()).toBe(26);
  });

  it('mantiene día, mes y año al formatear para el historial', () => {
    expect(formatearFechaLocal('2026-09-26')).toBe('26/09/2026');
  });
});
