import { Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-balance-general',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './balance-general.html',
  styleUrl: './balance-general.css',
})
export class BalanceGeneral {
  @Input() ocultar = false;
  @Input() balance: number = 0;
}
