import { Component } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-global-loader',
  imports: [],
  templateUrl: './global-loader.html',
  styleUrl: './global-loader.css',
})
export class GlobalLoader {
  constructor(public loadingService: LoadingService) {}
}
