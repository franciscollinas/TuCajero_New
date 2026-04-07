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
