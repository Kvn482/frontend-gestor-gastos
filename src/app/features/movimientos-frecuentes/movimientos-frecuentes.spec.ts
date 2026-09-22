import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MovimientosFrecuentes } from './movimientos-frecuentes';
import { MovimientosService } from '../../core/services/movimientos.service';
import { CuentasService } from '../../core/services/cuentas.service';
import { ToastService } from '../../core/services/toast.service';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../../shared/utils/category-icons';

describe('MovimientosFrecuentes', () => {
  let component: MovimientosFrecuentes;
  let fixture: ComponentFixture<MovimientosFrecuentes>;

  const mockFrecuentes = [
    {
      id: 1,
      nombre: 'Café matutino',
      tipoMovimiento: 2,
      monto: 65,
      cuentaId: 10,
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
      cuentaId: 10,
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
      of([{ id: 10, nombre: 'BBVA Débito', tipo: 'Débito' }])
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

  it('debe preparar el formulario para nuevo movimiento frecuente', () => {
    component.abrirCrear();
    expect(component.modalFormularioAbierto).toBe(true);
    expect(component.editandoId).toBeNull();
    expect(component.form.nombre).toBe('');
    expect(component.form.tipoMovimiento).toBe(2);
    expect(component.form.cuentaId).toBe('10');
  });

  it('debe preparar el formulario para editar un movimiento frecuente', () => {
    component.abrirEditar(mockFrecuentes[0]);
    expect(component.modalFormularioAbierto).toBe(true);
    expect(component.editandoId).toBe(1);
    expect(component.form.nombre).toBe('Café matutino');
    expect(component.form.monto).toBe('65');
    expect(component.form.tipoMovimiento).toBe(2);
  });

  it('debe guardar un nuevo movimiento frecuente', () => {
    component.abrirCrear();
    component.form.nombre = 'Uber al trabajo';
    component.form.monto = '120';
    component.form.categoria = { id: 100, nombre: 'Transporte', color: '#6366f1', icono: 'car' };
    component.form.cuentaId = '10';

    component.guardar();

    expect(movimientosServiceMock.crearMovimientoRapido).toHaveBeenCalled();
    expect(toastServiceMock.show).toHaveBeenCalledWith('✓ Atajo frecuente guardado', 'success');
  });

  it('debe actualizar un movimiento frecuente existente', () => {
    component.abrirEditar(mockFrecuentes[0]);
    component.form.nombre = 'Café latte grande';
    component.form.monto = '85';

    component.guardar();

    expect(movimientosServiceMock.actualizarMovimientoRapido).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        nombre: 'Café latte grande',
        monto: 85,
      })
    );
    expect(toastServiceMock.show).toHaveBeenCalledWith('✓ Atajo frecuente actualizado', 'success');
  });
});
