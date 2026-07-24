import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private pendingRequests = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private _visible = signal(false);
  private _slow = signal(false);

  readonly visible = this._visible.asReadonly();
  readonly slow = this._slow.asReadonly();

  start(): void {
    this.pendingRequests++;

    if (this.pendingRequests > 1) return;

    this.showTimer = setTimeout(() => {
      this._visible.set(true);
    }, 700);

    this.slowTimer = setTimeout(() => {
      this._slow.set(true);
    }, 6000);
  }

  stop(): void {
    this.pendingRequests = Math.max(this.pendingRequests - 1, 0);

    if (this.pendingRequests > 0) return;

    this.clearTimers();
    this._visible.set(false);
    this._slow.set(false);
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
  }
}
