import { Component, computed, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRating {
  protected readonly roundedValue = computed(() => Math.round(this.value()));

  /** Puntuación mostrada. Admite decimales en modo lectura (4.2). */
  readonly value = input(0);

  /** Si es true, las estrellas se pueden pulsar para puntuar. */
  readonly interactive = input(false);

  /** Bloquea la interacción sin cambiar de modo (valoración ya publicada). */
  readonly disabled = input(false);

  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly valueChange = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];

  /** Estrella bajo el cursor: permite previsualizar antes de pulsar. */
  private readonly hovered = signal(0);

  /**
   * Anchura de la capa dorada superpuesta. Es lo que permite pintar
   * medias estrellas sin recortar imágenes ni usar un icono distinto.
   */
  protected readonly fillPercent = computed(() => {
    const clamped = Math.min(5, Math.max(0, this.value()));
    return (clamped / 5) * 100;
  });

  /** En modo interactivo manda el cursor si lo hay; si no, el valor real. */
  protected readonly highlighted = computed(() => this.hovered() || Math.round(this.value()));

  protected readonly readLabel = computed(() => `${this.value().toFixed(1)} de 5 estrellas`);

  protected pick(score: number): void {
    if (!this.disabled()) {
      this.valueChange.emit(score);
    }
  }

  protected enter(score: number): void {
    if (!this.disabled()) {
      this.hovered.set(score);
    }
  }

  protected leave(): void {
    this.hovered.set(0);
  }

  protected readonly Math = Math;
}
