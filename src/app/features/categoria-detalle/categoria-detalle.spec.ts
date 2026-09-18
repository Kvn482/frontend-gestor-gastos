import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CategoriaDetalle } from './categoria-detalle';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { CATEGORY_ICONS_MAP } from '../../shared/utils/category-icons';

describe('CategoriaDetalle', () => {
  let component: CategoriaDetalle;
  let fixture: ComponentFixture<CategoriaDetalle>;

  const categoriasMock = [
    { id: 1, nombre: 'Comida', color: '#ef4444', tipo: 'gasto', icono: 'food', id_usuario: null },
    { id: 5, nombre: 'Gimnasio', color: '#10b981', tipo: 'gasto', icono: 'health', id_usuario: 2 },
  ];

  const movimientosServiceMock = {
    consultarEtiquetas: () => of(categoriasMock),
    crearEtiqueta: () => of({ success: true }),
    actualizarEtiqueta: () => of({ success: true }),
    eliminarEtiqueta: () => of({ success: true }),
  };

  const toastServiceMock = {
    show: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaDetalle],
      providers: [
        provideRouter([]),
        provideIcons(CATEGORY_ICONS_MAP),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({
              get: (key: string) => (key === 'id' ? 'nueva' : null),
            }),
          },
        },
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriaDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse en modo nueva categoría con icono por defecto tag', () => {
    expect(component).toBeTruthy();
    expect(component.esNueva).toBe(true);
    expect(component.categoria.nombre).toBe('');
    expect(component.categoria.tipo).toBe('gasto');
    expect(component.categoria.icono).toBe('tag');
    expect(component.modalIconoAbierto).toBe(false);
  });

  it('debe permitir cambiar tipo e icono', () => {
    component.seleccionarTipo('ingreso');
    expect(component.categoria.tipo).toBe('ingreso');

    component.seleccionarIcono('salary');
    expect(component.categoria.icono).toBe('salary');
  });

  it('debe abrir, filtrar y cerrar el modal de iconos al seleccionar', () => {
    component.abrirModalIcono();
    expect(component.modalIconoAbierto).toBe(true);

    component.busquedaIcono = 'salario';
    expect(component.iconosFiltrados.length).toBe(1);
    expect(component.iconosFiltrados[0].id).toBe('salary');

    component.seleccionarIcono('salary');
    expect(component.categoria.icono).toBe('salary');
    expect(component.modalIconoAbierto).toBe(false);

    component.abrirModalIcono();
    expect(component.modalIconoAbierto).toBe(true);
    component.cerrarModalIcono();
    expect(component.modalIconoAbierto).toBe(false);
  });

  it('no debe permitir guardar si el nombre está vacío', () => {
    component.categoria.nombre = '   ';
    component.guardar();
    expect(component.guardando).toBe(false);
  });

  it('debe cargar los datos de una categoría existente desde el servicio', () => {
    component.cargarCategoria(5, false);
    expect(component.categoria.nombre).toBe('Gimnasio');
    expect(component.categoria.tipo).toBe('gasto');
    expect(component.esCategoriaUsuario).toBe(true);
    expect(component.cargando).toBe(false);
  });

  it('debe identificar correctamente una etiqueta del sistema predeterminada', () => {
    component.esNueva = false;
    component.cargarCategoria(1, false);
    expect(component.categoria.nombre).toBe('Comida');
    expect(component.esCategoriaUsuario).toBe(false);
  });
});

