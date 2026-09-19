import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UltimosMovimientos } from './ultimos-movimientos';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../utils/category-icons';
import { of } from 'rxjs';

describe('UltimosMovimientos', () => {
  let component: UltimosMovimientos;
  let fixture: ComponentFixture<UltimosMovimientos>;

  const movimientosServiceMock = {
    consultarUltimosMovimientos: () =>
      of([
        {
          id: 1,
          descripcion: 'Pago de nómina',
          monto: 2800,
          id_tipo_movimiento: 1,
          fecha: '2026-09-18',
          cuenta: 'BBVA Débito',
          etiquetas: [
            { id: 1, nombre: 'Sueldo', color: '#10b981', icono: 'salary' },
          ],
        },
        {
          id: 2,
          descripcion: 'Supermercado Chedraui',
          monto: 94,
          id_tipo_movimiento: 2,
          fecha: '2026-09-17',
          cuenta: 'Efectivo',
          etiquetas: [
            { id: 2, nombre: 'Supermercado', color: '#f59e0b', icono: 'shopping' },
          ],
        },
      ]),
    refreshBalanceObservable$: of(),
    eliminarMovimiento: () => of({ message: 'OK' }),
    consultarEtiquetas: () => of([
      { id: 1, nombre: 'Sueldo', color: '#10b981', icono: 'salary' },
      { id: 2, nombre: 'Supermercado', color: '#f59e0b', icono: 'shopping' },
      { id: 3, nombre: 'Entretenimiento', color: '#ec4899', icono: 'film' },
    ]),
  };

  const toastServiceMock = {
    show: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UltimosMovimientos],
      providers: [
        provideRouter([]),
        provideIcons(CATEGORY_ICONS_MAP),
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UltimosMovimientos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe agrupar movimientos cronológicamente por día', () => {
    expect(component.gruposMovimientos.length).toBe(2);
    expect(component.gruposMovimientos[0].movimientos.length).toBe(1);
    expect(component.gruposMovimientos[0].totalDia).toBe(2800);
    expect(component.gruposMovimientos[1].totalDia).toBe(-94);
  });

  it('debe resolver el icono y color de la etiqueta principal', () => {
    const mov = component.todosLosMovimientos[0];
    expect(component.obtenerIconoMovimiento(mov)).toBe('lucideBriefcase');
    expect(component.obtenerColorMovimiento(mov)).toBe('#10b981');
    expect(component.obtenerNombreEtiquetaPrincipal(mov)).toBe('Sueldo');
  });

  it('debe filtrar movimientos por etiqueta o descripción', () => {
    component.busqueda = 'Chedraui';
    expect(component.movimientos.length).toBe(1);
    expect(component.gruposMovimientos.length).toBe(1);
    expect(component.movimientos[0].descripcion).toBe('Supermercado Chedraui');

    component.busqueda = 'Sueldo';
    expect(component.movimientos.length).toBe(1);
    expect(component.movimientos[0].descripcion).toBe('Pago de nómina');
  });

  it('debe calcular montoAbsoluto y formatear montos negativos correctamente', () => {
    expect(component.montoAbsoluto(-50)).toBe(50);
    expect(component.montoAbsoluto(50)).toBe(50);
  });
});
