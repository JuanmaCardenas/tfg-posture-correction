import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest } from './auth.models';
import { environment } from '../../../environments/environment';

export interface SessionUser {
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'posecoach_token';
  private readonly USER_KEY = 'posecoach_user';

  // Estado de sesión: se inicializa leyendo lo guardado en el navegador
  private readonly _currentUser = signal<SessionUser | null>(this.readStoredUser());

  /** Usuario de la sesión actual (null si no hay sesión). */
  readonly currentUser = this._currentUser.asReadonly();

  /** true si hay sesión iniciada. */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  register(data: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, data)
      .pipe(tap((response) => this.startSession(response)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private startSession(response: AuthResponse): void {
    const user: SessionUser = { username: response.username, role: response.role };
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  private readStoredUser(): SessionUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }
}
