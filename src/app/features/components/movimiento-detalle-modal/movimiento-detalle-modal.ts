import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CuentasService } from '../../../core/services/cuentas.service';
import { getCategoryIconName } from '../../../shared/utils/category-icons';
import { crearFechaLocal } from '../../../shared/utils/fechas';

@Component({
  selector: 'app-movimiento-detalle-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, NgIcon],
  templateUrl: './movimiento-detalle-modal.html',
  styleUrl: './movimiento-detalle-modal.css',
})
export class MovimientoDetalleModal implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() movimiento: any | null = null;
  @Input() eliminandoMovimiento = false;
  @Input() cuentaFallback: any | null = null;
  @Input() cuentas: any[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() editRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();

  private cuentasService = inject(CuentasService, { optional: true });
  private cd = inject(ChangeDetectorRef);

  isClosing = false;

  ngOnInit(): void {
    this.cargarCuentasSiNecesario();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue || changes['movimiento']?.currentValue) {
      this.cargarCuentasSiNecesario();
    }
  }

  private cargarCuentasSiNecesario(): void {
    if (this.esTransferencia && (!this.cuentas || this.cuentas.length === 0) && this.cuentasService) {
      this.cuentasService.consultarCuentasActivas().subscribe({
        next: (cuentas: any) => {
          if (Array.isArray(cuentas)) {
            this.cuentas = cuentas;
            this.cd.markForCheck();
            this.cd.detectChanges();
          }
        },
        error: () => {},
      });
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.isOpen && !this.isClosing) {
      this.cerrarModal();
    }
  }

  cerrarModal(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.isClosing = false;
      this.closed.emit();
    }, 200);
  }

  solicitarEdicion(): void {
    this.editRequested.emit();
  }

  solicitarEliminacion(): void {
    this.deleteRequested.emit();
  }

  get esIngreso(): boolean {
    return Number(this.movimiento?.id_tipo_movimiento) === 1;
  }

  get esTransferencia(): boolean {
    if (!this.movimiento) return false;
    if (Number(this.movimiento.id_tipo_movimiento) === 3) return true;

    const tieneRelacionTransferencia = [
      this.movimiento.id_transferencia,
      this.movimiento.id_transferencia_saldo,
      this.movimiento.transferencia_id,
      this.movimiento.id_cuenta_origen,
      this.movimiento.id_cuenta_destino,
      this.movimiento.cuenta_origen_id,
      this.movimiento.cuenta_destino_id,
    ].some((valor) => valor !== null && valor !== undefined && valor !== '');

    if (tieneRelacionTransferencia) return true;

    return (
      this.movimiento.etiquetas?.some((etiqueta: any) => {
        const nombre = String(etiqueta.nombre ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return String(etiqueta.id) === '6' || nombre.includes('transfer');
      }) ?? false
    );
  }

  get montoAbsoluto(): number {
    return Math.abs(Number(this.movimiento?.monto ?? 0));
  }

  get nombreCuenta(): string {
    return this.movimiento?.cuenta || this.cuentaFallback?.nombre || 'Sin cuenta';
  }

  get cuentaOrigenNombre(): string {
    if (!this.movimiento) return 'Sin cuenta';
    if (!this.esTransferencia) return this.nombreCuenta;

    const esEntrada = Number(this.movimiento.id_tipo_movimiento) === 1;

    // Si el movimiento ya trae cuenta_destino directamente del backend
    if (esEntrada && this.movimiento.cuenta_destino) {
      return this.movimiento.cuenta_destino;
    }
    if (!esEntrada && (this.movimiento.cuenta || this.cuentaFallback?.nombre)) {
      return this.movimiento.cuenta || this.cuentaFallback?.nombre;
    }

    const idOrigen =
      this.movimiento.id_cuenta_origen ??
      (esEntrada ? this.movimiento.id_cuenta_destino : this.movimiento.id_cuenta);

    if (idOrigen && this.cuentas?.length) {
      const cuenta = this.cuentas.find((c) => String(c.id) === String(idOrigen));
      if (cuenta?.nombre) return cuenta.nombre;
    }

    return this.cuentaFallback?.nombre || this.movimiento.cuenta || 'Origen';
  }

  get cuentaDestinoNombre(): string {
    if (!this.movimiento || !this.esTransferencia) return '';

    const esEntrada = Number(this.movimiento.id_tipo_movimiento) === 1;

    // Si el movimiento ya trae cuenta_destino directamente del backend
    if (!esEntrada && this.movimiento.cuenta_destino) {
      return this.movimiento.cuenta_destino;
    }
    if (esEntrada && (this.movimiento.cuenta || this.cuentaFallback?.nombre)) {
      return this.movimiento.cuenta || this.cuentaFallback?.nombre;
    }

    const idDestino =
      this.movimiento.cuenta_destino_id ??
      (esEntrada ? this.movimiento.id_cuenta : this.movimiento.id_cuenta_destino);

    if (idDestino && this.cuentas?.length) {
      const cuenta = this.cuentas.find((c) => String(c.id) === String(idDestino));
      if (cuenta?.nombre) return cuenta.nombre;
    }

    return this.movimiento.cuenta_destino || '';
  }

  get tipoCuenta(): string {
    return this.movimiento?.tipo_cuenta || this.cuentaFallback?.tipo || '';
  }

  get etiquetasMostradas(): { id: number | string; nombre: string; color: string; icono?: string }[] {
    return Array.isArray(this.movimiento?.etiquetas) ? this.movimiento.etiquetas : [];
  }

  get primeraEtiqueta(): { id: number | string; nombre: string; color: string; icono?: string } | null {
    return this.etiquetasMostradas.length > 0 ? this.etiquetasMostradas[0] : null;
  }

  get colorCategoria(): string {
    if (this.primeraEtiqueta?.color) return this.primeraEtiqueta.color;
    if (this.esIngreso) return '#10b981';
    if (this.esTransferencia) return '#0ea5e9';
    return '#f43f5e';
  }

  get iconoCategoria(): string {
    if (this.esTransferencia) return 'lucideArrowLeftRight';
    if (this.primeraEtiqueta?.icono) {
      return getCategoryIconName(this.primeraEtiqueta.icono);
    }
    return getCategoryIconName('tag');
  }

  get fechaDate(): Date | string | null {
    if (!this.movimiento?.fecha) return null;
    const str = String(this.movimiento.fecha);
    if (str.includes('-') && !str.includes('T')) {
      return crearFechaLocal(str);
    }
    return this.movimiento.fecha;
  }
}
