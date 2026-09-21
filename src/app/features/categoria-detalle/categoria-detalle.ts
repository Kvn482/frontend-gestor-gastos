import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ToastService } from '../../core/services/toast.service';
import { Modal } from '../../shared/modal/modal';
import { monetraSweetAlertClasses } from '../../shared/utils/sweet-alert';
import { NgIcon } from '@ng-icons/core';
import {
  CATEGORY_ICONS,
  CategoryIconDefinition,
  ICON_CATEGORY_TABS,
  IconCategoryTab,
  getCategoryIconName,
} from '../../shared/utils/category-icons';

@Component({
  selector: 'app-categoria-detalle',
  standalone: true,
  imports: [FormsModule, Modal, NgIcon],
  templateUrl: './categoria-detalle.html',
  styleUrl: './categoria-detalle.css',
})
export class CategoriaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private movimientosService = inject(MovimientosService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private cd = inject(ChangeDetectorRef);

  esNueva = true;
  cargando = false;
  guardando = false;
  eliminando = false;

  modalIconoAbierto = false;
  busquedaIcono = '';
  categoriasIconos: IconCategoryTab[] = ICON_CATEGORY_TABS;
  pestanaIconoActiva = 'finance';

  idCategoria: number | null = null;

  categoria = {
    id: 0,
    nombre: '',
    color: '#6366f1',
    tipo: 'gasto' as 'gasto' | 'ingreso',
    icono: 'tag',
    id_usuario: null as number | null,
  };

  categoriaOriginal = {
    nombre: '',
    color: '#6366f1',
    tipo: 'gasto' as 'gasto' | 'ingreso',
    icono: 'tag',
  };

  iconosDisponibles: CategoryIconDefinition[] = CATEGORY_ICONS;

  coloresPredefinidos: string[] = [
    '#6366f1', '#4f46e5', '#8b5cf6', '#a855f7',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#64748b',
  ];

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const idParam = params.get('id');
      if (!idParam || idParam === 'nueva') {
        this.esNueva = true;
        this.cargando = false;
        this.categoria = {
          id: 0,
          nombre: '',
          color: '#6366f1',
          tipo: 'gasto',
          icono: 'tag',
          id_usuario: 1, // Se marca como usuario al crear
        };
        this.categoriaOriginal = { ...this.categoria };
      } else {
        this.esNueva = false;
        this.idCategoria = Number(idParam);

        // Si se transmitió la información en el estado del router, la usamos para carga instantánea
        const stateEtiqueta = history.state?.etiqueta;
        if (stateEtiqueta && Number(stateEtiqueta.id) === this.idCategoria) {
          this.categoria = {
            id: stateEtiqueta.id,
            nombre: stateEtiqueta.nombre || stateEtiqueta.categoria || '',
            color: stateEtiqueta.color || '#6366f1',
            tipo: stateEtiqueta.tipo === 'ingreso' ? 'ingreso' : 'gasto',
            icono: stateEtiqueta.icono || 'tag',
            id_usuario: stateEtiqueta.id_usuario ?? null,
          };
          this.categoriaOriginal = {
            nombre: this.categoria.nombre,
            color: this.categoria.color,
            tipo: this.categoria.tipo,
            icono: this.categoria.icono,
          };
          this.cargando = false;
          // Sincronización silenciosa en background
          this.cargarCategoria(this.idCategoria, true);
        } else {
          this.cargando = true;
          this.cargarCategoria(this.idCategoria, false);
        }
      }
    });
  }

  get esCategoriaUsuario(): boolean {
    return this.esNueva || Boolean(this.categoria.id_usuario);
  }

  get hayCambios(): boolean {
    if (this.esNueva) {
      return Boolean(this.categoria.nombre.trim());
    }
    return (
      this.categoria.nombre.trim() !== this.categoriaOriginal.nombre.trim() ||
      this.categoria.color !== this.categoriaOriginal.color ||
      this.categoria.tipo !== this.categoriaOriginal.tipo ||
      this.categoria.icono !== this.categoriaOriginal.icono
    );
  }

  get iconosFiltrados(): CategoryIconDefinition[] {
    const query = this.busquedaIcono.trim().toLowerCase();
    if (query) {
      return this.iconosDisponibles.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          item.iconName.toLowerCase().includes(query)
      );
    }
    return this.iconosDisponibles.filter((item) =>
      this.iconMatchesTab(item, this.pestanaIconoActiva)
    );
  }

  seleccionarPestanaIcono(tabId: string) {
    this.pestanaIconoActiva = tabId;
  }

  private iconMatchesTab(item: CategoryIconDefinition, tab: string): boolean {
    if (!item.categories || item.categories.length === 0) {
      return false;
    }
    if (tab === 'finance') {
      return item.categories.some((c) => c === 'finance' || c === 'account');
    }
    if (tab === 'home') {
      return item.categories.some((c) => c === 'home' || c === 'buildings');
    }
    if (tab === 'social') {
      return item.categories.some((c) => c === 'social' || c === 'people');
    }
    return item.categories.includes(tab);
  }

  getIconName(iconId?: string | null): string {
    return getCategoryIconName(iconId);
  }

  swatchShadow(color: string): string {
    if (this.categoria.color === color) {
      return `0 0 0 2px #0f172a, 0 0 0 4px ${color}`;
    }
    return 'none';
  }

  seleccionarTipo(tipo: 'gasto' | 'ingreso') {
    if (!this.esCategoriaUsuario) return;
    this.categoria.tipo = tipo;
  }

  abrirModalIcono() {
    if (!this.esCategoriaUsuario) return;
    this.busquedaIcono = '';
    this.pestanaIconoActiva = 'finance';
    this.modalIconoAbierto = true;
  }

  cerrarModalIcono() {
    this.modalIconoAbierto = false;
    this.busquedaIcono = '';
  }

  seleccionarIcono(iconId: string) {
    if (!this.esCategoriaUsuario) return;
    this.categoria.icono = iconId;
    this.modalIconoAbierto = false;
  }

  cargarCategoria(id: number, silencioso = false) {
    if (!silencioso) {
      this.cargando = true;
    }
    this.movimientosService
      .consultarEtiquetas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (etiquetas: any[]) => {
          const encontrada = etiquetas.find((e) => Number(e.id) === id);
          if (encontrada) {
            const nuevaCategoria = {
              id: encontrada.id,
              nombre: encontrada.nombre || encontrada.categoria || '',
              color: encontrada.color || '#6366f1',
              tipo: (encontrada.tipo === 'ingreso' ? 'ingreso' : 'gasto') as 'gasto' | 'ingreso',
              icono: encontrada.icono || 'tag',
              id_usuario: encontrada.id_usuario ?? null,
            };
            if (!this.hayCambios) {
              this.categoria = nuevaCategoria;
              this.categoriaOriginal = {
                nombre: this.categoria.nombre,
                color: this.categoria.color,
                tipo: this.categoria.tipo,
                icono: this.categoria.icono,
              };
            }
          } else if (!silencioso) {
            this.toastService.show('Etiqueta no encontrada', 'error');
            this.volver();
          }
          this.cargando = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.cargando = false;
          if (!silencioso) {
            this.toastService.show('Error al cargar la etiqueta', 'error');
            this.volver();
          }
          this.cd.detectChanges();
        },
      });
  }

  async volver() {
    if (this.hayCambios) {
      const result = await Swal.fire({
        title: '¿Descartar cambios?',
        text: 'Tienes modificaciones sin guardar que se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Descartar',
        cancelButtonText: 'Seguir editando',
        reverseButtons: true,
        customClass: monetraSweetAlertClasses,
        buttonsStyling: false,
      });

      if (!result.isConfirmed) return;
    }
    this.router.navigate(['/configuracion/categorias']);
  }

  guardar() {
    const nombre = this.categoria.nombre.trim();
    if (!nombre) {
      this.toastService.show('El nombre de la etiqueta es obligatorio', 'error');
      return;
    }

    this.guardando = true;
    const payload = {
      nombre,
      color: this.categoria.color,
      tipo: this.categoria.tipo,
      icono: this.categoria.icono,
    };

    if (this.esNueva) {
      this.movimientosService
        .crearEtiqueta(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.toastService.show('Etiqueta creada correctamente', 'success');
            this.router.navigate(['/configuracion/categorias']);
          },
          error: (err) => {
            this.guardando = false;
            this.cd.detectChanges();
            this.toastService.show(err?.error?.message || 'Error al crear la etiqueta', 'error');
          },
        });
    } else {
      this.movimientosService
        .actualizarEtiqueta(this.categoria.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.guardando = false;
            this.toastService.show('Etiqueta actualizada correctamente', 'success');
            this.router.navigate(['/configuracion/categorias']);
          },
          error: (err) => {
            this.guardando = false;
            this.cd.detectChanges();
            this.toastService.show(err?.error?.message || 'Error al actualizar la etiqueta', 'error');
          },
        });
    }
  }

  async eliminar() {
    if (this.esNueva || !this.esCategoriaUsuario) return;

    const result = await Swal.fire({
      title: '¿Eliminar etiqueta?',
      text: `La etiqueta "${this.categoria.nombre}" se eliminará permanentemente de tus opciones.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: monetraSweetAlertClasses,
      buttonsStyling: false,
    });

    if (!result.isConfirmed) return;

    this.eliminando = true;
    this.movimientosService
      .eliminarEtiqueta(this.categoria.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.eliminando = false;
          this.toastService.show('Etiqueta eliminada correctamente', 'success');
          this.router.navigate(['/configuracion/categorias']);
        },
        error: (err) => {
          this.eliminando = false;
          this.cd.detectChanges();
          this.toastService.show(err?.error?.message || 'Error al eliminar la etiqueta', 'error');
        },
      });
  }
}

