import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, switchMap, tap } from 'rxjs';
import { ExerciseService } from '../../core/exercise/exercise.service';
import { ExerciseDetailResponse } from '../../core/exercise/exercise.models';

type DetailTab = 'info' | 'analysis' | 'ratings';

@Component({
  selector: 'app-exercise-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './exercise-detail.html',
  styleUrl: './exercise-detail.scss',
})
export class ExerciseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly exerciseService = inject(ExerciseService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly exercise = signal<ExerciseDetailResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);
  protected readonly activeTab = signal<DetailTab>('info');

  protected readonly difficultyClass = computed(
    () => this.exercise()?.difficulty.code.toLowerCase() ?? '',
  );

  protected readonly hasRatings = computed(() => (this.exercise()?.ratingCount ?? 0) > 0);

  /** El módulo de análisis (E4) solo aplica a los ejercicios con analizador. */
  protected readonly supportsAnalysis = computed(() => this.exercise()?.analysisType !== null);

  /** URL de embebido autorizada explícitamente para poder usarse en el iframe. */
  protected readonly videoUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.exercise()?.youtubeVideoId;
    if (!id) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    );
  });

  constructor() {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.serverError.set(null);
          this.activeTab.set('info');
        }),
        switchMap((params) =>
          this.exerciseService.getById(Number(params.get('id'))).pipe(
            catchError((err: HttpErrorResponse) => {
              this.loading.set(false);
              this.serverError.set(
                err.status === 404
                  ? 'El ejercicio que buscas no existe.'
                  : 'No se ha podido cargar el ejercicio.',
              );
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((exercise) => {
        this.exercise.set(exercise);
        this.loading.set(false);
      });
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/exercises']); // entrada directa por URL
    }
  }

  selectTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }
}
