export type UserRole = 'ADMIN' | 'CASHIER' | 'SUPERVISOR';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  fullName: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
