import { useCallback, useEffect, useRef } from 'react';

import { getAlertSummary, getProductAlerts } from '../api/alert.api';
import { useAlertStore } from '../store/alert.store';
import type { AlertSummary, ProductAlert } from '../types/alert.types';

interface UseAlertsOptions {
  /** Auto-fetch alerts on mount */
  autoLoad?: boolean;
}

/**
 * Hook para cargar y acceder a alertas de stock y vencimiento.
 */
export function useAlerts({ autoLoad = true }: UseAlertsOptions = {}): { alerts: ProductAlert[]; summary: AlertSummary | null; loading: boolean; loadAlerts: () => Promise<void> } {
  const alerts = useAlertStore((state: { alerts: ProductAlert[] }) => state.alerts);
  const summary = useAlertStore((state: { summary: AlertSummary | null }) => state.summary);
  const loading = useAlertStore((state: { loading: boolean }) => state.loading);
  const setAlerts = useAlertStore((state: { setAlerts: (a: ProductAlert[]) => void }) => state.setAlerts);
  const setSummary = useAlertStore((state: { setSummary: (s: AlertSummary) => void }) => state.setSummary);
  const setLoading = useAlertStore((state: { setLoading: (l: boolean) => void }) => state.setLoading);

  const loadAlerts = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [alertsRes, summaryRes] = await Promise.all([
        getProductAlerts(),
        getAlertSummary(),
      ]);

      if (alertsRes.success) {
        setAlerts(alertsRes.data);
      }
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
    } finally {
      setLoading(false);
    }
  }, [setAlerts, setSummary, setLoading]);

  useEffect(() => {
    if (autoLoad) {
      void loadAlerts();
    }
  }, [autoLoad, loadAlerts]);

  return { alerts, summary, loading, loadAlerts };
}

/**
 * Hook que muestra una notificación inicial cuando hay alertas críticas
 * al cargar la app. Solo se dispara una vez por sesión.
 */
export function useInitialAlertNotification(): boolean {
  const { summary, loading } = useAlerts({ autoLoad: true });
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (loading || notifiedRef.current) return;
    if (!summary) return;

    const hasCritical = summary.stockCritical > 0 || summary.expired > 0;
    if (hasCritical) {
      notifiedRef.current = true;
      // El consumidor puede mostrar un toast o banner usando este flag
    }
  }, [summary, loading]);

  return loading || (!!summary && (summary.stockCritical > 0 || summary.expired > 0));
}
