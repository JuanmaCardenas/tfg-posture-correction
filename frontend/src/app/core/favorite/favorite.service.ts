import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ExerciseSummaryResponse, PageResponse } from '../exercise/exercise.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Idempotente: marcar algo ya marcado no es un error. */
  add(exerciseId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/exercises/${exerciseId}/favorite`, {});
  }

  remove(exerciseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/exercises/${exerciseId}/favorite`);
  }

  list(page = 0, size = 24): Observable<PageResponse<ExerciseSummaryResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<ExerciseSummaryResponse>>(`${this.apiUrl}/favorites`, {
      params,
    });
  }
}
