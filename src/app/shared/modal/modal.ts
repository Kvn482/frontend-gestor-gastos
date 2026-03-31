import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  @Input() isOpen = false;
  @Input() modalTitle = '';

  @Output() closed = new EventEmitter<void>();

  isClosing = false;

  close() {
    this.isClosing = true;

    setTimeout(() => {
      this.isClosing = false;
      this.closed.emit();
    }, 350); // mismo tiempo que animación
  }

  @HostListener('document:keydown', ['$event'])
  onEsc(event: KeyboardEvent) {
    if (this.isOpen && event.key === 'Escape') {
      this.close();
    }
  }
}
