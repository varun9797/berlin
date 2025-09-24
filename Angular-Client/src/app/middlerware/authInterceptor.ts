import { HttpEvent, HttpRequest, HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { inject } from '@angular/core';
import { constants } from '../utils/const';
import { TokenService } from '../services/token-service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const tokenService = inject(TokenService);
    
    const apiUrlsWithHeaders = [
        '/api/v1',
        '/api/protected',
        '/api/another-endpoint'
    ];

    const shouldAddHeader = apiUrlsWithHeaders.some(url => req.url.includes(url));

    let clonedRequest = req;

    if (shouldAddHeader) {
        const token = tokenService.getToken();
        if (token && !tokenService.isTokenExpired(token)) {
            // Check if token already has Bearer prefix
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            clonedRequest = req.clone({
                setHeaders: {
                    'Authorization': authHeader,
                }
            });
        }
    }

    return next(clonedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            // Handle authentication errors
            if (error.status === 401) {
                console.log('Received 401 Unauthorized - Token may be expired');
                tokenService.logout('Server returned 401 - Token expired or invalid');
                return throwError(() => error);
            }
            
            if (error.status === 403) {
                console.log('Received 403 Forbidden - Access denied');
                // You might want to handle this differently - maybe just show an error
                // without logging out, depending on your needs
                return throwError(() => error);
            }

            // For other errors, just pass them through
            return throwError(() => error);
        })
    );
};
