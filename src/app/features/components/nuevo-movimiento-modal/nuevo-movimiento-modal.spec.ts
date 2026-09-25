import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { MovimientoRapido, NuevoMovimientoModal } from './nuevo-movimiento-modal';

describe('NuevoMovimientoModal', () => {
  let component: NuevoMovimientoModal;
  let fixture: ComponentFixture<NuevoMovimientoModal>;
  let auth: AuthService;
  let http: HttpTestingController;
  let tokenSequence = 0;
  const claveAnterior = 'monetra_movimientos_rapidos';
  const endpoint = `${environment.apiUrl}/api/movimientos-rapidos`;
  const atajoPrincipal: MovimientoRapido = {
    id: 1, nombre: 'Café principal', tipoMovimiento: 2, monto: 50,
    cuentaId: 'cuenta-principal', cuentaNombre: 'Efectivo',
    categoriaId: 10, categoriaNombre: 'Café', categoriaColor: '#123456', categoriaIcono: 'coffee',
  };
  const atajoSecundario = { ...atajoPrincipal, id: 2, nombre: 'Café secundario' };

  function iniciarSesion(id?: string) {
    const payload = btoa(JSON.stringify({
      id, jti: ++tokenSequence, exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    auth.saveSession(`eyJhbGciOiJIUzI1NiJ9.${payload}.firma`, 'refresh-de-prueba');
  }

  function cargarOnline(atajos: MovimientoRapido[]) {
    component.cargarMovimientosRapidos();
    http.expectOne(endpoint).flush(atajos);
  }

  function cargarOffline() {
    component.cargarMovimientosRapidos();
    http.expectOne(endpoint).error(new ProgressEvent('error'));
  }

  beforeEach(async () => {
    localStorage.clear();
    // Simula un navegador que actualiza desde la versión con respaldo compartido.
    localStorage.setItem(claveAnterior, JSON.stringify([atajoPrincipal]));
    await TestBed.configureTestingModule({
      imports: [NuevoMovimientoModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevoMovimientoModal);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('descarta el respaldo compartido anterior sin asignarlo al usuario actual', () => {
    iniciarSesion('secundario');
    cargarOffline();

    expect(localStorage.getItem(claveAnterior)).toBeNull();
    expect(component.movimientosRapidos()).toEqual([]);
  });

  it('permite consultar offline los atajos del mismo usuario incluso tras renovar el token', () => {
    iniciarSesion('principal');
    cargarOnline([atajoPrincipal]);
    iniciarSesion('principal');
    cargarOffline();

    expect(component.movimientosRapidos()).toEqual([atajoPrincipal]);
  });

  it('no muestra los atajos de la cuenta principal al iniciar otra sesión offline', () => {
    iniciarSesion('principal');
    cargarOnline([atajoPrincipal]);
    auth.logout();
    iniciarSesion('secundario');
    cargarOffline();

    expect(component.movimientosRapidos()).toEqual([]);
    expect(localStorage.getItem(`${claveAnterior}:principal`)).toBeNull();
  });

  it('mantiene respaldos separados aunque cambie el usuario sin ejecutar logout', () => {
    iniciarSesion('principal');
    cargarOnline([atajoPrincipal]);
    iniciarSesion('secundario');
    cargarOnline([atajoSecundario]);
    cargarOffline();
    expect(component.movimientosRapidos()).toEqual([atajoSecundario]);

    iniciarSesion('principal');
    cargarOffline();
    expect(component.movimientosRapidos()).toEqual([atajoPrincipal]);
  });

  it('limpia los respaldos al cerrar sesión sin borrar preferencias ajenas', () => {
    iniciarSesion('principal');
    cargarOnline([atajoPrincipal]);
    localStorage.setItem(claveAnterior, JSON.stringify([atajoPrincipal]));
    localStorage.setItem(`${claveAnterior}:secundario`, JSON.stringify([atajoSecundario]));
    localStorage.setItem('theme', 'dark');

    auth.logout();

    expect(localStorage.getItem(claveAnterior)).toBeNull();
    expect(localStorage.getItem(`${claveAnterior}:principal`)).toBeNull();
    expect(localStorage.getItem(`${claveAnterior}:secundario`)).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(component.movimientosRapidos()).toEqual([]);
  });

  it('cancela la consulta pendiente al cerrar sesión para que no restaure el respaldo', () => {
    iniciarSesion('principal');
    component.cargarMovimientosRapidos();
    const pendiente = http.expectOne(endpoint);

    auth.logout();
    iniciarSesion('principal');

    expect(pendiente.cancelled).toBe(true);
    cargarOffline();
    expect(component.movimientosRapidos()).toEqual([]);
  });

  it('ignora respuestas de otro usuario que llegan después de cambiar de cuenta', () => {
    iniciarSesion('principal');
    component.cargarMovimientosRapidos();
    const pendiente = http.expectOne(endpoint);
    iniciarSesion('secundario');
    cargarOnline([atajoSecundario]);

    pendiente.flush([atajoPrincipal]);

    expect(component.movimientosRapidos()).toEqual([atajoSecundario]);
    cargarOffline();
    expect(component.movimientosRapidos()).toEqual([atajoSecundario]);
    expect(localStorage.getItem(`${claveAnterior}:principal`)).toBeNull();
  });

  it('ignora errores de consultas anteriores sin reemplazar los atajos de la sesión nueva', () => {
    iniciarSesion('principal');
    component.cargarMovimientosRapidos();
    const pendiente = http.expectOne(endpoint);
    iniciarSesion('secundario');
    cargarOnline([atajoSecundario]);

    pendiente.error(new ProgressEvent('error'));

    expect(component.movimientosRapidos()).toEqual([atajoSecundario]);
  });

  it('no consulta ni recupera atajos sin una identidad de usuario', () => {
    iniciarSesion('principal');
    cargarOnline([atajoPrincipal]);
    iniciarSesion();

    component.cargarMovimientosRapidos();

    http.expectNone(endpoint);
    expect(component.movimientosRapidos()).toEqual([]);
  });

  it('muestra una lista vacía si el respaldo del usuario está corrupto', () => {
    iniciarSesion('principal');
    localStorage.setItem(`${claveAnterior}:principal`, '{json-invalido');

    cargarOffline();

    expect(component.movimientosRapidos()).toEqual([]);
  });
});
