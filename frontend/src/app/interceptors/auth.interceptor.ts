import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const authService = inject(AuthService);

    const addToken = (r: HttpRequest<unknown>) => {
        const token = authService.token;
        return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
    };

    return next(addToken(req)).pipe(
        catchError((err: HttpErrorResponse) => {
            // Only retry on 401, and never for the refresh or login endpoints themselves
            if (err.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
                return authService.refreshToken().pipe(
                    switchMap(() => next(addToken(req))),
                    catchError(() => {
                        authService.logout();
                        return throwError(() => err);
                    })
                );
            }
            return throwError(() => err);
        })
    );
};
