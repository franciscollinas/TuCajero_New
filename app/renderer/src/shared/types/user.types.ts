import type { UserRole } from './auth.types';

export interface UserRecord {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  actorUserId: number;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  password?: string;
  active?: boolean;
  actorUserId: number;
}
