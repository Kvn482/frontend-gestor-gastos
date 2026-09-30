import { routes } from './app.routes';

describe('rutas de movimientos frecuentes', () => {
  const layoutRoute = routes.find((route) => route.path === '' && route.children);
  const children = layoutRoute?.children ?? [];

  it('debe exponer listado, creacion y edicion como rutas directas', () => {
    expect(children.find((route) => route.path === 'configuracion/movimientos-frecuentes')).toBeTruthy();
    expect(children.find((route) => route.path === 'configuracion/movimientos-frecuentes/nuevo')).toBeTruthy();
    expect(children.find((route) => route.path === 'configuracion/movimientos-frecuentes/:id')).toBeTruthy();
  });

  it('debe proteger creacion y edicion contra salida con cambios pendientes', () => {
    expect(
      children.find((route) => route.path === 'configuracion/movimientos-frecuentes/nuevo')?.canDeactivate
    ).toHaveLength(1);
    expect(
      children.find((route) => route.path === 'configuracion/movimientos-frecuentes/:id')?.canDeactivate
    ).toHaveLength(1);
  });

  it('debe redirigir las rutas antiguas a las rutas actuales', () => {
    expect(children.find((route) => route.path === 'movimientos-frecuentes')?.redirectTo)
      .toBe('configuracion/movimientos-frecuentes');
    expect(children.find((route) => route.path === 'movimientos-frecuentes/nuevo')?.redirectTo)
      .toBe('configuracion/movimientos-frecuentes/nuevo');
    expect(children.find((route) => route.path === 'movimientos-frecuentes/:id')?.redirectTo)
      .toBe('configuracion/movimientos-frecuentes/:id');
  });
});
