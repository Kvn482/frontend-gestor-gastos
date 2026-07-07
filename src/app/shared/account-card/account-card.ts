import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core'; // <-- Agregamos Output y EventEmitter
import { CurrencyPipe, CommonModule } from '@angular/common'
import { Dropdown } from 'flowbite';
import { Router } from '@angular/router';

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
  @Input() limite_credito?: number | string | null

  mostrandoCreditoDisponible = true

  get esCredito(): boolean {
    return this.tipo === 'CREDITO';
  }

  get saldoActual(): number {
    return Number(this.cantidad ?? 0);
  }

  get creditoDisponible(): number {
    return Math.max(Number(this.limite_credito ?? 0) + Math.min(this.saldoActual, 0), 0);
  }

  get etiquetaMonto(): string {
    if (!this.esCredito) return 'Saldo actual';

    return this.mostrandoCreditoDisponible ? 'Credito disponible' : 'Saldo actual';
  }

  get montoMostrado(): number {
    if (this.esCredito && this.mostrandoCreditoDisponible) {
      return this.creditoDisponible;
    }

    return this.saldoActual;
  }

  get textoBotonMonto(): string {
    return this.mostrandoCreditoDisponible ? 'Ver saldo' : 'Ver disponible';
  }

  get saldoAPagar(): number {
    if (!this.esCredito) return 0;

    return Math.max(Math.abs(Math.min(this.saldoActual, 0)), 0);
  }

  // Emitimos un objeto con el id y el nuevo status hacia el componente padre
  @Output() statusChanged = new EventEmitter<{ id: string, status: number }>();
  @Output() editRequested = new EventEmitter<string>();
  @Output() transferRequested = new EventEmitter<string>();
  @Output() payRequested = new EventEmitter<string>();

  private dropdown?: Dropdown

  constructor(
    private hostElement: ElementRef<HTMLElement>,
    private router: Router
  ) {}

  verDetalle() {
    this.router.navigate(['/cuentas', this.id]);
  }

  alternarMontoCredito(event: Event) {
    event.stopPropagation();

    if (!this.esCredito) return;

    this.mostrandoCreditoDisponible = !this.mostrandoCreditoDisponible;
  }

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

  actualizarStatus() {
    this.status = this.status === 1 ? 0 : 1;

    this.statusChanged.emit({
      id: this.id,
      status: this.status
    });

    this.dropdown?.hide();
  }

  solicitarEdicion() {
    this.editRequested.emit(this.id);
    this.dropdown?.hide();
  }

  solicitarTransferencia() {
    this.transferRequested.emit(this.id);
    this.dropdown?.hide();
  }

  solicitarPago() {
    this.payRequested.emit(this.id);
    this.dropdown?.hide();
  }
}
