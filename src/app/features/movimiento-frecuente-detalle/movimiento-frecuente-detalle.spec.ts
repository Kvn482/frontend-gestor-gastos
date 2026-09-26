import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import Swal from 'sweetalert2';
import { MovimientoFrecuenteDetalle } from './movimiento-frecuente-detalle';
import { MovimientosService } from '../../core/services/movimientos.service';
import { CuentasService } from '../../core/services/cuentas.service';
import { ToastService } from '../../core/services/toast.service';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../../shared/utils/category-icons';

describe('MovimientoFrecuenteDetalle', () => {
  let component: MovimientoFrecuenteDetalle;
  let fixture: ComponentFixture<MovimientoFrecuenteDetalle>;
  let router: Router;

  const mockCuentas = [
    { id: 'uuid-cuenta-1', nombre: 'Efectivo', tipo: 'Efectivo' },
    { id: 'uuid-cuenta-2', nombre: 'BBVA Débito', tipo: 'Débito' },
  ];

  const mockEtiquetas = [
    { id: 100, nombre: 'Cafetería', color: '#f59e0b', icono: 'coffee', tipo: 'gasto' },
    { id: 101, nombre: 'Salario', color: '#10b981', icono: 'briefcase', tipo: 'ingreso' },
  ];

  const mockFrecuentes = [
    {
      id: 5,
      nombre: 'Gasolina',
      tipoMovimiento: 2,
      monto: 500,
      cuentaId: 'uuid-cuenta-2',
      cuentaNombre: 'BBVA Débito',
      categoriaId: 100,
      categoriaNombre: 'Cafetería',
      categoriaColor: '#f59e0b',
      categoriaIcono: 'coffee',
    },
  ];

  const movimientosServiceMock = {
    consultarMovimientosRapidos: vi.fn(() => of(mockFrecuentes)),
    consultarEtiquetas: vi.fn(() => of(mockEtiquetas)),
    crearMovimientoRapido: vi.fn(() => of({ id: 10 })),
    actualizarMovimientoRapido: vi.fn(() => of({ id: 5 })),
    eliminarMovimientoRapido: vi.fn(() => of({ success: true })),
  };

  const cuentasServiceMock = {
    consultarCuentasActivas: vi.fn(() => of(mockCuentas)),
  };

  const toastServiceMock = {
    show: vi.fn(),
  };

  const setupTestBed = async (paramId: string | null = 'nuevo', stateData: any = null) => {
    vi.clearAllMocks();
    movimientosServiceMock.consultarMovimientosRapidos.mockReturnValue(of(mockFrecuentes));
    movimientosServiceMock.consultarEtiquetas.mockReturnValue(of(mockEtiquetas));
    cuentasServiceMock.consultarCuentasActivas.mockReturnValue(of(mockCuentas));

    if (stateData) {
      window.history.pushState(stateData, '');
    } else {
      window.history.pushState({}, '');
    }

    await TestBed.configureTestingModule({
      imports: [MovimientoFrecuenteDetalle],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideIcons(CATEGORY_ICONS_MAP),
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: CuentasService, useValue: cuentasServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: paramId ?? 'nuevo' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientoFrecuenteDetalle);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('debe inicializarse en modo creación y asignar la primera cuenta por defecto', async () => {
    await setupTestBed('nuevo');

    expect(component.esNuevo).toBe(true);
    expect(component.idFrecuente).toBeNull();
    expect(component.form.cuentaId).toBe('uuid-cuenta-1');
    expect(component.formValido).toBe(false);
  });

  it('debe guardar un nuevo movimiento frecuente cuando los campos son válidos', async () => {
    await setupTestBed('nuevo');

    component.form.nombre = 'Almuerzo semanal';
    component.form.monto = '180';
    component.form.categoria = mockEtiquetas[0];
    component.form.cuentaId = 'uuid-cuenta-2';

    expect(component.formValido).toBe(true);
    expect(component.hayCambios).toBe(true);

    component.guardar();

    expect(movimientosServiceMock.crearMovimientoRapido).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Almuerzo semanal',
        monto: 180,
        cuentaId: 'uuid-cuenta-2',
        categoriaId: 100,
        tipoMovimiento: 2,
      })
    );
    expect(toastServiceMock.show).toHaveBeenCalledWith('✓ Atajo frecuente guardado', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/movimientos-frecuentes']);
  });

  it('debe inicializarse en modo edición y preseleccionar la cuenta correcta del atajo', async () => {
    await setupTestBed('5');

    expect(component.esNuevo).toBe(false);
    expect(component.idFrecuente).toBe('5');
    expect(component.form.nombre).toBe('Gasolina');
    expect(component.form.monto).toBe('500');
    expect(component.form.cuentaId).toBe('uuid-cuenta-2');
    expect(component.cuentaSeleccionadaNombre).toBe('BBVA Débito');
  });

  it('debe actualizar el atajo enviando el ID de cuenta como UUID string', async () => {
    await setupTestBed('5');

    component.form.nombre = 'Gasolina Premium';
    component.form.monto = '650';

    expect(component.hayCambios).toBe(true);

    component.guardar();

    expect(movimientosServiceMock.actualizarMovimientoRapido).toHaveBeenCalledWith(
      '5',
      expect.objectContaining({
        nombre: 'Gasolina Premium',
        monto: 650,
        cuentaId: 'uuid-cuenta-2',
      })
    );
    expect(toastServiceMock.show).toHaveBeenCalledWith('✓ Atajo frecuente actualizado', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/movimientos-frecuentes']);
  });

  it('debe eliminar el atajo frecuente si el usuario confirma en el modal de alerta', async () => {
    await setupTestBed('5');
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as any);

    await component.eliminar();

    expect(movimientosServiceMock.eliminarMovimientoRapido).toHaveBeenCalledWith('5');
    expect(toastServiceMock.show).toHaveBeenCalledWith('✓ Atajo frecuente eliminado', 'success');
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/movimientos-frecuentes']);
  });

  it('debe solicitar confirmación al volver si hay cambios sin guardar', async () => {
    await setupTestBed('5');
    const swalSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false } as any);

    component.form.nombre = 'Cambio no guardado';
    expect(component.hayCambios).toBe(true);

    await component.volver();

    expect(swalSpy).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('debe permitir seleccionar y quitar múltiples etiquetas', async () => {
    await setupTestBed('nuevo');

    const cat1 = mockEtiquetas[0];
    const cat2 = mockEtiquetas[1];

    component.seleccionarCategoria(cat1);
    expect(component.estaEtiquetaSeleccionada(cat1)).toBe(true);
    expect(component.form.etiquetas.length).toBe(1);

    component.seleccionarCategoria(cat2);
    expect(component.estaEtiquetaSeleccionada(cat2)).toBe(true);
    expect(component.form.etiquetas.length).toBe(2);

    component.quitarEtiqueta(cat1);
    expect(component.estaEtiquetaSeleccionada(cat1)).toBe(false);
    expect(component.estaEtiquetaSeleccionada(cat2)).toBe(true);
    expect(component.form.etiquetas.length).toBe(1);
  });

  it('debe enviar una sola solicitud al guardar con doble clic y conexión lenta', async () => {
    await setupTestBed('nuevo');
    const respuestaPendiente = new Subject<any>();
    movimientosServiceMock.crearMovimientoRapido.mockReturnValue(respuestaPendiente);
    component.form.nombre = 'Almuerzo';
    component.form.monto = '180';
    component.form.etiquetas = [mockEtiquetas[0]];
    component.form.categoria = mockEtiquetas[0];
    component.form.cuentaId = 'uuid-cuenta-1';

    component.guardar();
    component.guardar();

    expect(movimientosServiceMock.crearMovimientoRapido).toHaveBeenCalledTimes(1);
    expect(component.guardando).toBe(true);
    respuestaPendiente.next({ id: 10 });
    respuestaPendiente.complete();
  });
});

