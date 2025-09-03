import { HttpEvent, HttpRequest, HttpHandlerFn, HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const apiUrlsWithHeaders = [
        '/api/protected',
        '/api/another-endpoint'
    ];

    const shouldAddHeader = apiUrlsWithHeaders.some(url => req.url.includes(url));

    //   if (shouldAddHeader) {
    const clonedRequest = req.clone({
        setHeaders: {
            'Authorization': `${localStorage.getItem('authToken') || ''}`,
        }
    });
    return next(clonedRequest);
    //   }

    return next(req);
};
