import type { ApiResponse } from '../types/api.types';
import type { AuthSession, AuthUser } from '../types/auth.types';

export async function login(
  username: string,
  password: string,
): Promise<ApiResponse<AuthSession>> {
  return window.api.invoke<AuthSession>('auth:login', username, password);
}

export async function validateSession(token: string): Promise<ApiResponse<AuthUser>> {
  return window.api.invoke<AuthUser>('auth:validate', token);
}

export async function logout(token: string): Promise<ApiResponse<void>> {
  return window.api.invoke<void>('auth:logout', token);
}

export async function unlockAccount(userId: number, actorUserId: number): Promise<ApiResponse<void>> {
  return window.api.invoke<void>('auth:unlockAccount', userId, actorUserId);
}

export async function getLoginStatus(userId: number): Promise<ApiResponse<{ failedAttempts: number; isLocked: boolean; lockedUntil: string | null }>> {
  return window.api.invoke('auth:getLoginStatus', userId);
}
