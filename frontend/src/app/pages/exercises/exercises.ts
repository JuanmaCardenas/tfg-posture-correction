import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';
import { ExerciseService } from '../../core/exercise/exercise.service';
import {
  EMPTY_FILTERS,
  ExerciseFilters,
  ExerciseFiltersResponse,
  ExerciseSummaryResponse,
} from '../../core/exercise/exercise.models';
import { ExerciseCard } from '../../shared/exercise-card/exercise-card';
import { ExerciseFilterBar } from '../../shared/exercise-filter-bar/exercise-filter-bar';

@Component({
  selector: 'app-exercises',
  imports: [ExerciseCard, ExerciseFilterBar],
  templateUrl: './exercises.html',
  styleUrl: './exercises.scss',
})
export class Exercises implements OnInit {
  private readonly exerciseService = inject(ExerciseService);
  private readonly criteria = new Subject<ExerciseFilters>();

  protected readonly filterOptions = signal<ExerciseFiltersResponse | null>(null);
  protected readonly exercises = signal<ExerciseSummaryResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);
  protected readonly activeFilters = signal<ExerciseFilters>(EMPTY_FILTERS);

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
    this.exerciseService.getFilters().subscribe({
      next: (options) => this.filterOptions.set(options),
      error: () => this.serverError.set('No se han podido cargar los filtros.'),
    });

    this.criteria.next(EMPTY_FILTERS);
  }

  onFiltersChange(filters: ExerciseFilters): void {
    this.activeFilters.set(filters);
    this.hasActiveFilters.set(
      filters.search !== '' || filters.groups.length > 0 || filters.difficulty !== null,
    );
    this.criteria.next(filters);
  }

  retry(): void {
    this.criteria.next(this.activeFilters());
  }
}
