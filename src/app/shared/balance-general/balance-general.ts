import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MovimientosService } from '../../core/services/movimientos.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-balance-general',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './balance-general.html',
  styleUrl: './balance-general.css',
})
export class BalanceGeneral {
  constructor(
    private movimientosService: MovimientosService,
    private cd: ChangeDetectorRef
  ) { }

  balance: number = 0

  ngOnInit() {
    this.cargarBalance(); // carga inicial

    // escucha cuando se crea un movimiento
    this.movimientosService.refreshBalanceObservable$
      .subscribe(() => {
        this.cargarBalance();
      });
  }

  cargarBalance() {
    this.movimientosService.consultarBalanceGeneral()
      .subscribe((res) => {
        this.balance = res.balance;
        this.cd.detectChanges();
      });
  }
}
