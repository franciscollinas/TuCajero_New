export interface Customer {
  id: number;
  document: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  debts?: Debt[];
}

export interface Debt {
  id: number;
  customerId: number;
  saleId: number | null;
  amount: number;
  balance: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  method: string;
  createdAt: string;
}
