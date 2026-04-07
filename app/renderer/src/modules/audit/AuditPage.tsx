import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { getRecentAuditLogs } from '../../shared/api/audit.api';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { AuditLogEntry } from '../../shared/types/audit.types';

export function AuditPage(): JSX.Element {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect((): (() => void) => {
    let cancelled = false;

    const loadLogs = async (): Promise<void> => {
      setLoading(true);
      const response = await getRecentAuditLogs(150);

      if (cancelled) {
        return;
      }

      if (response.success) {
        setLogs(response.data);
      } else {
        setMessage(response.error.message);
      }

      setLoading(false);
    };

    void loadLogs();

    return (): void => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.audit.title}</p>
            <h1 style={titleStyle}>{es.audit.title}</h1>
            <p style={subtleStyle}>{es.audit.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        {message && <div style={noticeStyle}>{message}</div>}

        <section style={panelStyle}>
          {loading ? (
            <p style={subtleStyle}>{es.common.loading}</p>
          ) : logs.length === 0 ? (
            <p style={subtleStyle}>{es.audit.empty}</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{es.audit.date}</th>
                    <th style={thStyle}>{es.audit.user}</th>
                    <th style={thStyle}>{es.audit.action}</th>
                    <th style={thStyle}>{es.audit.entity}</th>
                    <th style={thStyle}>{es.audit.payload}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={tdStyle}>{new Date(log.createdAt).toLocaleString('es-CO')}</td>
                      <td style={tdStyle}>
                        <strong>{log.user.fullName}</strong>
                        <div style={cellSubtleStyle}>
                          {log.user.username} · {log.user.role}
                        </div>
                      </td>
                      <td style={tdStyle}>{log.action}</td>
                      <td style={tdStyle}>
                        {log.entity}
                        {log.entityId ? ` #${log.entityId}` : ''}
                      </td>
                      <td style={payloadCellStyle}>{log.payload}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  padding: tokens.spacing[6],
  background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 1360, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' };
const cellSubtleStyle: CSSProperties = { color: '#6B7280', fontSize: '13px', marginTop: '4px' };
const payloadCellStyle: CSSProperties = { ...tdStyle, fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 480 };
