import {Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {DecimalPipe, Location} from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {HttpErrorResponse} from '@angular/common/http';
import {catchError, EMPTY, forkJoin, switchMap, tap} from 'rxjs';
import {ExerciseService} from '../../core/exercise/exercise.service';
import {ExerciseDetailResponse} from '../../core/exercise/exercise.models';
import {ReviewService} from '../../core/review/review.service';
import {ReviewResponse, ReviewSummaryResponse} from '../../core/review/review.models';
import {StarRating} from '../../shared/star-rating/star-rating';
import {RelativeDatePipe} from '../../shared/relative-date/relative-date-pipe';

type DetailTab = 'info' | 'analysis' | 'ratings';

const COMMENTS_PAGE_SIZE = 5;

@Component({
  selector: 'app-exercise-detail',
  imports: [RouterLink, DecimalPipe, StarRating, RelativeDatePipe],
  templateUrl: './exercise-detail.html',
  styleUrl: './exercise-detail.scss',
})
export class ExerciseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly exerciseService = inject(ExerciseService);
  private readonly reviewService = inject(ReviewService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly CONTENT_MAX = 500;

  protected readonly exercise = signal<ExerciseDetailResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);
  protected readonly activeTab = signal<DetailTab>('info');

  // ── Estado de la pestaña de valoraciones ──
  protected readonly summary = signal<ReviewSummaryResponse | null>(null);
  protected readonly comments = signal<ReviewResponse[]>([]);
  protected readonly commentsTotal = signal(0);
  protected readonly commentsPage = signal(0);
  protected readonly ratingsLoading = signal(false);
  protected readonly ratingsError = signal<string | null>(null);
  protected readonly commentsLoading = signal(false);

  // ── Estado del formulario ──
  protected readonly draftScore = signal(0);
  protected readonly draftContent = signal('');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly difficultyClass = computed(
    () => this.exercise()?.difficulty.code.toLowerCase() ?? '',
  );

  protected readonly hasRatings = computed(() => (this.exercise()?.ratingCount ?? 0) > 0);

  /** El módulo de análisis (E4) solo aplica a los ejercicios con analizador. */
  protected readonly supportsAnalysis = computed(() => this.exercise()?.analysisType !== null);

  protected readonly myReview = computed(() => this.summary()?.myReview ?? null);

  /** Con valoración publicada el formulario se bloquea, salvo que se pulse «Editar». */
  protected readonly formDisabled = computed(() => this.myReview() !== null && !this.editing());

  protected readonly remainingComments = computed(
    () => this.commentsTotal() - this.comments().length,
  );

  /**
   * El comentario propio encabeza la lista y se marca como tal; el resto llega
   * del backend, que ya lo excluye para que no aparezca dos veces.
   */
  protected readonly displayedComments = computed(() => {
    const mine = this.myReview();
    const own = mine?.content ? [{ review: mine, own: true }] : [];
    return [...own, ...this.comments().map((review) => ({ review, own: false }))];
  });

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
          this.resetRatings();
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
    // Carga diferida: quien no abra la pestaña no paga sus dos peticiones.
    if (tab === 'ratings' && this.summary() === null && !this.ratingsLoading()) {
      this.loadRatings();
    }
  }

  // ── Formulario ──

  onContentInput(event: Event): void {
    this.draftContent.set((event.target as HTMLTextAreaElement).value);
  }

  startEditing(): void {
    this.syncDraft(this.myReview());
    this.editing.set(true);
    this.confirmingDelete.set(false);
    this.formError.set(null);
  }

  cancelEditing(): void {
    this.syncDraft(this.myReview());
    this.editing.set(false);
    this.formError.set(null);
  }

  publish(): void {
    const id = this.exercise()?.id;
    if (!id || this.draftScore() === 0 || this.saving()) return;

    const text = this.draftContent().trim();

    this.saving.set(true);
    this.formError.set(null);

    this.reviewService
      .save(id, { score: this.draftScore(), content: text === '' ? null : text })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.editing.set(false);
          this.saving.set(false);
          this.loadRatings({ patchHeader: true });
        },
        error: () => {
          this.formError.set('No se ha podido guardar tu valoración.');
          this.saving.set(false);
        },
      });
  }

  deleteReview(): void {
    const id = this.exercise()?.id;
    if (!id || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    this.reviewService
      .delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirmingDelete.set(false);
          this.editing.set(false);
          this.saving.set(false);
          this.loadRatings({ patchHeader: true });
        },
        error: () => {
          this.formError.set('No se ha podido eliminar tu valoración.');
          this.saving.set(false);
        },
      });
  }

  // ── Comentarios ──

  loadMoreComments(): void {
    const id = this.exercise()?.id;
    if (!id || this.commentsLoading()) return;

    const next = this.commentsPage() + 1;
    this.commentsLoading.set(true);

    this.reviewService
      .getComments(id, next, COMMENTS_PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          // Se acumulan: «Ver más» amplía la lista, no la sustituye.
          this.comments.update((current) => [...current, ...page.content]);
          this.commentsTotal.set(page.totalElements);
          this.commentsPage.set(next);
          this.commentsLoading.set(false);
        },
        error: () => this.commentsLoading.set(false),
      });
  }

  // ── Ayudantes de plantilla ──

  initialsOf(username: string): string {
    return username.slice(0, 2).toUpperCase();
  }

  wasEdited(review: ReviewResponse): boolean {
    return review.updatedAt !== review.createdAt;
  }

  /** Anchura de cada barra como porcentaje sobre el total de valoraciones. */
  barPercent(count: number): number {
    const total = this.summary()?.ratingCount ?? 0;
    return total === 0 ? 0 : (count / total) * 100;
  }

  // ── Interno ──

  private loadRatings(options: { patchHeader?: boolean } = {}): void {
    const id = this.exercise()?.id;
    if (!id) return;

    this.ratingsLoading.set(true);
    this.ratingsError.set(null);

    forkJoin({
      summary: this.reviewService.getSummary(id),
      comments: this.reviewService.getComments(id, 0, COMMENTS_PAGE_SIZE),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, comments }) => {
          this.summary.set(summary);
          this.comments.set(comments.content);
          this.commentsTotal.set(comments.totalElements);
          this.commentsPage.set(0);
          this.syncDraft(summary.myReview);
          this.ratingsLoading.set(false);

          if (options.patchHeader) {
            this.patchHeader(summary);
          }
        },
        error: () => {
          this.ratingsError.set('No se han podido cargar las valoraciones.');
          this.ratingsLoading.set(false);
        },
      });
  }

  /** La cabecera muestra media y recuento: al publicar o borrar hay que refrescarlos. */
  private patchHeader(summary: ReviewSummaryResponse): void {
    this.exercise.update((ex) =>
      ex === null
        ? null
        : { ...ex, averageRating: summary.averageRating, ratingCount: summary.ratingCount },
    );
  }

  private syncDraft(review: ReviewResponse | null): void {
    this.draftScore.set(review?.score ?? 0);
    this.draftContent.set(review?.content ?? '');
  }

  private resetRatings(): void {
    this.summary.set(null);
    this.comments.set([]);
    this.commentsTotal.set(0);
    this.commentsPage.set(0);
    this.editing.set(false);
    this.confirmingDelete.set(false);
    this.formError.set(null);
    this.syncDraft(null);
  }
}
