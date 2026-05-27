import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { authGuard } from './core/guards/auth-guard';
import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';
import { guestGuard } from './core/guards/guest-guard';
import { NotFound } from './features/not-found/not-found';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { 
        path: 'login', 
        component: Login, 
        canActivate: [guestGuard] 
    },
    { 
        path: 'register', 
        component: Register, 
        canActivate: [guestGuard] 
    },
    { 
        path: 'forgot-password', 
        component: ForgotPassword, 
        canActivate: [guestGuard] 
    },
    { 
        path: 'reset-password', 
        component: ResetPassword, 
        canActivate: [guestGuard] 
    },
    {
        path: '',
        component: Layout,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: Dashboard },
        ]
    },
    
    { path: '**', component: NotFound }
];
