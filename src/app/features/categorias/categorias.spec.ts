import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Categorias } from './categorias';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';

describe('Categorias', () => {
  let component: Categorias;
  let fixture: ComponentFixture<Categorias>;

  const etiquetasMock = [
    { id: 1, nombre: 'Comida', color: '#ef4444', id_usuario: null },
    { id: 2, nombre: 'Transporte', color: '#3b82f6', id_usuario: null },
    { id: 3, nombre: 'Gimnasio', color: '#10b981', id_usuario: 5 },
  ];

  const movimientosServiceMock = {
    consultarEtiquetas: () => of(etiquetasMock),
    crearEtiqueta: (data: any) => of({ id: 4, nombre: data.nombre, color: data.color, id_usuario: 5 }),
    eliminarEtiqueta: () => of({ success: true }),
  };

  const toastServiceMock = {
    show: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Categorias],
      providers: [
        provideRouter([]),
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Categorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente y cargar las etiquetas iniciales', () => {
    expect(component).toBeTruthy();
    expect(component.etiquetas.length).toBe(3);
    expect(component.totalCategorias).toBe(3);
  });

  it('debe filtrar adecuadamente entre etiquetas del sistema y del usuario', () => {
    expect(component.etiquetasPredeterminadas.length).toBe(2);
    expect(component.etiquetasUsuario.length).toBe(1);
    expect(component.etiquetasUsuario[0].nombre).toBe('Gimnasio');
  });

  it('debe permitir crear una nueva categoría si el nombre es válido', () => {
    component.nuevaEtiqueta = { nombre: 'Mascotas', color: '#a855f7' };
    component.crearEtiqueta();

    expect(component.etiquetas.length).toBe(4);
    expect(component.etiquetas.some((e) => e.nombre === 'Mascotas')).toBe(true);
    expect(component.nuevaEtiqueta.nombre).toBe('');
  });

  it('no debe llamar al servicio si el nombre está vacío', () => {
    const prevLength = component.etiquetas.length;
    component.nuevaEtiqueta = { nombre: '   ', color: '#6366f1' };
    component.crearEtiqueta();

    expect(component.etiquetas.length).toBe(prevLength);
  });
});

