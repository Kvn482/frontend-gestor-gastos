import { HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../core/services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private readonly skipHeader = 'X-Skip-Global-Loader';

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    if (req.headers.has(this.skipHeader)) {
      return next.handle(req.clone({ headers: req.headers.delete(this.skipHeader) }));
    }

    this.loadingService.start();

    return next.handle(req).pipe(finalize(() => this.loadingService.stop()));
  }
}
