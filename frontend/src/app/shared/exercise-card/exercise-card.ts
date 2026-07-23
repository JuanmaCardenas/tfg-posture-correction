import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExerciseSummaryResponse } from '../../core/exercise/exercise.models';

@Component({
  selector: 'app-exercise-card',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './exercise-card.html',
  styleUrl: './exercise-card.scss',
})
export class ExerciseCard {
  readonly exercise = input.required<ExerciseSummaryResponse>();

  /** El botón de favorito se activa en E3 (RF-07). */
  readonly showFavorite = input(false);

  readonly favoriteToggled = output<ExerciseSummaryResponse>();

  /** Clase del distintivo de dificultad: easy | medium | hard. */
  protected readonly difficultyClass = computed(() =>
    this.exercise().difficulty.code.toLowerCase(),
  );

  /** El backend devuelve 0 valoraciones hasta E3 (RF-05). */
  protected readonly hasRatings = computed(() => this.exercise().ratingCount > 0);

  onFavoriteClick(event: MouseEvent): void {
    // La tarjeta entera es un enlace: evitamos navegar al pulsar el corazón.
    event.preventDefault();
    event.stopPropagation();
    this.favoriteToggled.emit(this.exercise());
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/img/exercise-placeholder.svg';
  }
}
