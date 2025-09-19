import { Routes } from '@angular/router';
import { authGuard } from './middlerware/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./components/login-component/login-component').then(m => m.LoginComponent)
    }, {
        path: 'chat',
        canActivate: [authGuard],
        loadComponent: () => import('./components/chat-component/chat-component').then(m => m.ChatComponent)
    }, {
        path: 'register',
        loadComponent: () => import('./components/user-resgistration-component/user-resgistration-component').then(m => m.UserResgistrationComponent)
    }
];
