import type { UserRole } from './auth.types';

export type PayrollPeriod = 'daily' | 'weekly' | 'monthly';

export interface PayrollDayEntry {
  date: string;       // YYYY-MM-DD
  dayName: string;    // e.g. "Lunes"
  loginCount: number;
  workedSeconds: number;
  workedHours: number;
  hourlyRate: number;
  payAmount: number;
  dailySalesTotal: number;  // Total sales amount for this day
}

export interface PayrollUserSummary {
  userId: number;
  fullName: string;
  username: string;
  hourlyRate: number;
  period: PayrollPeriod;
  periodStart: string;  // YYYY-MM-DD
  periodEnd: string;    // YYYY-MM-DD
  days: PayrollDayEntry[];
  totalDays: number;
  totalWorkedSeconds: number;
  totalWorkedHours: number;
  totalPayAmount: number;
  totalSalesAmount: number;  // Total sales for the period
}

export interface PayrollAllUsersResult {
  users: PayrollUserSummary[];
  grandTotalPay: number;
  grandTotalHours: number;
  grandTotalSales: number;
  generatedAt: string;
}

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
