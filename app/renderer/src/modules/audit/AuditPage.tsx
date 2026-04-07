import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getRecentAuditLogs } from '../../shared/api/audit.api';
import { es } from '../../shared/i18n';
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
    <div className="tc-section">
      <header className="tc-section-header">
        <div>
          <p className="tc-section-title">{es.audit.title}</p>
          <p className="tc-section-subtitle">{es.audit.subtitle}</p>
        </div>
        <div>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>
      </header>

      {message && <div className="tc-notice tc-notice--info">{message}</div>}

      {loading ? (
        <p className="tc-section-subtitle">{es.common.loading}</p>
      ) : logs.length === 0 ? (
        <p className="tc-section-subtitle">{es.audit.empty}</p>
      ) : (
        <div className="tc-table-wrap">
          <table className="tc-table">
            <thead>
              <tr>
                <th>{es.audit.date}</th>
                <th>{es.audit.user}</th>
                <th>{es.audit.action}</th>
                <th>{es.audit.entity}</th>
                <th>{es.audit.payload}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString('es-CO')}</td>
                  <td>
                    <strong>{log.user.fullName}</strong>
                    <div style={{ color: 'var(--gray-500)', fontSize: 'var(--text-xs)', marginTop: '4px' }}>
                      {log.user.username} · {log.user.role}
                    </div>
                  </td>
                  <td>{log.action}</td>
                  <td>
                    {log.entity}
                    {log.entityId ? ` #${log.entityId}` : ''}
                  </td>
                  <td style={{ fontFamily: 'Consolas, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 480 }}>{log.payload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
