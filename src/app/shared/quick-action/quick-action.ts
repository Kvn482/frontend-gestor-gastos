import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quick-action',
  standalone: true,
  imports: [],
  templateUrl: './quick-action.html',
  styleUrl: './quick-action.css',
})
export class QuickAction {

  @Input() label!: string
  @Input() icon!: string
  @Input() route?: string

  @Output() action = new EventEmitter<void>()

  constructor(private router: Router) {}

  go() {
    if (this.route) {
      this.router.navigate([this.route])
      return
    }

    this.action.emit()
  }

}
