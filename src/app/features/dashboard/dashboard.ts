import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { QuickAction } from '../../shared/quick-action/quick-action';
import { NuevoMovimientoModal } from '../components/nuevo-movimiento-modal/nuevo-movimiento-modal';
import { BalanceGeneral } from '../../shared/balance-general/balance-general';
import { AuthService } from '../../core/services/auth.service';
import { UltimosMovimientos } from '../../shared/ultimos-movimientos/ultimos-movimientos';
import { CuentasService } from '../../core/services/cuentas.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { AlertaCredito } from '../../core/models/alerta-credito.interface';
import { BalanceResponse } from '../../core/models/balance-response.interface';
import { PagarTarjetaModal } from '../components/pagar-tarjeta-modal/pagar-tarjeta-modal';

@Component({
  selector: 'app-dashboard',
  imports: [
    CurrencyPipe,
    RouterLink,
    FormsModule,
    QuickAction,
    NuevoMovimientoModal,
    BalanceGeneral,
    UltimosMovimientos,
    PagarTarjetaModal,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private cuentasService: CuentasService,
    private movimientosService: MovimientosService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  @ViewChild('carouselRef') carouselRef?: ElementRef<HTMLDivElement>;
  @ViewChild('balanceContainer') balanceContainer?: ElementRef<HTMLDivElement>;

  nombre = '';
  alertasCredito: AlertaCredito[] = [];
  cargandoAlertasCredito = false;
  errorAlertasCredito = '';

  modalMovimientoAbierto = false;
  modalPagarTarjetaAbierto = false;
  cuentaIdAPagar = '';

  // Sticky Top Bar con Balance y Búsqueda
  mostrarStickyBalance = false;
  busquedaSticky = '';
  buscadorEnfocado = false;
  saldoOculto = false;
  balanceData: BalanceResponse = { balance: 0, ingresos: 0, egresos: 0 };
  private balanceObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    // Inicialización del datepicker de Flowbite
    if (typeof window !== 'undefined' && (window as any).Datepicker) {
      const datepickerEl = document.getElementById('default-datepicker');
      if (datepickerEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Datepicker(datepickerEl);
      }
    }

    // Observer para mostrar barra sticky cuando el balance deja de ser visible por arriba
    if (this.balanceContainer?.nativeElement && typeof IntersectionObserver !== 'undefined') {
      this.balanceObserver = new IntersectionObserver(
        ([entry]) => {
          this.actualizarVisibilidadSticky(entry);
        },
        {
          threshold: 0,
          rootMargin: '-20px 0px 0px 0px',
        }
      );
      this.balanceObserver.observe(this.balanceContainer.nativeElement);
    }
  }

  actualizarVisibilidadSticky(entry?: IntersectionObserverEntry) {
    // Si el usuario está enfocado o buscando texto, NUNCA ocultar la barra sticky aunque la pantalla se acorte
    if (this.buscadorEnfocado || this.busquedaSticky.trim().length > 0) {
      this.mostrarStickyBalance = true;
      this.cdr.detectChanges();
      return;
    }

    if (entry) {
      this.mostrarStickyBalance = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    } else if (this.balanceContainer?.nativeElement) {
      const rect = this.balanceContainer.nativeElement.getBoundingClientRect();
      this.mostrarStickyBalance = rect.bottom < 60;
    }
    this.cdr.detectChanges();
  }

  ngOnInit() {
    if (typeof localStorage !== 'undefined') {
      this.saldoOculto = localStorage.getItem('monetra_ocultar_saldo') === 'true';
    }

    const currentUser = this.authService.getCurrentUser();
    this.nombre = currentUser?.nombre ?? '';
    this.cargarAlertasCredito();
    this.cargarBalance();

    // Escucha cambios de balance al crear/editar movimientos
    this.movimientosService.refreshBalanceObservable$.subscribe(() => {
      this.cargarBalance();
    });
  }

  toggleSaldoOculto() {
    this.saldoOculto = !this.saldoOculto;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('monetra_ocultar_saldo', String(this.saldoOculto));
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.balanceObserver) {
      this.balanceObserver.disconnect();
    }
  }

  cargarBalance() {
    this.movimientosService.consultarBalanceGeneral().subscribe({
      next: (res) => {
        if (res) {
          this.balanceData = res;
          this.cdr.detectChanges();
        }
      },
      error: () => {},
    });
  }

  onBuscadorFocus() {
    this.buscadorEnfocado = true;
    this.mostrarStickyBalance = true;
    this.cdr.detectChanges();
  }

  onBuscadorBlur() {
    // Timeout para permitir que clicks en limpiar u otros elementos del sticky se procesen primero
    setTimeout(() => {
      this.buscadorEnfocado = false;
      this.actualizarVisibilidadSticky();
    }, 200);
  }

  onBusquedaStickyChange(valor: string) {
    this.busquedaSticky = valor;
    this.actualizarVisibilidadSticky();
  }

  limpiarBusquedaSticky() {
    this.busquedaSticky = '';
    this.actualizarVisibilidadSticky();
  }

  irAlHistorialConBusqueda() {
    const queryParams: any = { origen: 'inicio' };
    if (this.busquedaSticky.trim()) {
      queryParams.q = this.busquedaSticky.trim();
    }
    this.router.navigate(['/movimientos'], { queryParams });
  }

  scrollCarrusel(direccion: 'prev' | 'next'): void {
    if (!this.carouselRef?.nativeElement) return;
    const contenedor = this.carouselRef.nativeElement;
    const scrollAmount = contenedor.clientWidth * 0.8;
    contenedor.scrollBy({
      left: direccion === 'next' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  }

  abrirModalMovimiento() {
    this.modalMovimientoAbierto = true;
  }

  cerrarModalMovimiento() {
    this.modalMovimientoAbierto = false;
  }

  abrirModalPagarTarjeta(cuentaId: number | string) {
    this.cuentaIdAPagar = String(cuentaId);
    this.modalPagarTarjetaAbierto = true;
  }

  cerrarModalPagarTarjeta() {
    this.modalPagarTarjetaAbierto = false;
    this.cuentaIdAPagar = '';
  }

  pagoTarjetaRealizado() {
    this.cerrarModalPagarTarjeta();
    this.cargarAlertasCredito();
  }

  esAlertaPago(estado: AlertaCredito['estado']): boolean {
    return estado === 'atrasado' || estado === 'vence-hoy' || estado === 'proximo';
  }

  cargarAlertasCredito() {
    this.cargandoAlertasCredito = true;
    this.errorAlertasCredito = '';

    this.cuentasService
      .consultarAlertasCreditos()
      .pipe(
        finalize(() => {
          this.cargandoAlertasCredito = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (alertas) => {
          this.alertasCredito = Array.isArray(alertas) ? alertas : [];
        },
        error: (err) => {
          this.alertasCredito = [];
          this.errorAlertasCredito =
            err?.error?.message ?? 'No pudimos cargar las alertas de créditos.';
        },
      });
  }

  clasesAlertaCredito(estado: AlertaCredito['estado']) {
    const clases = {
      atrasado: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
      'vence-hoy': 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300',
      'corte-hoy': 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-300',
      'corte-manana': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
      proximo: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
    };

    return clases[estado];
  }
}
