import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Settings } from './settings';
import { AuthService } from '../../core/services/auth.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';

import { CuentasService } from '../../core/services/cuentas.service';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;

  const authServiceMock = {
    getCurrentUser: () => ({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com' }),
    actualizarPerfil: () => of({ success: true }),
    actualizarAvatar: () => of({ avatar_url: 'https://example.com/avatar.png' }),
    cambiarContrasena: () => of({ success: true }),
    notificarActualizacionPerfil: () => {},
    notificarActualizacionAvatar: () => {},
    logout: () => {},
    getPerfil: () => of({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com', avatar_url: '' }),
    perfilActualizado$: of({ nombre: 'Kevin', apellido: 'Rivas' }),
    avatarActualizado$: of('https://example.com/avatar.png'),
  };

  const movimientosServiceMock = {
    consultarEtiquetas: () => of([]),
    consultarMovimientos: () => of([]),
    consultarMovimientosRapidos: () => of([]),
    crearMovimientoRapido: () => of({ id: 1 }),
    actualizarMovimientoRapido: () => of({ id: 1 }),
    eliminarMovimientoRapido: () => of({ success: true }),
    crearEtiqueta: () => of({ id: 1, nombre: 'Test', color: '#14b8a6', id_usuario: 1 }),
    eliminarEtiqueta: () => of({ success: true }),
  };

  const cuentasServiceMock = {
    consultarCuentasActivas: () => of([]),
  };

  const toastServiceMock = {
    show: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: MovimientosService, useValue: movimientosServiceMock },
        { provide: CuentasService, useValue: cuentasServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar perfil', () => {
    expect(component).toBeTruthy();
    expect(component.perfil.nombre).toBe('Kevin');
    expect(component.perfil.apellido).toBe('Rivas');
    expect(component.perfil.email).toBe('kevin@test.com');
  });

  it('debe calcular el nombre completo correctamente', () => {
    expect(component.nombreCompleto).toBe('Kevin Rivas');
  });

  it('debe calcular las iniciales correctamente', () => {
    expect(component.iniciales).toBe('KR');
  });

  it('debe abrir y cerrar modal de contraseña limpiando campos', () => {
    component.abrirModalContrasena();
    expect(component.modalContrasenaAbierto).toBe(true);
    component.contrasena.actual = '123456';
    component.cerrarModalContrasena();
    expect(component.modalContrasenaAbierto).toBe(false);
    expect(component.contrasena.actual).toBe('');
  });

  it('debe permitir cambiar de tema', () => {
    component.seleccionarTema('claro');
    expect(component.temaActual).toBe('claro');
    expect(component.temaActualLabel).toBe('Claro');
  });

  it('debe permitir cambiar de moneda', () => {
    component.seleccionarMoneda('EUR');
    expect(component.monedaActual).toBe('EUR');
  });

  it('debe abrir modal de movimientos frecuentes e inicializar vista en lista', () => {
    component.abrirMovimientosFrecuentes();
    expect(component.modalFrecuentesAbierto).toBe(true);
    expect(component.vistaFrecuentes).toBe('lista');
  });

  it('debe preparar el formulario para crear un nuevo movimiento frecuente sin valores preseleccionados', () => {
    component.cuentasFrecuentes = [{ id: 5, nombre: 'Débito' }];
    component.categoriasFrecuentes = [{ id: 10, nombre: 'Comida', icono: 'utensils', color: '#ff5500' }];
    component.abrirCrearFrecuente();
    expect(component.vistaFrecuentes).toBe('formulario');
    expect(component.editandoFrecuenteId).toBeNull();
    expect(component.frecuenteForm.tipoMovimiento).toBe(2);
    expect(component.frecuenteForm.cuenta).toBe('');
    expect(component.frecuenteForm.categoria).toBeNull();
  });

  it('no debe guardar frecuente si falta etiqueta o cuenta', () => {
    const toastSpy = vi.spyOn(component.toastService, 'show');
    component.abrirCrearFrecuente();
    component.frecuenteForm.nombre = 'Café';
    component.frecuenteForm.monto = '50';
    // Sin categoría
    component.guardarFrecuente();
    expect(toastSpy).toHaveBeenCalledWith('Selecciona una etiqueta para el movimiento frecuente', 'warning');

    // Con categoría pero sin cuenta
    component.frecuenteForm.categoria = { id: 10 };
    component.guardarFrecuente();
    expect(toastSpy).toHaveBeenCalledWith('Selecciona una cuenta asociada', 'warning');
  });

  it('debe preparar el formulario para editar un movimiento frecuente existente', () => {
    const item = {
      id: 99,
      nombre: 'Almuerzo Trabajo',
      tipoMovimiento: 2,
      monto: 150,
      cuentaId: 5,
      cuentaNombre: 'Débito',
      categoriaId: 10,
      categoriaNombre: 'Comida',
      categoriaIcono: 'utensils',
      categoriaColor: '#ff5500',
    };
    component.abrirEditarFrecuente(item);
    expect(component.vistaFrecuentes).toBe('formulario');
    expect(component.editandoFrecuenteId).toBe(99);
    expect(component.frecuenteForm.nombre).toBe('Almuerzo Trabajo');
    expect(component.frecuenteForm.monto).toBe(150);
  });

  it('debe regresar a la lista de frecuentes con volverAListaFrecuentes', () => {
    component.vistaFrecuentes = 'formulario';
    component.volverAListaFrecuentes();
    expect(component.vistaFrecuentes).toBe('lista');
  });
});


