export interface ReviewResponse {
  id: number;
  username: string;
  score: number;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreCount {
  score: number;
  count: number;
}

export interface ReviewSummaryResponse {
  averageRating: number;
  ratingCount: number;
  distribution: ScoreCount[];
  myReview: ReviewResponse | null;
}

export interface ReviewRequest {
  score: number;
  content: string | null;
}
