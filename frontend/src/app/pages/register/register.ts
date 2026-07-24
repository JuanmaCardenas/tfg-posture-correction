import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { Alert } from '../../shared/alert/alert';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, Alert],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);
  protected readonly loading = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.group(
    {
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.get('password')!.valueChanges, {
    initialValue: '',
  });

  protected readonly hasMinLength = computed(() => (this.passwordValue() ?? '').length >= 8);
  protected readonly hasLowercase = computed(() => /[a-z]/.test(this.passwordValue() ?? ''));
  protected readonly hasUppercase = computed(() => /[A-Z]/.test(this.passwordValue() ?? ''));
  protected readonly hasNumber = computed(() => /\d/.test(this.passwordValue() ?? ''));

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirm(): void {
    this.showConfirm.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.serverError.set(null);
    this.loading.set(true);

    const { username, email, password } = this.form.value;

    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(this.mapError(err));
      },
    });
  }

  private mapError(err: HttpErrorResponse): string {
    if (err.status === 409) {
      return err.error?.message ?? 'El usuario o el correo ya están registrados.';
    }
    if (err.status === 400 && err.error && typeof err.error === 'object') {
      const first = Object.values(err.error)[0];
      return typeof first === 'string' ? first : 'Revisa los datos introducidos.';
    }
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor. Inténtalo más tarde.';
    }
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  }
}
