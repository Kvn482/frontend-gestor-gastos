import { HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthService } from "../core/services/auth.service";
import { catchError, switchMap, throwError } from "rxjs";
import { Router } from "@angular/router";
import { ToastService } from "../core/services/toast.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    const token = this.authService.getAccessToken();

    if (token && !req.url.includes('/refresh')) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError(error => {

        if (error.status === 401 && !req.url.includes('/refresh')) {

          return this.authService.refreshToken().pipe(
            switchMap((response: any) => {

              this.authService.saveSession(
                response.accessToken,
                response.refreshToken
              );

              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${response.accessToken}`
                }
              });

              return next.handle(newReq);
            }),
            catchError((refreshError) => {
              this.authService.logout();
              const message = refreshError?.error?.message
                || 'Tu sesión ha expirado. Inicia sesión nuevamente.';

              this.router.navigate(['/login']).then(() => {
                this.toastService.show(message, 'error');
              });

              return throwError(() => refreshError);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }
}
