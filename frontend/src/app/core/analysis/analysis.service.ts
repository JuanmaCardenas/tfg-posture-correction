import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnalysisResultRequest, AnalysisResultResponse } from './analysis.models';
import { PageResponse } from '../exercise/exercise.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  save(request: AnalysisResultRequest): Observable<AnalysisResultResponse> {
    return this.http.post<AnalysisResultResponse>(`${this.apiUrl}/analyses`, request);
  }

  findMine(page = 0, size = 5): Observable<PageResponse<AnalysisResultResponse>> {
    return this.http.get<PageResponse<AnalysisResultResponse>>(`${this.apiUrl}/analyses`, {
      params: { page, size },
    });
  }
}
