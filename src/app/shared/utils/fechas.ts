export function crearFechaLocal(fecha: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function formatearFechaLocal(fecha: string): string {
  if (!fecha) return '';

  return crearFechaLocal(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
