export type MuscleGroupCode =
  'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'GLUTES' | 'ABS' | 'OBLIQUES';

export type DifficultyCode = 'EASY' | 'MEDIUM' | 'HARD';

export type AnalysisTypeCode = 'SQUAT' | 'LUNGE' | 'PLANK' | 'PUSH_UP';

export interface Label<T extends string = string> {
  code: T;
  label: string;
}

export interface ExerciseSummaryResponse {
  id: number;
  name: string;
  muscleGroups: Label<MuscleGroupCode>[];
  difficulty: Label<DifficultyCode>;
  thumbnailUrl: string;
  averageRating: number;
  ratingCount: number;
  favorite: boolean;
  analyzable: boolean;
}

export interface ExerciseDetailResponse extends ExerciseSummaryResponse {
  description: string;
  youtubeVideoId: string;
  tips: string[];
  analysisType: AnalysisTypeCode | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ExerciseQuery {
  search?: string;
  groups?: MuscleGroupCode[];
  difficulty?: DifficultyCode | null;
  page?: number;
  size?: number;
}

export interface ExerciseFiltersResponse {
  muscleGroups: Label<MuscleGroupCode>[];
  difficulties: Label<DifficultyCode>[];
}

export interface ExerciseFilters {
  search: string;
  groups: MuscleGroupCode[];
  difficulty: DifficultyCode | null;
}

export const EMPTY_FILTERS: ExerciseFilters = {
  search: '',
  groups: [],
  difficulty: null,
};
