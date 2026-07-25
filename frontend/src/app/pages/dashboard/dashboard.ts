import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { AnalysisService } from '../../core/analysis/analysis.service';
import { AnalysisResultResponse } from '../../core/analysis/analysis.models';
import { FavoriteService } from '../../core/favorite/favorite.service';
import { DashboardService } from '../../core/dashboard/dashboard.service';
import { ExerciseSummaryResponse } from '../../core/exercise/exercise.models';
import { AuthService } from '../../core/auth/auth.service';
import { RouterLink } from '@angular/router';
import { RelativeDatePipe } from '../../shared/relative-date/relative-date-pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RelativeDatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly analysisService = inject(AnalysisService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly favoriteCount = signal(0);
  protected readonly analysisCount = signal(0);
  protected readonly recentAnalyses = signal<AnalysisResultResponse[]>([]);
  protected readonly favorites = signal<ExerciseSummaryResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);

  /** Nombre para la cabecera. Ajusta al método real de tu AuthService. */
  protected readonly username = computed(
    () => this.authService.currentUser()?.username ?? 'usuario',
  );

  ngOnInit(): void {
    forkJoin({
      summary: this.dashboardService.summary(),
      analyses: this.analysisService.findMine(0, 3),
      favorites: this.favoriteService.list(0, 4),
    })
      .pipe(
        catchError(() => {
          this.serverError.set('No se ha podido cargar el inicio.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        if (!data) return;
        this.favoriteCount.set(data.summary.favoriteCount);
        this.analysisCount.set(data.summary.analysisCount);
        this.recentAnalyses.set(data.analyses.content);
        this.favorites.set(data.favorites.content);
        this.loading.set(false);
      });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/img/exercise-placeholder.svg';
  }

  /** Nivel de color del círculo de nota, mismos umbrales que el análisis. */
  protected scoreLevel(score: number): 'good' | 'warning' | 'bad' {
    if (score >= 80) return 'good';
    if (score >= 50) return 'warning';
    return 'bad';
  }
}
