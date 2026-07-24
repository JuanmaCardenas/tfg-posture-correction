import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../../core/user/user.service';
import { UserProfile } from '../../core/user/user.models';
import { AuthService } from '../../core/auth/auth.service';
import { Alert } from '../../shared/alert/alert';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const nueva = group.get('newPassword')?.value;
  const repetir = group.get('confirmNewPassword')?.value;
  return nueva === repetir ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, Alert],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // --- Perfil / email ---
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly profile = signal<UserProfile | null>(null);

  protected readonly username = computed(() => this.profile()?.username ?? '');
  protected readonly initials = computed(() => this.username().slice(0, 2).toUpperCase());
  protected readonly memberSince = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const d = new Date(p.createdAt);
    return `Miembro desde ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  });

  protected readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // --- Cambio de contraseña ---
  protected readonly showPasswordForm = signal(false);
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);
  protected readonly pwSaving = signal(false);
  protected readonly pwError = signal<string | null>(null);

  protected readonly passwordForm: FormGroup = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/),
        ],
      ],
      confirmNewPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly newPasswordValue = toSignal(this.passwordForm.get('newPassword')!.valueChanges, {
    initialValue: '',
  });

  protected readonly passwordMeetsPolicy = computed(() => {
    const v = this.newPasswordValue() ?? '';
    return v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.serverError()) this.serverError.set(null);
      if (this.successMessage()) this.successMessage.set(null);
    });
    this.passwordForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.pwError()) this.pwError.set(null);
    });
  }

  ngOnInit(): void {
    this.userService.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.form.patchValue({ email: p.email });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.serverError.set('No se pudieron cargar tus datos.');
      },
    });
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.serverError.set(null);
    this.successMessage.set(null);
    this.saving.set(true);
    const email = this.form.value.email as string;
    this.userService.updateProfile({ email }).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.saving.set(false);
        this.successMessage.set('Cambios guardados correctamente.');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.serverError.set(this.mapProfileError(err));
      },
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm.update((v) => !v);
    this.passwordForm.reset();
    this.pwError.set(null);
  }

  toggleCurrent(): void {
    this.showCurrent.update((v) => !v);
  }
  toggleNew(): void {
    this.showNew.update((v) => !v);
  }
  toggleConfirm(): void {
    this.showConfirm.update((v) => !v);
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) return;
    this.pwError.set(null);
    this.pwSaving.set(true);
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.userService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        // Contraseña cambiada: cerramos sesión y volvemos al login
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err: HttpErrorResponse) => {
        this.pwSaving.set(false);
        this.pwError.set(this.mapPasswordError(err));
      },
    });
  }

  private mapProfileError(err: HttpErrorResponse): string {
    if (err.status === 409) return err.error?.message ?? 'El email ya está registrado.';
    if (err.status === 400 && err.error && typeof err.error === 'object') {
      const first = Object.values(err.error)[0];
      return typeof first === 'string' ? first : 'Revisa los datos introducidos.';
    }
    if (err.status === 0) return 'No se pudo conectar con el servidor. Inténtalo más tarde.';
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  }

  private mapPasswordError(err: HttpErrorResponse): string {
    if (err.status === 401) return err.error?.message ?? 'La contraseña actual no es correcta.';
    if (err.status === 400 && err.error && typeof err.error === 'object') {
      const first = Object.values(err.error)[0];
      return typeof first === 'string' ? first : 'Revisa los datos introducidos.';
    }
    if (err.status === 0) return 'No se pudo conectar con el servidor. Inténtalo más tarde.';
    return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
  }
}
