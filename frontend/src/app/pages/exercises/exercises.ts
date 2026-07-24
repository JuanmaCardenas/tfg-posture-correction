import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';
import { ExerciseService } from '../../core/exercise/exercise.service';
import {
  DifficultyCode,
  EMPTY_FILTERS,
  ExerciseFilters,
  ExerciseFiltersResponse,
  ExerciseSummaryResponse,
  MuscleGroupCode,
} from '../../core/exercise/exercise.models';
import { ExerciseCard } from '../../shared/exercise-card/exercise-card';
import { ExerciseFilterBar } from '../../shared/exercise-filter-bar/exercise-filter-bar';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { FavoriteService } from '../../core/favorite/favorite.service';

@Component({
  selector: 'app-exercises',
  imports: [ExerciseCard, ExerciseFilterBar],
  templateUrl: './exercises.html',
  styleUrl: './exercises.scss',
})
export class Exercises implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly exerciseService = inject(ExerciseService);
  private readonly criteria = new Subject<ExerciseFilters>();
  private readonly favoriteService = inject(FavoriteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterOptions = signal<ExerciseFiltersResponse | null>(null);
  protected readonly exercises = signal<ExerciseSummaryResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);
  protected readonly activeFilters = signal<ExerciseFilters>(EMPTY_FILTERS);
  protected readonly initialFilters = signal<ExerciseFilters>(EMPTY_FILTERS);

  protected readonly hasActiveFilters = signal(false);

  constructor() {
    this.criteria
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.serverError.set(null);
        }),
        // switchMap cancela la petición anterior si llega un criterio nuevo:
        // evita que una respuesta lenta y obsoleta pise a otra más reciente.
        switchMap((filters) =>
          this.exerciseService
            .search({
              search: filters.search,
              groups: filters.groups,
              difficulty: filters.difficulty,
            })
            .pipe(
              catchError(() => {
                this.loading.set(false);
                this.serverError.set('No se ha podido cargar el catálogo de ejercicios.');
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.exercises.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    // Los valores admitidos llegan antes para poder validar contra ellos
    // lo que venga escrito en la URL.
    this.exerciseService.getFilters().subscribe({
      next: (options) => {
        this.filterOptions.set(options);
        const filters = this.parseFilters(this.route.snapshot.queryParamMap, options);
        this.initialFilters.set(filters);
        this.applyFilters(filters, false);
      },
      error: () => {
        this.loading.set(false);
        this.serverError.set('No se han podido cargar los filtros.');
      },
    });
  }

  onFiltersChange(filters: ExerciseFilters): void {
    this.applyFilters(filters, true);
  }

  retry(): void {
    this.applyFilters(this.activeFilters(), false);
  }

  private applyFilters(filters: ExerciseFilters, updateUrl: boolean): void {
    this.activeFilters.set(filters);
    this.hasActiveFilters.set(
      filters.search !== '' || filters.groups.length > 0 || filters.difficulty !== null,
    );
    if (updateUrl) this.syncUrl(filters);
    this.criteria.next(filters);
  }

  /** Refleja los filtros en la URL. Un valor null elimina el parámetro. */
  private syncUrl(filters: ExerciseFilters): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: filters.search || null,
        groups: filters.groups.length ? filters.groups.join(',') : null,
        difficulty: filters.difficulty ?? null,
      },
      // Sustituye la entrada del historial en lugar de apilar una por filtro.
      replaceUrl: true,
    });
  }

  /** Lee los filtros de la URL descartando cualquier valor no admitido. */
  private parseFilters(params: ParamMap, options: ExerciseFiltersResponse): ExerciseFilters {
    const validGroups = new Set(options.muscleGroups.map((g) => g.code));
    const groups = (params.get('groups') ?? '')
      .split(',')
      .filter((code): code is MuscleGroupCode => validGroups.has(code as MuscleGroupCode));

    const rawDifficulty = params.get('difficulty');
    const difficulty = options.difficulties.some((d) => d.code === rawDifficulty)
      ? (rawDifficulty as DifficultyCode)
      : null;

    return { search: params.get('search')?.trim() ?? '', groups, difficulty };
  }

  toggleFavorite(exercise: ExerciseSummaryResponse): void {
    const next = !exercise.favorite;

    // Actualización optimista: el corazón cambia al instante y se revierte si falla.
    this.setFavorite(exercise.id, next);

    const request = next
      ? this.favoriteService.add(exercise.id)
      : this.favoriteService.remove(exercise.id);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => this.setFavorite(exercise.id, !next),
    });
  }

  /** Sustituye el ejercicio por una copia: las señales detectan el cambio por identidad. */
  private setFavorite(id: number, favorite: boolean): void {
    this.exercises.update((list) => list.map((e) => (e.id === id ? { ...e, favorite } : e)));
  }
}
