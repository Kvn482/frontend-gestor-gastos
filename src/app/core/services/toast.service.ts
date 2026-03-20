import { Injectable, signal } from '@angular/core';

interface ToastData {
  message: string;
  type: string;
  exiting?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toast = signal<ToastData | null>(null);
  readonly toast = this._toast.asReadonly();
  private timer: any;

  show(message: string, type = 'success', duration = 3000) {
    this.clearImmediate();

    this._toast.set({ message, type, exiting: false });

    this.timer = setTimeout(() => {
      this.clear();
    }, duration);
  }

  clear() {
    const current = this._toast();
    if (current && !current.exiting) {
      this._toast.set({ ...current, exiting: true });

      setTimeout(() => {
        this._toast.set(null);
      }, 300);
    }
  }

  private clearImmediate() {
    if (this.timer) clearTimeout(this.timer);
    this._toast.set(null);
  }
}