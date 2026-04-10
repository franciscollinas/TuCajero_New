import type { ApiResponse } from '../types/api.types';
import type { CreateUserInput, UpdateUserInput, UserRecord, UserStats } from '../types/user.types';

export function getUsers(actorUserId: number): Promise<ApiResponse<UserRecord[]>> {
  return window.api.invoke<UserRecord[]>('users:list', actorUserId);
}

export function createUser(data: CreateUserInput): Promise<ApiResponse<UserRecord>> {
  return window.api.invoke<UserRecord>('users:create', data);
}

export function updateUser(id: number, data: UpdateUserInput): Promise<ApiResponse<UserRecord>> {
  return window.api.invoke<UserRecord>('users:update', id, data);
}

export function toggleUserActive(
  id: number,
  active: boolean,
  actorUserId: number,
): Promise<ApiResponse<UserRecord>> {
  return window.api.invoke<UserRecord>('users:toggleActive', id, active, actorUserId);
}

export function getUserStats(userId: number): Promise<ApiResponse<UserStats>> {
  return window.api.invoke<UserStats>('users:getStats', userId);
}

export function getAllUserStats(): Promise<ApiResponse<UserStats[]>> {
  return window.api.invoke<UserStats[]>('users:getAllStats');
}
