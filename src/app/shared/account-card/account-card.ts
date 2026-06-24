import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { CurrencyPipe, CommonModule } from '@angular/common'
import { Dropdown } from 'flowbite';

@Component({
  selector: 'app-account-card',
  standalone: true,
  imports: [CurrencyPipe, CommonModule],
  templateUrl: './account-card.html',
  styleUrl: './account-card.css',
})
export class AccountCard implements AfterViewInit, OnDestroy {
  @ViewChild('dropdownButton') dropdownButton!: ElementRef<HTMLElement>
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef<HTMLElement>

  @Input() id!: string
  @Input() nombre!: string
  @Input() tipo!: string
  @Input() cantidad!: number
  @Input() color!: string
  @Input() status!: number

  private dropdown?: Dropdown

  constructor(private hostElement: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.dropdown = new Dropdown(
      this.dropdownMenu.nativeElement,
      this.dropdownButton.nativeElement,
      {
        placement: 'bottom',
        triggerType: 'click',
        offsetDistance: 8,
        onShow: () => {
          this.hostElement.nativeElement.classList.add('dropdown-open')
        },
        onHide: () => {
          this.hostElement.nativeElement.classList.remove('dropdown-open')
        },
      },
      {
        id: `account-dropdown-${this.id}`,
        override: true,
      }
    )
  }

  ngOnDestroy(): void {
    this.hostElement.nativeElement.classList.remove('dropdown-open')
    this.dropdown?.destroyAndRemoveInstance()
  }
}
