import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { animate } from 'animejs';

@Component({
  selector: 'app-balance-general',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './balance-general.html',
  styleUrl: './balance-general.css',
})
export class BalanceGeneral implements OnChanges {
  @Input() ocultar = false;
  @Input() balance: number = 0;

  balanceAnimado = signal(0);
  private objetoContador = { valor: 0 };
  private animacionActiva?: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['balance'] || changes['ocultar']) {
      const nuevoBalance = Number(this.balance) || 0;
      if (this.ocultar) {
        return;
      }

      this.animacionActiva?.revert?.();

      this.animacionActiva = animate(this.objetoContador, {
        valor: nuevoBalance,
        duration: 1100,
        ease: 'outExpo',
        onUpdate: () => {
          this.balanceAnimado.set(this.objetoContador.valor);
        },
      });
    }
  }
}
