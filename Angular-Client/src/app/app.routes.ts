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
    },
    {
        path: 'chat',
        canActivate: [authGuard],
        loadComponent: () => import('./components/chat-component/chat-component').then(m => m.ChatComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./components/chat-component/conversations-list/conversations-list.component').then(m => m.ConversationsListComponent)
            },
            {
                path: ':conversationId',
                loadComponent: () => import('./components/chat-component/chat-box/chat-box.component').then(m => m.ChatBoxComponent)
            }
        ]
    },
    {
        path: 'register',
        loadComponent: () => import('./components/user-resgistration-component/user-resgistration-component').then(m => m.UserResgistrationComponent)
    },
    {
        path: 'join-group',
        loadComponent: () => import('./components/join-group/join-group.component').then(m => m.JoinGroupComponent)
    }
];
