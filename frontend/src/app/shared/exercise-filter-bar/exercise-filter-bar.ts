import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  DifficultyCode,
  EMPTY_FILTERS,
  ExerciseFilters,
  ExerciseFiltersResponse,
  MuscleGroupCode,
} from '../../core/exercise/exercise.models';

@Component({
  selector: 'app-exercise-filter-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './exercise-filter-bar.html',
  styleUrl: './exercise-filter-bar.scss',
})
export class ExerciseFilterBar implements OnInit {
  private readonly host = inject(ElementRef);

  /** Valores admitidos, servidos por el backend. */
  readonly options = input.required<ExerciseFiltersResponse>();

  /** Número de resultados de la última búsqueda (null mientras carga). */
  readonly resultCount = input<number | null>(null);

  readonly filtersChange = output<ExerciseFilters>();

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly selectedGroups = signal<MuscleGroupCode[]>([]);
  protected readonly selectedDifficulty = signal<DifficultyCode | null>(null);
  protected readonly dropdownOpen = signal(false);
  readonly initialFilters = input<ExerciseFilters>(EMPTY_FILTERS);

  ngOnInit(): void {
    const initial = this.initialFilters();
    // emitEvent: false evita disparar una búsqueda al restaurar el estado.
    this.searchControl.setValue(initial.search, { emitEvent: false });
    this.selectedGroups.set(initial.groups);
    this.selectedDifficulty.set(initial.difficulty);
  }

  /** Texto del botón del desplegable: "Grupo", el nombre, o "N grupos". */
  protected readonly groupsLabel = computed(() => {
    const selected = this.selectedGroups();
    if (selected.length === 0) return 'Grupo';
    if (selected.length === 1) {
      return this.options().muscleGroups.find((g) => g.code === selected[0])?.label ?? 'Grupo';
    }
    return `${selected.length} grupos`;
  });

  /** Grupos seleccionados, con su etiqueta, para los distintivos de resumen. */
  protected readonly selectedGroupOptions = computed(() =>
    this.options().muscleGroups.filter((g) => this.selectedGroups().includes(g.code)),
  );

  protected readonly hasActiveFilters = computed(
    () =>
      this.searchControl.value.trim() !== '' ||
      this.selectedGroups().length > 0 ||
      this.selectedDifficulty() !== null,
  );

  constructor() {
    // El texto se emite con retardo para no lanzar una petición por tecla pulsada.
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.emit());
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  isGroupSelected(code: MuscleGroupCode): boolean {
    return this.selectedGroups().includes(code);
  }

  toggleGroup(code: MuscleGroupCode): void {
    this.selectedGroups.update((groups) =>
      groups.includes(code) ? groups.filter((g) => g !== code) : [...groups, code],
    );
    this.emit();
  }

  /** Selección única: volver a pulsar la dificultad activa la desactiva. */
  toggleDifficulty(code: DifficultyCode): void {
    this.selectedDifficulty.update((current) => (current === code ? null : code));
    this.emit();
  }

  clearAll(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.selectedGroups.set([]);
    this.selectedDifficulty.set(null);
    this.dropdownOpen.set(false);
    this.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  private emit(): void {
    this.filtersChange.emit({
      search: this.searchControl.value.trim(),
      groups: this.selectedGroups(),
      difficulty: this.selectedDifficulty(),
    });
  }
}
