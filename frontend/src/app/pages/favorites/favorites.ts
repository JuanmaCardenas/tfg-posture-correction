import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FavoriteService } from '../../core/favorite/favorite.service';
import { ExerciseService } from '../../core/exercise/exercise.service';
import {
  EMPTY_FILTERS,
  ExerciseFilters,
  ExerciseFiltersResponse,
  ExerciseSummaryResponse
} from '../../core/exercise/exercise.models';
import { ExerciseCard } from '../../shared/exercise-card/exercise-card';
import { ExerciseFilterBar } from '../../shared/exercise-filter-bar/exercise-filter-bar';

@Component({
  selector: 'app-favorites',
  imports: [ExerciseCard, RouterLink, ExerciseFilterBar],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites implements OnInit {
  private readonly favoriteService = inject(FavoriteService);
  private readonly exerciseService = inject(ExerciseService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterOptions = signal<ExerciseFiltersResponse | null>(null);
  protected readonly favorites = signal<ExerciseSummaryResponse[]>([]);
  protected readonly filters = signal<ExerciseFilters>(EMPTY_FILTERS);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);

  protected readonly EMPTY_FILTERS = EMPTY_FILTERS;

  /**
   * La barra se muestra según el total guardado, no según los resultados
   * visibles: si un filtro deja la lista a cero, hay que poder deshacerlo.
   */
  protected readonly showFilterBar = computed(() => this.favorites().length >= 2);

  protected readonly hasActiveFilters = computed(() => {
    const { search, groups, difficulty } = this.filters();
    return search.trim() !== '' || groups.length > 0 || difficulty !== null;
  });

  /**
   * Filtrado en el navegador: la lista de favoritos es personal y pequeña, ya
   * está descargada entera, y así el filtro responde sin ir al servidor.
   * Reproduce los mismos criterios que la consulta del catálogo.
   */
  protected readonly visible = computed(() => {
    const { search, groups, difficulty } = this.filters();
    const term = search.trim().toLowerCase();

    return this.favorites().filter((exercise) => {
      const matchesTerm = term === '' || exercise.name.toLowerCase().includes(term);
      const matchesGroups =
        groups.length === 0 || exercise.muscleGroups.some((g) => groups.includes(g.code));
      const matchesDifficulty = difficulty === null || exercise.difficulty.code === difficulty;
      return matchesTerm && matchesGroups && matchesDifficulty;
    });
  });

  ngOnInit(): void {
    this.exerciseService
      .getFilters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => this.filterOptions.set(options));

    this.load();
  }

  retry(): void {
    this.load();
  }

  onFiltersChange(filters: ExerciseFilters): void {
    this.filters.set(filters);
  }

  /**
   * Quitar de favoritos saca la tarjeta de la lista: lo que se muestra es
   * «mis favoritos», y un ejercicio desmarcado ya no lo es.
   */
  removeFavorite(exercise: ExerciseSummaryResponse): void {
    const previous = this.favorites();
    this.favorites.update((list) => list.filter((e) => e.id !== exercise.id));

    this.favoriteService
      .remove(exercise.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          this.favorites.set(previous);
          this.serverError.set('No se ha podido quitar el ejercicio de favoritos.');
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.serverError.set(null);

    this.favoriteService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.favorites.set(page.content);
          this.loading.set(false);
        },
        error: () => {
          this.serverError.set('No se han podido cargar tus favoritos.');
          this.loading.set(false);
        },
      });
  }
}
