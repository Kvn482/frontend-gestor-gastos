import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Perfil } from './perfil';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { provideRouter } from '@angular/router';

describe('Perfil', () => {
  let component: Perfil;
  let fixture: ComponentFixture<Perfil>;

  const authServiceMock = {
    getCurrentUser: () => ({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com' }),
    actualizarPerfil: () => of({ success: true }),
    actualizarAvatar: () => of({ avatar_url: 'https://example.com/avatar.png' }),
    notificarActualizacionPerfil: () => {},
    notificarActualizacionAvatar: () => {},
    getPerfil: () => of({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com' }),
    perfilActualizado$: of({ nombre: 'Kevin', apellido: 'Rivas' }),
    avatarActualizado$: of('https://example.com/avatar.png'),
  };

  const toastServiceMock = {
    show: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente e inicializar el perfil', () => {
    expect(component).toBeTruthy();
    expect(component.perfil.nombre).toBe('Kevin');
    expect(component.perfil.apellido).toBe('Rivas');
    expect(component.perfil.email).toBe('kevin@test.com');
  });

  it('debe calcular el nombre completo e iniciales adecuadamente', () => {
    expect(component.nombreCompleto).toBe('Kevin Rivas');
    expect(component.iniciales).toBe('KR');
  });

  it('debe permitir guardar el perfil si los campos son válidos', () => {
    component.perfil.nombre = 'Carlos';
    component.perfil.apellido = 'Gómez';
    component.guardarPerfil();
    expect(component.guardadoExitoso).toBe(true);
  });
});
