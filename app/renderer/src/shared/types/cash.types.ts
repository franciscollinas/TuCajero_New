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
