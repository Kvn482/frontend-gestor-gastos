import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import Swal from 'sweetalert2';
import { MovimientosFrecuentes } from './movimientos-frecuentes';
import { MovimientosService } from '../../core/services/movimientos.service';
import { CuentasService } from '../../core/services/cuentas.service';
import { ToastService } from '../../core/services/toast.service';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../../shared/utils/category-icons';

describe('MovimientosFrecuentes', () => {
  let component: MovimientosFrecuentes;
  let fixture: ComponentFixture<MovimientosFrecuentes>;
  let router: Router;

  const mockFrecuentes = [
    {
      id: 1,
      nombre: 'Café matutino',
      tipoMovimiento: 2,
      monto: 65,
      cuentaId: 'uuid-cuenta-1',
      cuentaNombre: 'BBVA Débito',
      categoriaId: 100,
      categoriaNombre: 'Cafetería',
      categoriaColor: '#f59e0b',
      categoriaIcono: 'coffee',
    },
    {
      id: 2,
      nombre: 'Nómina',
      tipoMovimiento: 1,
      monto: 15000,
      cuentaId: 'uuid-cuenta-1',
      cuentaNombre: 'BBVA Débito',
      categoriaId: 101,
      categoriaNombre: 'Salario',
      categoriaColor: '#10b981',
      categoriaIcono: 'briefcase',
    },
  ];

  const movimientosServiceMock = {
    consultarMovimientosRapidos: vi.fn(() => of(mockFrecuentes)),
    consultarEtiquetas: vi.fn(() =>
      of([
        { id: 100, nombre: 'Cafetería', color: '#f59e0b', icono: 'coffee' },
        { id: 101, nombre: 'Salario', color: '#10b981', icono: 'briefcase' },
      ])
    ),
    crearMovimientoRapido: vi.fn(() => of({ id: 3 })),
    actualizarMovimientoRapido: vi.fn(() => of({ id: 1 })),
    eliminarMovimientoRapido: vi.fn(() => of({ success: true })),
  };

  const cuentasServiceMock = {
    consultarCuentasActivas: vi.fn(() =>
      of([{ id: 'uuid-cuenta-1', nombre: 'BBVA Débito', tipo: 'Débito' }])
    ),
  };

  const toastServiceMock = {
    show: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    movimientosServiceMock.consultarMovimientosRapidos.mockReturnValue(of(mockFrecuentes));

    await TestBed.configureTestingModule({
      imports: [MovimientosFrecuentes],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIcons(CATEGORY_ICONS_MAP),
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: CuentasService, useValue: cuentasServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientosFrecuentes);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('debe crearse y cargar datos iniciales correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.movimientosFrecuentes.length).toBe(2);
    expect(component.cuentas.length).toBe(1);
    expect(component.etiquetas.length).toBe(2);
    expect(component.totalFrecuentes).toBe(2);
    expect(component.totalGastos).toBe(1);
    expect(component.totalIngresos).toBe(1);
  });

  it('debe filtrar por tipo y por texto de búsqueda', () => {
    // Filtro Gastos
    component.filtroActivo = 'gasto';
    expect(component.frecuentesFiltrados.length).toBe(1);
    expect(component.frecuentesFiltrados[0].nombre).toBe('Café matutino');

    // Filtro Ingresos
    component.filtroActivo = 'ingreso';
    expect(component.frecuentesFiltrados.length).toBe(1);
    expect(component.frecuentesFiltrados[0].nombre).toBe('Nómina');

    // Búsqueda
    component.filtroActivo = 'todos';
    component.busqueda = 'café';
    expect(component.frecuentesFiltrados.length).toBe(1);
    expect(component.frecuentesFiltrados[0].nombre).toBe('Café matutino');

    component.busqueda = 'inexistente';
    expect(component.frecuentesFiltrados.length).toBe(0);
  });

  it('debe navegar a la pantalla de crear nuevo movimiento frecuente', () => {
    component.irACrear();
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/movimientos-frecuentes/nuevo']);
  });

  it('debe navegar a la pantalla de detalle/edición pasando el estado del atajo', () => {
    const item = mockFrecuentes[0];
    component.irADetalle(item);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/configuracion/movimientos-frecuentes', item.id],
      { state: { frecuente: item } }
    );
  });

  it('debe renderizar el label "Editar" con chevron en la lista', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const editarLabels = compiled.querySelectorAll('span');
    const encontrado = Array.from(editarLabels).some((el) => el.textContent?.trim() === 'Editar');
    expect(encontrado).toBe(true);
  });

  it('debe eliminar un atajo frecuente cuando el usuario confirma', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as any);

    await component.eliminar(1);

    expect(movimientosServiceMock.eliminarMovimientoRapido).toHaveBeenCalledWith(1);
    expect(toastServiceMock.show).toHaveBeenCalledWith('Atajo frecuente eliminado', 'warning');
    expect(component.movimientosFrecuentes.length).toBe(1);
  });

  it('debe calcular correctamente el conteo y nombre de etiquetas extra para un atajo', () => {
    const itemMulti: any = {
      id: 99,
      nombre: 'Despensa y Farmacia',
      tipoMovimiento: 2,
      monto: 300,
      cuentaNombre: 'BBVA Débito',
      etiquetas: [
        { id: 1, nombre: 'Supermercado' },
        { id: 2, nombre: 'Farmacia' },
        { id: 3, nombre: 'Hogar' },
      ],
    };

    expect(component.obtenerNombreEtiquetaPrincipal(itemMulti)).toBe('Supermercado');
    expect(component.conteoEtiquetasExtra(itemMulti)).toBe(2);
    expect(component.obtenerTextoEtiquetasExtra(itemMulti)).toBe('Farmacia, Hogar');

    const itemSimple: any = {
      id: 100,
      nombre: 'Gasolina',
      tipoMovimiento: 2,
      monto: 500,
      categoriaNombre: 'Auto',
      etiquetas: [{ id: 10, nombre: 'Auto' }],
    };

    expect(component.obtenerNombreEtiquetaPrincipal(itemSimple)).toBe('Auto');
    expect(component.conteoEtiquetasExtra(itemSimple)).toBe(0);
    expect(component.obtenerTextoEtiquetasExtra(itemSimple)).toBe('');
  });
});
