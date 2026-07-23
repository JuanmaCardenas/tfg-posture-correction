import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err) => {
      // Peticiones donde un 401 es un error del formulario, no una sesión caducada:
      // login/registro (credenciales incorrectas) y cambio de contraseña
      // (la contraseña actual no coincide).
      const errorDeFormulario =
        req.url.includes('/auth/') || req.url.includes('/users/me/password');

      if (err.status === 401 && !errorDeFormulario) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => err);
    }),
  );
};
