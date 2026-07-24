import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ExerciseDetailResponse,
  ExerciseFiltersResponse,
  ExerciseQuery,
  ExerciseSummaryResponse,
  PageResponse,
} from './exercise.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  search(query: ExerciseQuery = {}): Observable<PageResponse<ExerciseSummaryResponse>> {
    let params = new HttpParams().set('page', query.page ?? 0).set('size', query.size ?? 48);

    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    if (query.groups?.length) params = params.set('groups', query.groups.join(','));
    if (query.difficulty) params = params.set('difficulty', query.difficulty);

    return this.http.get<PageResponse<ExerciseSummaryResponse>>(`${this.apiUrl}/exercises`, {
      params,
    });
  }

  getById(id: number): Observable<ExerciseDetailResponse> {
    return this.http.get<ExerciseDetailResponse>(`${this.apiUrl}/exercises/${id}`);
  }

  getFilters(): Observable<ExerciseFiltersResponse> {
    return this.http.get<ExerciseFiltersResponse>(`${this.apiUrl}/exercises/filters`);
  }
}
