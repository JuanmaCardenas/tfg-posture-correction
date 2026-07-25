import type { AnalysisTypeCode } from '../exercise/exercise.models';

export interface AnalysisResultRequest {
  exerciseId: number;
  score: number;
}

export interface AnalysisResultResponse {
  id: number;
  exerciseId: number;
  exerciseName: string;
  analysisType: AnalysisTypeCode | null;
  score: number;
  createdAt: string;
}
