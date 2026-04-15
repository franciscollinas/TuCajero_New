export interface CashRegister {
  id: number;
  userId: number;
  initialCash: number;
  finalCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  status: string;
}

export interface CashCloseSummary {
  finalCash: number;
  expectedCash: number;
  difference: number;
}

export interface CashClosureUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export interface CashClosureRow {
  id: number;
  initialCash: number;
  finalCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string;
  status: string;
  user: CashClosureUser;
}
