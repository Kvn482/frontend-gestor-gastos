import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Categorias } from './categorias';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { Router, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../../shared/utils/category-icons';

describe('Categorias', () => {
  let component: Categorias;
  let fixture: ComponentFixture<Categorias>;
  let router: Router;

  const etiquetasMock = [
    { id: 1, nombre: 'Comida', color: '#ef4444', id_usuario: null, tipo: 'gasto', icono: 'food' },
    { id: 2, nombre: 'Transporte', color: '#3b82f6', id_usuario: null, tipo: 'gasto', icono: 'transport' },
    { id: 3, nombre: 'Gimnasio', color: '#10b981', id_usuario: 5, tipo: 'gasto', icono: 'gym' },
    { id: 4, nombre: 'Sueldo', color: '#22c55e', id_usuario: null, tipo: 'ingreso', icono: 'salary' },
    { id: 5, nombre: 'Freelance', color: '#8b5cf6', id_usuario: 5, tipo: 'ingreso', icono: 'briefcase' },
  ];

  const movimientosServiceMock = {
    consultarEtiquetas: () => of(etiquetasMock),
  };

  const toastServiceMock = {
    show: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Categorias],
      providers: [
        provideRouter([]),
        provideIcons(CATEGORY_ICONS_MAP),
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(Categorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y cargar las etiquetas iniciales', () => {
    expect(component).toBeTruthy();
    expect(component.etiquetas.length).toBe(5);
    expect(component.totalCategorias).toBe(5);
    expect(component.totalGastos).toBe(3);
    expect(component.totalIngresos).toBe(2);
  });

  it('debe separar adecuadamente entre etiquetas del sistema y del usuario', () => {
    expect(component.etiquetasPredeterminadas.length).toBe(3);
    expect(component.etiquetasUsuario.length).toBe(2);
    expect(component.etiquetasUsuario.some((e) => e.nombre === 'Gimnasio')).toBe(true);
    expect(component.etiquetasUsuario.some((e) => e.nombre === 'Freelance')).toBe(true);
  });

  it('debe filtrar correctamente por tipo de movimiento (gasto / ingreso)', () => {
    // Inicialmente filtro 'todas'
    expect(component.filtroActivo).toBe('todas');
    expect(component.etiquetasFiltradasUsuario.length).toBe(2);
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(3);

    // Filtro 'gasto'
    component.filtroActivo = 'gasto';
    expect(component.etiquetasFiltradasUsuario.length).toBe(1);
    expect(component.etiquetasFiltradasUsuario[0].nombre).toBe('Gimnasio');
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(2);

    // Filtro 'ingreso'
    component.filtroActivo = 'ingreso';
    expect(component.etiquetasFiltradasUsuario.length).toBe(1);
    expect(component.etiquetasFiltradasUsuario[0].nombre).toBe('Freelance');
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(1);
    expect(component.etiquetasFiltradasPredeterminadas[0].nombre).toBe('Sueldo');
  });

  it('debe navegar hacia la pantalla de crear nueva categoría', () => {
    component.irACrear();
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/categorias/nueva']);
  });

  it('debe navegar hacia la pantalla de detalle de una categoría', () => {
    const categoriaSeleccionada = component.etiquetas[0];
    component.irADetalle(categoriaSeleccionada);
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion/categorias', 1]);
  });

  it('debe navegar hacia atrás a configuración', () => {
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion']);
  });

  it('debe filtrar categorías por nombre mediante la barra de búsqueda', () => {
    component.busqueda = 'gim';
    expect(component.etiquetasFiltradasUsuario.length).toBe(1);
    expect(component.etiquetasFiltradasUsuario[0].nombre).toBe('Gimnasio');
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(0);

    component.busqueda = 'transporte';
    expect(component.etiquetasFiltradasUsuario.length).toBe(0);
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(1);
    expect(component.etiquetasFiltradasPredeterminadas[0].nombre).toBe('Transporte');

    // Limpiar búsqueda
    component.busqueda = '';
    expect(component.etiquetasFiltradasUsuario.length).toBe(2);
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(3);
  });

  it('debe combinar búsqueda por texto con filtro de tipo de movimiento', () => {
    component.filtroActivo = 'gasto';
    component.busqueda = 'sueldo';
    expect(component.etiquetasFiltradasUsuario.length).toBe(0);
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(0);

    component.filtroActivo = 'ingreso';
    expect(component.etiquetasFiltradasPredeterminadas.length).toBe(1);
    expect(component.etiquetasFiltradasPredeterminadas[0].nombre).toBe('Sueldo');
  });

  it('debe resolver la ruta SVG del icono', () => {
    const path = component.getIconSvg('food');
    expect(path).toBeTruthy();
    expect(path.length).toBeGreaterThan(0);
  });
});
