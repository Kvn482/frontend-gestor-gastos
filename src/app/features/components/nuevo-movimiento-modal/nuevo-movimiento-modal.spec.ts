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

  function abrirModalNuevo() {
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    http.expectOne(endpoint).flush([]);
    http.expectOne(`${environment.apiUrl}/api/movimientos/etiquetas`).flush([
      { id: 10, nombre: 'Comida', tipo: 'gasto' },
    ]);
    http.expectOne(`${environment.apiUrl}/api/movimientos/tipos-movimiento`).flush([]);
    const solicitudesCuentas = http.match(`${environment.apiUrl}/api/cuentas/activas`);
    solicitudesCuentas.forEach((solicitud) => solicitud.flush([
      { id: 'cuenta-1', nombre: 'Efectivo', tipo: 'EFECTIVO', saldo_actual: 1000 },
    ]));
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
    vi.useRealTimers();
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

  it('al crear un atajo frecuente de ingreso, categoriasFiltradas filtra por tipo ingreso', () => {
    component.etiquetasDisponibles = [
      { id: 1, nombre: 'Comida', tipo: 'gasto' },
      { id: 2, nombre: 'Salario', tipo: 'ingreso' },
      { id: 3, nombre: 'Freelance', tipo: 'Ingreso' },
      { id: 4, nombre: 'General' },
    ];

    // Simula navegación a crear frecuente y selección de Ingreso Habitual (tipo 1)
    component.irACrearFrecuente();
    component.cambiarTipoFrecuente(1);
    component.abrirSelectorCategoriasFrecuente();

    const filtradas = component.categoriasFiltradas;
    const nombres = filtradas.map((c) => c.nombre);

    expect(nombres).toContain('Salario');
    expect(nombres).toContain('Freelance');
    expect(nombres).toContain('General');
    expect(nombres).not.toContain('Comida');
  });

  it('cambiarTipoFrecuente poda etiquetas incongruentes con el nuevo tipo', () => {
    component.nuevoFrecuente = {
      nombre: 'Prueba',
      tipoMovimiento: 2, // Gasto
      monto: '100',
      cuenta: '1',
      etiquetas: [
        { id: 1, nombre: 'Comida', tipo: 'gasto' },
        { id: 2, nombre: 'SinTipo' },
      ],
      categoria: { id: 1, nombre: 'Comida', tipo: 'gasto' },
    };

    // Cambia a ingreso
    component.cambiarTipoFrecuente(1);

    expect(component.nuevoFrecuente.tipoMovimiento).toBe(1);
    expect(component.nuevoFrecuente.etiquetas).toEqual([{ id: 2, nombre: 'SinTipo' }]);
    expect(component.nuevoFrecuente.categoria).toEqual({ id: 2, nombre: 'SinTipo' });
  });

  it('al editar un movimiento con varias etiquetas, al cambiar sólo la descripción se conservan todas las etiquetas', () => {
    iniciarSesion('principal');
    component.etiquetasDisponibles = [
      { id: 10, nombre: 'Supermercado', tipo: 'gasto' },
      { id: 20, nombre: 'Despensa', tipo: 'gasto' },
    ];
    component.cuentas = [{ id: 'cuenta-1', tipo: 'DEBITO', saldo_actual: 1000 }];

    component.movimientoEditar = {
      id: 99,
      monto: 350,
      id_tipo_movimiento: 2,
      tipoMovimiento: 2,
      id_cuenta: 'cuenta-1',
      cuenta: 'cuenta-1',
      descripcion: 'Compra inicial',
      notas: '',
      fecha: '2026-09-25T12:00:00Z',
      etiquetas: [
        { id: 10, nombre: 'Supermercado' },
        { id: 20, nombre: 'Despensa' },
      ],
    };

    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    http.expectOne(`${environment.apiUrl}/api/movimientos-rapidos`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/movimientos/etiquetas`).flush(component.etiquetasDisponibles);
    http.expectOne(`${environment.apiUrl}/api/movimientos/tipos-movimiento`).flush([]);
    http.expectOne(`${environment.apiUrl}/api/cuentas/activas`).flush(component.cuentas);

    // Debe haber precargado ambas etiquetas
    expect(component.etiquetasSeleccionadas.length).toBe(2);

    // Cambiar solamente la descripción
    component.movimiento.descripcion = 'Compra modificada';

    component.guardar();

    const peticion = http.expectOne(`${environment.apiUrl}/api/movimientos/edit/99`);
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body.descripcion).toBe('Compra modificada');
    expect(peticion.request.body.etiquetas).toEqual([10, 20]);
    peticion.flush({ message: 'Movimiento actualizado' });
  });

  it('bloquea un gasto mayor al saldo y permite uno igual en débito', () => {
    component.cuentas = [{ id: 'debito', nombre: 'Débito', tipo: 'DEBITO', saldo_actual: 100 }];
    component.movimiento.cuenta = 'debito';
    component.movimiento.tipoMovimiento = 2;

    component.movimiento.monto = 100;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(false);

    component.movimiento.monto = 100.01;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(true);
  });

  it('bloquea un gasto mayor al crédito disponible y permite uno igual', () => {
    component.cuentas = [{
      id: 'credito', nombre: 'Crédito', tipo: 'CREDITO', saldo_actual: -300, limite_credito: 1000,
    }];
    component.movimiento.cuenta = 'credito';
    component.movimiento.tipoMovimiento = 2;

    component.movimiento.monto = 700;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(false);

    component.movimiento.monto = 700.01;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(true);
  });

  it('al editar en la misma cuenta valida contra el saldo previo al movimiento original', () => {
    component.cuentas = [{ id: 'debito', nombre: 'Débito', tipo: 'DEBITO', saldo_actual: 650 }];
    component.movimientoEditar = {
      id: 99, id_cuenta: 'debito', id_tipo_movimiento: 2, monto: -350,
    };
    component.movimiento.cuenta = 'debito';
    component.movimiento.tipoMovimiento = 2;

    component.movimiento.monto = 1000;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(false);

    component.movimiento.monto = 1000.01;
    component.validarErrores(true);
    expect(component.erroresValidacion().saldoInsuficiente).toBe(true);
  });

  it('al mover un gasto editado a otra cuenta valida el saldo actual de la cuenta destino', () => {
    component.cuentas = [
      { id: 'origen', nombre: 'Origen', tipo: 'DEBITO', saldo_actual: 650 },
      { id: 'destino', nombre: 'Destino', tipo: 'DEBITO', saldo_actual: 200 },
    ];
    component.movimientoEditar = {
      id: 99, id_cuenta: 'origen', id_tipo_movimiento: 2, monto: -350,
    };
    component.movimiento.cuenta = 'destino';
    component.movimiento.tipoMovimiento = 2;
    component.movimiento.monto = 200.01;

    component.validarErrores(true);

    expect(component.erroresValidacion().saldoInsuficiente).toBe(true);
  });

  it('asigna Hoy y Ayer sin desplazarse de fecha al cruzar de año', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));

    component.establecerFechaRapida('hoy');
    expect(component.movimiento.fecha).toBe('2026/01/01');
    expect(component.textoFechaFormateada).toBe('Hoy');

    component.establecerFechaRapida('ayer');
    expect(component.movimiento.fecha).toBe('2025/12/31');
    expect(component.textoFechaFormateada).toBe('Ayer');

    vi.useRealTimers();
  });

  it('cambia correctamente de mes y año en ambos sentidos', () => {
    component.mesVisual = 11;
    component.anioVisual = 2025;
    component.mesSiguiente();
    expect(component.mesVisual).toBe(0);
    expect(component.anioVisual).toBe(2026);

    component.mesAnterior();
    expect(component.mesVisual).toBe(11);
    expect(component.anioVisual).toBe(2025);
  });

  it('solo cambia la fecha del movimiento al aplicar la selección del calendario', () => {
    component.movimiento.fecha = '2026/09/26';
    component.abrirSelectorFecha();
    component.seleccionarDiaCalendario({
      dia: 15, mes: 9, anio: 2026, fechaStr: '2026/10/15', esMesActual: false,
    });

    component.cerrarSelectorFecha();
    expect(component.movimiento.fecha).toBe('2026/09/26');

    component.abrirSelectorFecha();
    component.seleccionarDiaCalendario({
      dia: 15, mes: 9, anio: 2026, fechaStr: '2026/10/15', esMesActual: false,
    });
    component.aplicarFechaCalendario();

    expect(component.movimiento.fecha).toBe('2026/10/15');
    expect(component.mostrarSelectorFecha).toBe(false);
  });

  it('genera correctamente febrero de un año bisiesto', () => {
    component.mesVisual = 1;
    component.anioVisual = 2028;

    const diasFebrero = component.diasMatrizCalendario.filter((dia) => dia.esMesActual);

    expect(diasFebrero).toHaveLength(29);
    expect(diasFebrero.at(-1)?.fechaStr).toBe('2028/02/29');
  });

  it('al cancelar y reabrir limpia datos, etiquetas, vistas y errores anteriores', () => {
    vi.useFakeTimers();
    iniciarSesion('principal');
    abrirModalNuevo();

    component.vistaActual.set('formulario');
    component.movimiento.monto = '250';
    component.movimiento.descripcion = 'Dato anterior';
    component.movimiento.notas = 'Nota anterior';
    component.movimiento.cuenta = 'cuenta-1';
    component.etiquetasSeleccionadas = [{ id: 10, nombre: 'Comida' }];
    component.mostrarDetallesExtra = true;
    component.mostrarSelectorCategorias = true;
    component.mostrarSelectorFecha = true;
    component.haIntentadoGuardar.set(true);
    component.erroresValidacion.set({
      monto: true, saldoInsuficiente: true, categoria: true, cuenta: true, descripcion: true,
    });

    component.cerrarModal();
    vi.advanceTimersByTime(200);
    abrirModalNuevo();

    expect(component.vistaActual()).toBe('menu');
    expect(component.movimiento.monto).toBe('');
    expect(component.movimiento.descripcion).toBe('');
    expect(component.movimiento.notas).toBe('');
    expect(component.movimiento.cuenta).toBe('');
    expect(component.etiquetasSeleccionadas).toEqual([]);
    expect(component.mostrarDetallesExtra).toBe(false);
    expect(component.mostrarSelectorCategorias).toBe(false);
    expect(component.mostrarSelectorFecha).toBe(false);
    expect(component.haIntentadoGuardar()).toBe(false);
    expect(Object.values(component.erroresValidacion()).every((error) => !error)).toBe(true);

    vi.useRealTimers();
  });

  it('después de guardar y reabrir no conserva datos ni errores del movimiento guardado', () => {
    vi.useFakeTimers();
    iniciarSesion('principal');
    abrirModalNuevo();

    component.vistaActual.set('formulario');
    component.movimiento = {
      tipoMovimiento: 2,
      cuenta: 'cuenta-1',
      etiquetas: [],
      monto: '125.50',
      descripcion: 'Comida guardada',
      notas: 'Nota guardada',
      fecha: '2026/09/26',
    };
    component.etiquetasSeleccionadas = [{ id: 10, nombre: 'Comida' }];
    component.guardar();
    http.expectOne(`${environment.apiUrl}/api/movimientos`).flush({ message: 'Guardado' });
    vi.advanceTimersByTime(200);

    abrirModalNuevo();

    expect(component.vistaActual()).toBe('menu');
    expect(component.movimiento.monto).toBe('');
    expect(component.movimiento.descripcion).toBe('');
    expect(component.movimiento.notas).toBe('');
    expect(component.movimiento.cuenta).toBe('');
    expect(component.etiquetasSeleccionadas).toEqual([]);
    expect(component.haIntentadoGuardar()).toBe(false);
    expect(Object.values(component.erroresValidacion()).every((error) => !error)).toBe(true);

    vi.useRealTimers();
  });

  it('envía una sola solicitud al guardar un movimiento con doble clic y conexión lenta', () => {
    component.cuentas = [
      { id: 'cuenta-1', nombre: 'Efectivo', tipo: 'EFECTIVO', saldo_actual: 1000 },
    ];
    component.movimiento = {
      tipoMovimiento: 2,
      cuenta: 'cuenta-1',
      etiquetas: [],
      monto: '100',
      descripcion: 'Compra',
      notas: '',
      fecha: '2026/09/26',
    };
    component.etiquetasSeleccionadas = [{ id: 10, nombre: 'Comida' }];

    component.guardar();
    component.guardar();

    const solicitudes = http.match(`${environment.apiUrl}/api/movimientos`);
    expect(solicitudes).toHaveLength(1);
    expect(component.isloading()).toBe(true);
    solicitudes[0].flush({ message: 'Guardado' });
  });

  it('no guarda dos movimientos manuales durante el cierre del modal', () => {
    vi.useFakeTimers();
    component.cuentas = [
      { id: 'cuenta-1', nombre: 'Efectivo', tipo: 'EFECTIVO', saldo_actual: 1000 },
    ];
    component.movimiento = {
      tipoMovimiento: 2,
      cuenta: 'cuenta-1',
      etiquetas: [],
      monto: '100',
      descripcion: 'Compra manual',
      notas: '',
      fecha: '2026/09/26',
    };
    component.etiquetasSeleccionadas = [{ id: 10, nombre: 'Comida' }];

    component.guardar();
    const primeraSolicitud = http.expectOne(`${environment.apiUrl}/api/movimientos`);
    primeraSolicitud.flush({ message: 'Guardado' });

    expect(component.isloading()).toBe(false);
    expect(component.isClosing).toBe(true);

    // Segundo clic después de responder la primera solicitud, mientras el modal
    // todavía está visible por la animación de cierre.
    component.guardar();

    http.expectNone(`${environment.apiUrl}/api/movimientos`);
    vi.advanceTimersByTime(200);
  });

  it('envía una sola solicitud al guardar un atajo con doble clic y conexión lenta', () => {
    component.nuevoFrecuente = {
      nombre: 'Café',
      tipoMovimiento: 2,
      monto: '50',
      cuenta: 'cuenta-1',
      etiquetas: [{ id: 10, nombre: 'Comida' }],
      categoria: { id: 10, nombre: 'Comida' },
    };

    component.guardarNuevoFrecuente();
    component.guardarNuevoFrecuente();

    const solicitudes = http.match(endpoint);
    expect(solicitudes).toHaveLength(1);
    expect(component.isloading()).toBe(true);
    solicitudes[0].flush({ id: 1 });
  });

  it('no ejecuta dos veces un movimiento frecuente durante el cierre del modal', () => {
    vi.useFakeTimers();
    const rapido: MovimientoRapido = {
      id: 1,
      nombre: 'Café',
      tipoMovimiento: 2,
      monto: 50,
      cuentaId: 'cuenta-1',
      cuentaNombre: 'Efectivo',
      categoriaId: 10,
      categoriaNombre: 'Comida',
      categoriaColor: '#f59e0b',
      categoriaIcono: 'coffee',
    };
    component.cuentas = [
      { id: 'cuenta-1', nombre: 'Efectivo', tipo: 'EFECTIVO', saldo_actual: 1000 },
    ];

    component.ejecutarMovimientoRapido(rapido);
    const primeraSolicitud = http.expectOne(`${environment.apiUrl}/api/movimientos`);
    primeraSolicitud.flush({ id: 77 });

    expect(component.isloading()).toBe(false);
    expect(component.isClosing).toBe(true);

    // Simula el segundo clic después de una respuesta rápida, pero antes de que
    // termine la animación de cierre de 200 ms.
    component.ejecutarMovimientoRapido(rapido);

    http.expectNone(`${environment.apiUrl}/api/movimientos`);
    vi.advanceTimersByTime(200);
  });
});
