import { useEffect, useState } from 'react';

import { pingServer } from '../../shared/api/ping.api';
import { es } from '../../shared/i18n';

function formatMessage(template: string, value: string): string {
  return template.replace('{result}', value).replace('{message}', value);
}

export function DemoPage(): JSX.Element {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const runPing = async (): Promise<void> => {
    setLoading(true);
    setResult(es.demo.loading);

    try {
      const response = await pingServer();

      if (response.success) {
        setResult(formatMessage(es.demo.success, response.data));
      } else {
        setResult(formatMessage(es.demo.error, response.error.message));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : es.errors.unknown;
      setResult(formatMessage(es.demo.error, message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runPing();
  }, []);

  const handlePing = async (): Promise<void> => {
    await runPing();
  };

  return (
    <div className="tc-section" style={{ maxWidth: 480, margin: 'var(--space-8) auto', textAlign: 'center' }}>
      <h1 className="tc-section-title" style={{ marginBottom: 'var(--space-4)', color: 'var(--brand-600)' }}>
        {es.demo.title}
      </h1>
      <button
        type="button"
        onClick={handlePing}
        disabled={loading}
        className="tc-btn tc-btn--primary"
      >
        {es.demo.button}
      </button>
      {result && (
        <p className="tc-metric-sub" style={{ fontSize: 'var(--text-base)', marginTop: 'var(--space-3)' }}>
          {result}
        </p>
      )}
    </div>
  );
}
