import type { UserRole } from './auth.types';

export interface UserStats {
  id: number;
  username: string;
  fullName: string;
  totalWorkedSeconds: number;
  monthlySales: number;
}

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  hourlyRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  hourlyRate?: number;
  actorUserId: number;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  password?: string;
  active?: boolean;
  hourlyRate?: number;
  actorUserId: number;
}
