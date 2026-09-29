import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Layout } from './layout';
import { AuthService } from '../core/services/auth.service';
import { ToastService } from '../core/services/toast.service';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  const authServiceMock = {
    getCurrentUser: () => ({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com' }),
    getPerfil: () => of({ nombre: 'Kevin', apellido: 'Rivas', email: 'kevin@test.com' }),
    perfilActualizado$: of({ nombre: 'Kevin', apellido: 'Rivas' }),
    avatarActualizado$: of(''),
    logout: vi.fn(),
  };
  const toastServiceMock = { show: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe mostrar un toast informativo al cambiar el tema desde el interruptor', () => {
    component.darkMode = false;

    component.toggleDarkMode();

    expect(component.darkMode).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(toastServiceMock.show).toHaveBeenCalledWith('Tema cambiado a Oscuro', 'info');
  });
});
