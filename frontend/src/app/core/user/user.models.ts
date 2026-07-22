export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
