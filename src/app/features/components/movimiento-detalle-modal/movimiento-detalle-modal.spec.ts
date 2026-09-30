import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MovimientoDetalleModal } from './movimiento-detalle-modal';

describe('MovimientoDetalleModal', () => {
  let component: MovimientoDetalleModal;
  let fixture: ComponentFixture<MovimientoDetalleModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimientoDetalleModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimientoDetalleModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should identify expense, income and transfer correctly', () => {
    component.movimiento = { id_tipo_movimiento: 1, monto: 100 };
    expect(component.esIngreso).toBe(true);
    expect(component.esTransferencia).toBe(false);

    component.movimiento = { id_tipo_movimiento: 2, monto: -50 };
    expect(component.esIngreso).toBe(false);
    expect(component.esTransferencia).toBe(false);

    component.movimiento = { id_tipo_movimiento: 3, monto: 200, id_transferencia: 10 };
    expect(component.esTransferencia).toBe(true);
  });

  it('should resolve origin and destination accounts correctly for transfers', () => {
    component.cuentas = [
      { id: 1, nombre: 'BBVA Débito' },
      { id: 2, nombre: 'Nu Ahorro' },
    ];

    // Egreso de transferencia
    component.movimiento = {
      id_tipo_movimiento: 2,
      id_cuenta: 1,
      id_cuenta_destino: 2,
      cuenta: 'BBVA Débito',
      monto: -500,
    };
    expect(component.esTransferencia).toBe(true);
    expect(component.cuentaOrigenNombre).toBe('BBVA Débito');
    expect(component.cuentaDestinoNombre).toBe('Nu Ahorro');

    // Ingreso de transferencia
    component.movimiento = {
      id_tipo_movimiento: 1,
      id_cuenta: 2,
      id_cuenta_destino: 1,
      cuenta: 'Nu Ahorro',
      monto: 500,
    };
    expect(component.esTransferencia).toBe(true);
    expect(component.cuentaOrigenNombre).toBe('BBVA Débito');
    expect(component.cuentaDestinoNombre).toBe('Nu Ahorro');
  });

  it('should resolve origin and destination accounts immediately from movimiento properties without waiting for cuentas', () => {
    component.cuentas = [];
    component.movimiento = {
      id_tipo_movimiento: 2,
      id_cuenta: 1,
      id_cuenta_destino: 2,
      cuenta: 'Santander',
      cuenta_destino: 'Mercado Pago',
      monto: -1200,
    };
    expect(component.esTransferencia).toBe(true);
    expect(component.cuentaOrigenNombre).toBe('Santander');
    expect(component.cuentaDestinoNombre).toBe('Mercado Pago');

    component.movimiento = {
      id_tipo_movimiento: 1,
      id_cuenta: 2,
      id_cuenta_destino: 1,
      cuenta: 'Mercado Pago',
      cuenta_destino: 'Santander',
      monto: 1200,
    };
    expect(component.esTransferencia).toBe(true);
    expect(component.cuentaOrigenNombre).toBe('Santander');
    expect(component.cuentaDestinoNombre).toBe('Mercado Pago');
  });

  it('should emit editRequested and deleteRequested', () => {
    let editEmitted = false;
    let deleteEmitted = false;

    component.editRequested.subscribe(() => (editEmitted = true));
    component.deleteRequested.subscribe(() => (deleteEmitted = true));

    component.solicitarEdicion();
    component.solicitarEliminacion();

    expect(editEmitted).toBe(true);
    expect(deleteEmitted).toBe(true);
  });

  it('conserva el día recibido al convertir una fecha sin hora para el detalle', () => {
    component.movimiento = { fecha: '2026-09-26' };

    const fecha = component.fechaDate as Date;

    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(8);
    expect(fecha.getDate()).toBe(26);
  });
});
