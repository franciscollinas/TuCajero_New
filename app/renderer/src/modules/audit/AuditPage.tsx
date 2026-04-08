import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getRecentAuditLogs } from '../../shared/api/audit.api';
import { es } from '../../shared/i18n';
import type { AuditLogEntry } from '../../shared/types/audit.types';

/* ── inline SVG icons ── */
const ShieldIcon = (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const ShieldCheckIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

const ArrowLeftIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
  </svg>
);

const ClockIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

const UsersIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const ActivityIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const LayersIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);

/* ── color-coded action badge ── */
function getActionBadge(action: string): { bg: string; text: string; border: string; label: string } {
  const a = action.toLowerCase();
  if (a.includes('create') || a.includes('login') || a.includes('open')) {
    return { bg: 'var(--success-25)', text: 'var(--success-700)', border: 'var(--success-200)', label: es.audit.action };
  }
  if (a.includes('delete') || a.includes('close') || a.includes('void')) {
    return { bg: 'var(--danger-50)', text: 'var(--danger-700)', border: 'var(--danger-200)', label: es.audit.action };
  }
  if (a.includes('update') || a.includes('edit') || a.includes('modify')) {
    return { bg: 'var(--warning-50)', text: 'var(--warning-700)', border: 'var(--warning-200)', label: es.audit.action };
  }
  return { bg: 'var(--brand-25)', text: 'var(--brand-700)', border: 'var(--brand-200)', label: es.audit.action };
}

/* ── entity badge ── */
function getEntityBadge(entity: string): { bg: string; text: string } {
  const e = entity.toLowerCase();
  if (e.includes('sale') || e.includes('payment')) return { bg: 'var(--success-500)', text: '#fff' };
  if (e.includes('user') || e.includes('role')) return { bg: 'var(--brand-500)', text: '#fff' };
  if (e.includes('product') || e.includes('inventory')) return { bg: 'var(--warning-500)', text: '#fff' };
  if (e.includes('cash') || e.includes('register')) return { bg: 'var(--gray-700)', text: '#fff' };
  return { bg: 'var(--gray-500)', text: '#fff' };
}

/* ── avatar with initials ── */
function Avatar({ name, role }: { name: string; role: string }): JSX.Element {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarColors: Record<string, string> = {
    admin: 'var(--brand-500)',
    cashier: 'var(--success-500)',
    manager: 'var(--warning-500)',
  };

  const bgColor = avatarColors[role?.toLowerCase()] || 'var(--gray-500)';

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-full)',
        background: bgColor,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '0.04em',
      }}
    >
      {initials}
    </div>
  );
}

/* ── format relative time ── */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── metric card ── */
function MetricCard({
  icon,
  label,
  value,
  sub,
  gradient,
  iconGradient,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  iconGradient: string;
  delay: string;
}): JSX.Element {
  return (
    <article
      className="animate-slideUp"
      style={{
        background: gradient,
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        padding: 'var(--space-5)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-4)',
        boxShadow: 'var(--shadow-xs)',
        transition: 'box-shadow var(--transition-normal), transform var(--transition-normal)',
        animationDelay: delay,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-lg)',
          background: iconGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-1)' }}>
          {label}
        </p>
        <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--gray-900)', lineHeight: 1.2 }}>{value}</p>
        {sub && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 'var(--space-1)' }}>{sub}</p>
        )}
      </div>
    </article>
  );
}

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

  /* ── computed stats ── */
  const stats = useMemo(() => {
    if (logs.length === 0) return null;

    const uniqueUsers = new Set(logs.map((l) => l.userId)).size;
    const uniqueEntities = new Set(logs.map((l) => l.entity)).size;
    const actions = logs.map((l) => l.action.toLowerCase());
    const creates = actions.filter((a) => a.includes('create') || a.includes('login') || a.includes('open')).length;
    const updates = actions.filter((a) => a.includes('update') || a.includes('edit') || a.includes('modify')).length;
    const deletes = actions.filter((a) => a.includes('delete') || a.includes('close') || a.includes('void')).length;

    let latestDate: Date | null = null;
    for (const log of logs) {
      const d = new Date(log.createdAt);
      if (!latestDate || d > latestDate) latestDate = d;
    }

    return {
      total: logs.length,
      uniqueUsers,
      uniqueEntities,
      creates,
      updates,
      deletes,
      latestDate,
    };
  }, [logs]);

  return (
    <div className="animate-fadeIn" style={{ minHeight: '100%' }}>
      {/* ═══════════ Page Header ═══════════ */}
      <div
        className="animate-slideUp"
        style={{
          background: 'var(--gradient-header)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          marginBottom: 'var(--space-6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative background element */}
        <div
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            width: 180,
            height: 180,
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 40,
            bottom: -50,
            width: 120,
            height: 120,
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginBottom: 'var(--space-2)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {ShieldCheckIcon}
            Audit Trail
          </p>
          <h1
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              lineHeight: 1.2,
              marginBottom: 'var(--space-2)',
            }}
          >
            {es.audit.title}
          </h1>
          <p
            style={{
              fontSize: 'var(--text-base)',
              color: 'rgba(255,255,255,0.85)',
              margin: 0,
              maxWidth: 600,
            }}
          >
            {es.audit.subtitle}
          </p>
        </div>
      </div>

      {/* ═══════════ Metric Cards ═══════════ */}
      {stats && !loading && (
        <div
          className="animate-slideUp"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            animationDelay: '0.1s',
          }}
        >
          <MetricCard
            icon={ActivityIcon}
            label="Total Logs"
            value={stats.total}
            sub={stats.latestDate ? `Latest: ${formatRelativeTime(stats.latestDate)}` : undefined}
            gradient="var(--gradient-card-brand)"
            iconGradient="var(--gradient-primary)"
            delay="0.15s"
          />
          <MetricCard
            icon={UsersIcon}
            label="Active Users"
            value={stats.uniqueUsers}
            sub="Unique users"
            gradient="var(--gradient-card-success)"
            iconGradient="var(--gradient-success)"
            delay="0.2s"
          />
          <MetricCard
            icon={LayersIcon}
            label="Entities"
            value={stats.uniqueEntities}
            sub="Tracked entities"
            gradient="var(--gradient-card-warning)"
            iconGradient="var(--gradient-warning)"
            delay="0.25s"
          />
          <MetricCard
            icon={ClockIcon}
            label="Actions"
            value={`${stats.creates} / ${stats.updates} / ${stats.deletes}`}
            sub="Create / Update / Delete"
            gradient="var(--gradient-card-danger)"
            iconGradient="var(--gradient-danger)"
            delay="0.3s"
          />
        </div>
      )}

      {/* ═══════════ Main Card ═══════════ */}
      <div
        className="animate-slideUp"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          animationDelay: '0.2s',
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>
              Audit Log Entries
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', margin: 0, marginTop: 'var(--space-1)' }}>
              {loading ? 'Loading records...' : `${logs.length} records found`}
            </p>
          </div>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--gray-700)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-xs)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-medium)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
            }}
          >
            {ArrowLeftIcon}
            {es.dashboard.title}
          </Link>
        </div>

        {/* Card Body */}
        <div style={{ padding: 'var(--space-6)' }}>
          {message && (
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--warning-50)',
                border: '1px solid var(--warning-200)',
                color: 'var(--warning-700)',
                fontSize: 'var(--text-sm)',
                marginBottom: 'var(--space-5)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              {message}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: '3px solid var(--brand-100)',
                  borderTopColor: 'var(--brand-500)',
                  borderRadius: 'var(--radius-full)',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto var(--space-4)',
                }}
              />
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>{es.common.loading}</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : logs.length === 0 ? (
            /* ── Empty State ── */
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-12) var(--space-6)',
                color: 'var(--gray-400)',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand-25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-5)',
                  color: 'var(--brand-500)',
                }}
              >
                {ShieldIcon}
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--gray-700)', margin: '0 0 var(--space-2)' }}>
                No audit logs found
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', maxWidth: 360, margin: '0 auto' }}>
                {es.audit.empty}
              </p>
            </div>
          ) : (
            /* ── Enhanced Table ── */
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 'var(--text-sm)',
                }}
              >
                <thead>
                  <tr>
                    {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          textAlign: 'left',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          color: 'var(--gray-500)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          borderBottom: '2px solid var(--border-light)',
                          whiteSpace: 'nowrap',
                          background: 'var(--gray-25)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionBadge = getActionBadge(log.action);
                    const entityStyle = getEntityBadge(log.entity);
                    const logDate = new Date(log.createdAt);

                    return (
                      <tr
                        key={log.id}
                        style={{
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--brand-25)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        {/* Timestamp */}
                        <td style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: 'var(--text-sm)' }}>
                            {logDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: '2px' }}>
                            {logDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: '2px' }}>
                            {formatRelativeTime(logDate)}
                          </div>
                        </td>

                        {/* User */}
                        <td style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <Avatar name={log.user.fullName} role={log.user.role} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{log.user.fullName}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                                {log.user.username} &middot; {log.user.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action badge */}
                        <td style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              background: actionBadge.bg,
                              color: actionBadge.text,
                              border: `1px solid ${actionBadge.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* Entity */}
                        <td style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 'var(--space-1)',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              background: entityStyle.bg,
                              color: entityStyle.text,
                            }}
                          >
                            {log.entity}
                            {log.entityId ? ` #${log.entityId}` : ''}
                          </span>
                        </td>

                        {/* Payload */}
                        <td style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--gray-100)' }}>
                          <div
                            style={{
                              fontFamily: 'Consolas, "Courier New", monospace',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--gray-600)',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxWidth: 400,
                              background: 'var(--gray-25)',
                              padding: 'var(--space-2) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--gray-100)',
                              maxHeight: 80,
                              overflow: 'hidden',
                            }}
                          >
                            {log.payload}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
