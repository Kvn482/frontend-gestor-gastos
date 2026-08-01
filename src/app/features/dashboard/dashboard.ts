import { CurrencyPipe } from '@angular/common';
import { ChangeDetectorRef, Component, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { QuickAction } from '../../shared/quick-action/quick-action';
import { NuevoMovimientoModal } from '../components/nuevo-movimiento-modal/nuevo-movimiento-modal';
import { BalanceGeneral } from '../../shared/balance-general/balance-general';
import { AuthService } from '../../core/services/auth.service';
import { UltimosMovimientos } from '../../shared/ultimos-movimientos/ultimos-movimientos';
import { CuentasService } from '../../core/services/cuentas.service';
import { AlertaCredito } from '../../core/models/alerta-credito.interface';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, RouterLink, QuickAction, NuevoMovimientoModal, BalanceGeneral, UltimosMovimientos],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})

export class Dashboard {
  constructor(
    private authService: AuthService,
    private cuentasService: CuentasService,
    private cdr: ChangeDetectorRef,
  ) {}

  nombre = ''
  alertasCredito: AlertaCredito[] = [];
  cargandoAlertasCredito = false;
  errorAlertasCredito = '';

  ngAfterViewInit(): void {
    // Inicialización del datepicker de Flowbite
    if (typeof window !== 'undefined' && (window as any).Datepicker) {
      const datepickerEl = document.getElementById('default-datepicker');
      if (datepickerEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Datepicker(datepickerEl);
      }
    }
  }

  ngOnInit() { // 3. Place your logic here
    const currentUser = this.authService.getCurrentUser();
    this.nombre = currentUser.nombre
    this.cargarAlertasCredito();
  }

  modalMovimientoAbierto = false;

  abrirModalMovimiento() {
    this.modalMovimientoAbierto = true;
  }

  cerrarModalMovimiento() {
    this.modalMovimientoAbierto = false;
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
            err?.error?.message ?? 'No pudimos cargar las alertas de creditos.';
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
