import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Settings } from './settings';
import { AuthService } from '../../core/services/auth.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';

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
  };

  const movimientosServiceMock = {
    consultarEtiquetas: () => of([]),
    consultarMovimientos: () => of([]),
    crearEtiqueta: () => of({ id: 1, nombre: 'Test', color: '#14b8a6', id_usuario: 1 }),
    eliminarEtiqueta: () => of({ success: true }),
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

  it('debe permitir cambiar de tema', () => {
    component.seleccionarTema('claro');
    expect(component.temaActual).toBe('claro');
    expect(component.temaActualLabel).toBe('Claro');
  });

  it('debe permitir cambiar de moneda', () => {
    component.seleccionarMoneda('EUR');
    expect(component.monedaActual).toBe('EUR');
  });

  it('debe alternar safeToSpend', () => {
    const estadoInicial = component.safeToSpend;
    component.toggleSafeToSpend();
    expect(component.safeToSpend).toBe(!estadoInicial);
  });
});

