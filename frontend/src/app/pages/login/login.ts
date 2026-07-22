import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { Alert } from '../../shared/alert/alert';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Alert],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.serverError()) this.serverError.set(null);
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.loading.set(true);

    const { username, password } = this.form.value;

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(this.mapError(err));
      },
    });
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 401) {
      return err.error?.error ?? 'Usuario o contraseña incorrectos.';
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Inténtalo más tarde.';
    }
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  }
}
