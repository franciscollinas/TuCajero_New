import { create } from 'zustand';

import type { AlertSummary, ProductAlert } from '../types/alert.types';

interface AlertStore {
  alerts: ProductAlert[];
  summary: AlertSummary | null;
  loading: boolean;

  setAlerts: (alerts: ProductAlert[]) => void;
  setSummary: (summary: AlertSummary) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  summary: null,
  loading: false,

  setAlerts: (alerts: ProductAlert[]): void => set({ alerts }),
  setSummary: (summary: AlertSummary): void => set({ summary }),
  setLoading: (loading: boolean): void => set({ loading }),
  clear: (): void => set({ alerts: [], summary: null, loading: false }),
}));
