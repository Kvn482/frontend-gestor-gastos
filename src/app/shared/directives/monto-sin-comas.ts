import { Directive, HostListener, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Directive({
  selector: 'input[appMontoSinComas]',
  standalone: true,
})
export class MontoSinComas {
  private toastService = inject(ToastService);

  @HostListener('paste', ['$event'])
  validarPegado(event: ClipboardEvent): void {
    if (event.clipboardData?.getData('text/plain').includes(',')) {
      // Cancelar antes del evento input evita transformar 12,50 en 1250.
      event.preventDefault();
      this.toastService.show('Usa punto para los decimales', 'warning', 3000);
    }
  }
}
