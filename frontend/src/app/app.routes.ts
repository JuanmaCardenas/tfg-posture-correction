import { Routes } from '@angular/router';

export const routes: Routes = [
  // Zona pública
  {
    path: '',
    loadComponent: () =>
      import('./layouts/public-layout/public-layout').then((m) => m.PublicLayout),
    children: [{ path: '', loadComponent: () => import('./pages/home/home').then((m) => m.Home) }],
  },
  // Zona de autenticación
  {
    path: '',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
      {
        path: 'register',
        loadComponent: () => import('./pages/register/register').then((m) => m.Register),
      },
    ],
  },
  // Zona privada (con menú)
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
