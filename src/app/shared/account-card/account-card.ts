import { Component, Input } from '@angular/core';
import { CurrencyPipe, CommonModule } from '@angular/common'

@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [CurrencyPipe, CommonModule],
  templateUrl: './account-card.html',
  styleUrl: './account-card.css',
})
export class AccountCard {
  @Input() id!: string
  @Input() nombre!: string
  @Input() tipo!: string
  @Input() cantidad!: number
  @Input() color!: string
}
