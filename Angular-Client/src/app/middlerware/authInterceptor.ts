import { HttpEvent, HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';
import { constants } from '../utils/const';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const apiUrlsWithHeaders = [
        '/api/v1',
        '/api/protected',
        '/api/another-endpoint'
    ];

    const shouldAddHeader = apiUrlsWithHeaders.some(url => req.url.includes(url));

    if (shouldAddHeader) {
        const token = localStorage.getItem(constants.AUTH_TOKEN_KEY);
        if (token) {
            // Check if token already has Bearer prefix
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            const clonedRequest = req.clone({
                setHeaders: {
                    'Authorization': authHeader,
                }
            });
            return next(clonedRequest);
        }
    }

    return next(req);
};
