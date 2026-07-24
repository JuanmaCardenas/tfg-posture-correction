import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../exercise/exercise.models';
import { ReviewRequest, ReviewResponse, ReviewSummaryResponse } from './review.models';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/api';

  /** Media, distribución y valoración propia del usuario autenticado. */
  getSummary(exerciseId: number): Observable<ReviewSummaryResponse> {
    return this.http.get<ReviewSummaryResponse>(
      `${this.apiUrl}/exercises/${exerciseId}/reviews/summary`,
    );
  }

  /** Comentarios de los demás usuarios, paginados. El propio no viene aquí. */
  getComments(exerciseId: number, page = 0, size = 5): Observable<PageResponse<ReviewResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<ReviewResponse>>(
      `${this.apiUrl}/exercises/${exerciseId}/reviews`,
      { params },
    );
  }

  /** Crea o sustituye la valoración propia: publicar y editar son la misma llamada. */
  save(exerciseId: number, review: ReviewRequest): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(`${this.apiUrl}/exercises/${exerciseId}/review`, review);
  }

  delete(exerciseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/exercises/${exerciseId}/review`);
  }
}
