import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { initFlowbite } from 'flowbite';
import { Toast } from './shared/toast/toast';
import { GlobalLoader } from './shared/global-loader/global-loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, GlobalLoader],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App  implements OnInit{
  protected readonly title = signal('gestor-gastos');

  ngOnInit(): void {
    initFlowbite();
  }
}
