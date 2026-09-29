import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { ToastService } from '../../core/services/toast.service';
import { Tema } from './tema';

describe('Tema', () => {
  let component: Tema;
  let fixture: ComponentFixture<Tema>;
  let router: Router;
  const toastServiceMock = { show: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    await TestBed.configureTestingModule({
      imports: [Tema],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Tema);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('debe cargar la preferencia guardada', () => {
    expect(component.temaActual).toBe('sistema');
    expect(component.temaActualLabel).toBe('Sistema');
  });

  it('debe aplicar y guardar los temas claro y oscuro', () => {
    component.seleccionarTema('oscuro');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(toastServiceMock.show).toHaveBeenCalledWith('Tema cambiado a Oscuro', 'info');

    component.seleccionarTema('claro');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(toastServiceMock.show).toHaveBeenCalledWith('Tema cambiado a Claro', 'info');
  });

  it('debe guardar la opcion del sistema', () => {
    component.seleccionarTema('sistema');
    expect(localStorage.getItem('theme')).toBe('system');
    expect(toastServiceMock.show).toHaveBeenCalledWith('Tema cambiado a Sistema', 'info');
  });

  it('debe volver a configuracion', () => {
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/configuracion']);
  });
});
