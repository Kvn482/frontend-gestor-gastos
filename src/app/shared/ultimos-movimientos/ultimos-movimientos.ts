import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { MovimientosService } from '../../core/services/movimientos.service';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { formatearFechaLocal } from '../utils/fechas';
import { NuevoMovimientoModal } from '../../features/components/nuevo-movimiento-modal/nuevo-movimiento-modal';
import { TransferirSaldo } from '../../features/components/transferir-saldo/transferir-saldo';
import { MovimientoDetalleModal } from '../../features/components/movimiento-detalle-modal/movimiento-detalle-modal';
import { ToastService } from '../../core/services/toast.service';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { monetraSweetAlertClasses } from '../utils/sweet-alert';
import { NgIcon } from '@ng-icons/core';
import { getCategoryIconName } from '../utils/category-icons';

export interface GrupoMovimientosDia {
  fechaKey: string;
  fechaLabel: string;
  totalDia: number;
  movimientos: any[];
}

@Component({
  selector: 'app-ultimos-movimientos',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    NgIcon,
    MovimientoDetalleModal,
    NuevoMovimientoModal,
    TransferirSaldo,
  ],
  templateUrl: './ultimos-movimientos.html',
  styleUrl: './ultimos-movimientos.css',
})
export class UltimosMovimientos implements OnInit {
  constructor(
    private movimientosService: MovimientosService,
    private toastService: ToastService,
    private cd: ChangeDetectorRef
  ) {}

  todosLosMovimientos: any[] = [];
  movimientos: any[] = [];
  gruposMovimientos: GrupoMovimientosDia[] = [];
  private _busqueda = '';

  @Input() set busqueda(valor: string) {
    this._busqueda = valor ?? '';
    this.aplicarFiltroBusqueda();
  }

  get busqueda(): string {
    return this._busqueda;
  }

  modalAbierto = false;
  modalEditarAbierto = false;
  modalEditarTransferenciaAbierto = false;
  movimientoSeleccionado: any = null;
  eliminandoMovimiento = false;

  abrirDetalle(mov: any) {
    this.movimientoSeleccionado = mov;
    this.modalAbierto = true;
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.movimientoSeleccionado = null;
  }

  abrirEditarMovimiento() {
    if (!this.movimientoSeleccionado) return;

    this.modalAbierto = false;

    if (this.esMovimientoTransferencia(this.movimientoSeleccionado)) {
      this.modalEditarTransferenciaAbierto = true;
      return;
    }

    this.modalEditarAbierto = true;
  }

  cerrarEditarMovimiento() {
    this.modalEditarAbierto = false;
    this.modalEditarTransferenciaAbierto = false;
    this.movimientoSeleccionado = null;
  }

  movimientoEditado() {
    this.modalEditarAbierto = false;
    this.modalEditarTransferenciaAbierto = false;
    this.movimientoSeleccionado = null;
    this.cargarUltimosMovimientos();
  }

  async eliminarMovimiento() {
    if (!this.movimientoSeleccionado || this.eliminandoMovimiento) return;

    const esTransferencia = this.esMovimientoTransferencia(this.movimientoSeleccionado);
    const result = await Swal.fire({
      title: esTransferencia ? 'Eliminar transferencia' : 'Eliminar movimiento',
      text: esTransferencia
        ? 'Esto eliminara la transferencia completa y ajustara ambas cuentas.'
        : 'Este movimiento se eliminara y se ajustara el saldo de la cuenta.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false,
      customClass: monetraSweetAlertClasses,
      reverseButtons: true,
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    this.eliminandoMovimiento = true;

    this.movimientosService
      .eliminarMovimiento(this.movimientoSeleccionado.id)
      .pipe(finalize(() => (this.eliminandoMovimiento = false)))
      .subscribe({
        next: (res: any) => {
          this.toastService.show(res?.message ?? 'Movimiento eliminado correctamente.', 'success');
          this.modalAbierto = false;
          this.movimientoSeleccionado = null;
          this.cargarUltimosMovimientos();
        },
        error: (err) => {
          this.toastService.show(err?.error?.message ?? 'No se pudo eliminar el movimiento.', 'error');
        },
      });
  }

  esMovimientoTransferencia(movimiento: any): boolean {
    if (!movimiento) return false;

    const tieneRelacionTransferencia = [
      movimiento.id_transferencia,
      movimiento.id_transferencia_saldo,
      movimiento.transferencia_id,
      movimiento.id_cuenta_origen,
      movimiento.id_cuenta_destino,
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ].some((valor) => valor !== null && valor !== undefined && valor !== '');

    if (tieneRelacionTransferencia) return true;

    return (
      movimiento.etiquetas?.some((etiqueta: any) => {
        const nombre = String(etiqueta.nombre ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return String(etiqueta.id) === '6' || nombre.includes('transfer');
      }) ?? false
    );
  }

  ngOnInit() {
    this.cargarUltimosMovimientos();

    // escucha cuando se crea un movimiento
    this.movimientosService.refreshBalanceObservable$.subscribe(() => {
      this.cargarUltimosMovimientos();
    });
  }

  cargarUltimosMovimientos() {
    this.movimientosService.consultarUltimosMovimientos().subscribe((res: any) => {
      this.todosLosMovimientos = (Array.isArray(res) ? res : []).map((mov: any) => ({
        ...mov,
        fecha_formateada: formatearFechaLocal(mov.fecha),
      }));
      this.aplicarFiltroBusqueda();
    });
  }

  aplicarFiltroBusqueda() {
    const q = (this._busqueda || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!q) {
      this.movimientos = [...this.todosLosMovimientos];
    } else {
      this.movimientos = this.todosLosMovimientos.filter((mov: any) => {
        const desc = String(mov.descripcion ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const cuenta = String(mov.cuenta ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const etiquetaPrincipal = this.obtenerNombreEtiquetaPrincipal(mov)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const etiquetas = (mov.etiquetas ?? [])
          .map((e: any) =>
            String(e.nombre ?? '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
          )
          .join(' ');

        return desc.includes(q) || cuenta.includes(q) || etiquetas.includes(q) || etiquetaPrincipal.includes(q);
      });
    }

    this.recalcularGrupos();
    this.cd.detectChanges();
  }

  recalcularGrupos() {
    const mapaGrupos = new Map<string, any[]>();

    for (const mov of this.movimientos) {
      const key = this.extraerFechaKey(mov.fecha);
      if (!mapaGrupos.has(key)) {
        mapaGrupos.set(key, []);
      }
      mapaGrupos.get(key)!.push(mov);
    }

    // Ordenar fechas de más reciente a más antigua
    const keysOrdenadas = Array.from(mapaGrupos.keys()).sort((a, b) => b.localeCompare(a));

    this.gruposMovimientos = keysOrdenadas.map((key) => {
      const movsDelDia = mapaGrupos.get(key)!;
      const totalDia = movsDelDia.reduce((acc, m) => {
        const monto = Math.abs(Number(m.monto ?? 0));
        return m.id_tipo_movimiento === 1 ? acc + monto : acc - monto;
      }, 0);

      return {
        fechaKey: key,
        fechaLabel: this.obtenerLabelFecha(key),
        totalDia,
        movimientos: movsDelDia,
      };
    });
  }

  montoAbsoluto(monto: number | string): number {
    return Math.abs(Number(monto ?? 0));
  }

  extraerFechaKey(fechaStr: string): string {
    if (!fechaStr) return 'sin-fecha';
    if (typeof fechaStr === 'string' && fechaStr.length >= 10 && fechaStr.includes('-')) {
      return fechaStr.substring(0, 10);
    }
    const d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    }
    return String(fechaStr);
  }

  obtenerLabelFecha(fechaKey: string): string {
    if (!fechaKey || fechaKey === 'sin-fecha') return 'Sin fecha';

    const partes = fechaKey.split('-').map(Number);
    if (partes.length < 3 || isNaN(partes[0]) || isNaN(partes[1]) || isNaN(partes[2])) {
      return fechaKey;
    }

    const [y, m, d] = partes;
    const fechaObj = new Date(y, m - 1, d);

    const hoy = new Date();
    const hoyKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const ayerKey = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;

    if (fechaKey === hoyKey) {
      return 'Hoy';
    }
    if (fechaKey === ayerKey) {
      return 'Ayer';
    }

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    };
    let label = fechaObj.toLocaleDateString('es-MX', opciones);
    label = label.charAt(0).toUpperCase() + label.slice(1);

    if (y !== hoy.getFullYear()) {
      label += ` ${y}`;
    }

    return label;
  }

  obtenerEtiquetaPrincipal(mov: any) {
    if (Array.isArray(mov.etiquetas) && mov.etiquetas.length > 0) {
      return mov.etiquetas[0];
    }
    return null;
  }

  obtenerIconoMovimiento(mov: any): string {
    const etiqueta = this.obtenerEtiquetaPrincipal(mov);
    if (etiqueta?.icono) {
      return getCategoryIconName(etiqueta.icono);
    }
    if (this.esMovimientoTransferencia(mov)) {
      return 'lucideArrowLeftRight';
    }
    return mov.id_tipo_movimiento === 1 ? 'lucideCoins' : 'lucideTag';
  }

  obtenerColorMovimiento(mov: any): string {
    const etiqueta = this.obtenerEtiquetaPrincipal(mov);
    if (etiqueta?.color) {
      return etiqueta.color;
    }
    if (this.esMovimientoTransferencia(mov)) {
      return '#8b5cf6';
    }
    return mov.id_tipo_movimiento === 1 ? '#10b981' : '#6366f1';
  }

  obtenerNombreEtiquetaPrincipal(mov: any): string {
    const etiqueta = this.obtenerEtiquetaPrincipal(mov);
    if (etiqueta?.nombre) {
      return etiqueta.nombre;
    }
    if (this.esMovimientoTransferencia(mov)) {
      return 'Transferencia';
    }
    return mov.id_tipo_movimiento === 1 ? 'Otros ingresos' : 'Otros gastos';
  }

  conteoEtiquetasExtra(mov: any): number {
    if (Array.isArray(mov.etiquetas) && mov.etiquetas.length > 1) {
      return mov.etiquetas.length - 1;
    }
    return 0;
  }
}
