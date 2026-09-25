import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CuentasService } from './cuentas.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('CuentasService', () => {
  let service: CuentasService;
  let authService: AuthService;
  let http: HttpTestingController;

  const apiCuentas = `${environment.apiUrl}/api/cuentas`;
  let tokenSequence = 0;

  function iniciarSesion(id?: string) {
    const payload = btoa(
      JSON.stringify({
        id,
        jti: ++tokenSequence,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    authService.saveSession(`eyJhbGciOiJIUzI1NiJ9.${payload}.firma`, 'refresh-de-prueba');
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CuentasService, AuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CuentasService);
    authService = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe cachear consultarCuentas y consultarCuentasActivas para el mismo usuario', () => {
    iniciarSesion('user-1');

    // Primera consulta de cuentas
    let cuentasRes: any;
    service.consultarCuentas().subscribe((res) => (cuentasRes = res));
    http.expectOne(apiCuentas).flush([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);
    expect(cuentasRes).toEqual([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);

    // Segunda consulta de cuentas: debe retornar desde caché sin hacer nueva petición HTTP
    let cuentasRes2: any;
    service.consultarCuentas().subscribe((res) => (cuentasRes2 = res));
    http.expectNone(apiCuentas);
    expect(cuentasRes2).toEqual([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);

    // Primera consulta de activas
    let activasRes: any;
    service.consultarCuentasActivas().subscribe((res) => (activasRes = res));
    http.expectOne(`${apiCuentas}/activas`).flush([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);
    expect(activasRes).toEqual([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);

    // Segunda consulta de activas: debe retornar desde caché
    let activasRes2: any;
    service.consultarCuentasActivas().subscribe((res) => (activasRes2 = res));
    http.expectNone(`${apiCuentas}/activas`);
    expect(activasRes2).toEqual([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);
  });

  it('debe invalidar la caché al cerrar sesión', () => {
    iniciarSesion('user-1');

    service.consultarCuentas().subscribe();
    http.expectOne(apiCuentas).flush([{ id: 'c1', saldo: 1000 }]);

    authService.logout();

    // Nueva sesión con otro usuario
    iniciarSesion('user-2');

    let cuentasUser2: any;
    service.consultarCuentas().subscribe((res) => (cuentasUser2 = res));
    const req = http.expectOne(apiCuentas);
    req.flush([{ id: 'c2', saldo: 500 }]);

    expect(cuentasUser2).toEqual([{ id: 'c2', saldo: 500 }]);
  });

  it('debe invalidar la caché si cambia el usuario sin hacer logout explícito', () => {
    iniciarSesion('user-1');

    service.consultarCuentas().subscribe();
    http.expectOne(apiCuentas).flush([{ id: 'c1', saldo: 1000 }]);

    // Cambia la sesión a user-2 sin recargar página
    iniciarSesion('user-2');

    let cuentasUser2: any;
    service.consultarCuentas().subscribe((res) => (cuentasUser2 = res));
    // Debe disparar una nueva petición http porque el usuario cambió
    const req = http.expectOne(apiCuentas);
    req.flush([{ id: 'c2', saldo: 200 }]);

    expect(cuentasUser2).toEqual([{ id: 'c2', saldo: 200 }]);
  });

  it('updateStatus debe invalidar la caché y notificar el cambio de balance', () => {
    iniciarSesion('user-1');

    // Cargar cuentas activas en caché
    service.consultarCuentasActivas().subscribe();
    http.expectOne(`${apiCuentas}/activas`).flush([
      { id: 'c1', nombre: 'Cuenta 1', status: 1 },
      { id: 'c2', nombre: 'Cuenta 2', status: 1 },
    ]);

    let refreshEmitido = false;
    service.refreshBalanceObservable$.subscribe(() => {
      refreshEmitido = true;
    });

    // Desactivar cuenta c2
    service.updateStatus('c2', 0).subscribe();
    const reqPatch = http.expectOne(`${apiCuentas}/update-status`);
    expect(reqPatch.request.body).toEqual({ id_cuenta: 'c2', status: 0 });
    reqPatch.flush({ message: 'Status actualizado' });

    expect(refreshEmitido).toBe(true);

    // Al consultar cuentas activas de nuevo, debe disparar petición HTTP porque la caché se invalidó
    let activasActualizadas: any;
    service.consultarCuentasActivas().subscribe((res) => (activasActualizadas = res));
    http.expectOne(`${apiCuentas}/activas`).flush([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);

    expect(activasActualizadas).toEqual([{ id: 'c1', nombre: 'Cuenta 1', status: 1 }]);
  });
});
