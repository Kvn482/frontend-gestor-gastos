import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Cuentas } from './cuentas';
import { CuentasService } from '../../core/services/cuentas.service';

describe('Cuentas', () => {
  let component: Cuentas;
  let fixture: ComponentFixture<Cuentas>;
  let cuentasService: CuentasService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cuentas],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Cuentas);
    component = fixture.componentInstance;
    cuentasService = TestBed.inject(CuentasService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe llamar a updateStatus al cambiar el estado de una cuenta', () => {
    component.cuentas = [
      { id: 'c1', nombre: 'Efectivo', status: 1 },
      { id: 'c2', nombre: 'Banco', status: 1 },
    ];

    const spyUpdate = vi.spyOn(cuentasService, 'updateStatus').mockReturnValue(of({} as any));

    component.onAccountStatusChange({ id: 'c1', status: 0 });

    expect(spyUpdate).toHaveBeenCalledWith('c1', 0);
    expect(component.cuentas[0].status).toBe(0);
  });
});
