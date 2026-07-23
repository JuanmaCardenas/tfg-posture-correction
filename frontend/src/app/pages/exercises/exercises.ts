import { Component, inject, OnInit, signal } from '@angular/core';
import { ExerciseService } from '../../core/exercise/exercise.service';
import { ExerciseSummaryResponse } from '../../core/exercise/exercise.models';
import { ExerciseCard } from '../../shared/exercise-card/exercise-card';

@Component({
  selector: 'app-exercises',
  imports: [ExerciseCard],
  templateUrl: './exercises.html',
  styleUrl: './exercises.scss',
})
export class Exercises implements OnInit {
  private readonly exerciseService = inject(ExerciseService);

  protected readonly exercises = signal<ExerciseSummaryResponse[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly serverError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.serverError.set(null);

    this.exerciseService.search().subscribe({
      next: (page) => {
        this.exercises.set(page.content);
        this.total.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.serverError.set('No se ha podido cargar el catálogo de ejercicios.');
      },
    });
  }
}
