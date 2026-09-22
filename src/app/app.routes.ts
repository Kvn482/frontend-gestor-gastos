import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { authGuard } from './core/guards/auth-guard';
import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';
import { Settings } from './features/settings/settings';
import { guestGuard } from './core/guards/guest-guard';
import { NotFound } from './features/not-found/not-found';
import { ResendActivation } from './features/auth/resend-activation/resend-activation';
import { Cuentas } from './features/cuentas/cuentas';
import { CuentaDetalle } from './features/cuenta-detalle/cuenta-detalle';
import { Analisis } from './features/analisis/analisis';
import { Movimientos } from './features/movimientos/movimientos';
import { Perfil } from './features/perfil/perfil';
import { Categorias } from './features/categorias/categorias';
import { CategoriaDetalle } from './features/categoria-detalle/categoria-detalle';
import { MovimientosFrecuentes } from './features/movimientos-frecuentes/movimientos-frecuentes';

export const routes: Routes = [
    { path: '', redirectTo: 'inicio', pathMatch: 'full' },
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
        path: 'resend-activation', 
        component: ResendActivation, 
        canActivate: [guestGuard] 
    },
    { 
        path: '',
        component: Layout,
        canActivate: [authGuard],
        children: [
            { path: 'inicio', component: Dashboard },
            { path: 'dashboard', redirectTo: 'inicio', pathMatch: 'full' },
            { path: 'analisis', component: Analisis },
            { path: 'movimientos', component: Movimientos },
            { path: 'configuracion', component: Settings },
            { path: 'configuracion/perfil', component: Perfil },
            { path: 'perfil', redirectTo: 'configuracion/perfil', pathMatch: 'full' },
            { path: 'configuracion/categorias', component: Categorias },
            { path: 'configuracion/categorias/nueva', component: CategoriaDetalle },
            { path: 'configuracion/categorias/:id', component: CategoriaDetalle },
            { path: 'categorias', redirectTo: 'configuracion/categorias', pathMatch: 'full' },
            { path: 'configuracion/movimientos-frecuentes', component: MovimientosFrecuentes },
            { path: 'movimientos-frecuentes', redirectTo: 'configuracion/movimientos-frecuentes', pathMatch: 'full' },
            { path: 'cuentas', component: Cuentas },
            { path: 'cuentas/:id', component: CuentaDetalle },
        ]
    },
    
    { path: '**', component: NotFound }
];
