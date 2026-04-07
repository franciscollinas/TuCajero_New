import { useEffect, useState } from 'react';
import { pingServer } from '../../shared/api/ping.api';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: tokens.colors.background,
        gap: tokens.spacing[4],
      }}
    >
      <h1
        style={{
          color: tokens.colors.primary,
          fontFamily: tokens.typography.fontFamily,
          margin: 0,
        }}
      >
        {es.demo.title}
      </h1>
      <button
        type="button"
        onClick={handlePing}
        disabled={loading}
        style={{
          backgroundColor: tokens.colors.primary,
          color: tokens.colors.white,
          height: tokens.touch.buttonHeight,
          padding: '0 32px',
          borderRadius: tokens.borderRadius.md,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.85 : 1,
          fontSize: tokens.typography.sizes.base,
          fontFamily: tokens.typography.fontFamily,
        }}
      >
        {es.demo.button}
      </button>
      {result && (
        <p
          style={{
            fontFamily: tokens.typography.fontFamily,
            fontSize: tokens.typography.sizes.lg,
            margin: 0,
          }}
        >
          {result}
        </p>
      )}
    </div>
  );
}
