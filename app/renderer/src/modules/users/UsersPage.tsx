import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import {
  createUser,
  getAllUserStats,
  getUsers,
  toggleUserActive,
  updateUser,
} from '../../shared/api/users.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { UserRole } from '../../shared/types/auth.types';
import type {
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
  UserStats,
} from '../../shared/types/user.types';

// SVG Icons as components for reusability
function UserIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ClockIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function DollarSignIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7a3.5 3.5 0 0 0 0 7" />
    </svg>
  );
}

function EyeIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.72a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EditIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function PowerIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function PlusIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MailIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function KeyIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function BadgeIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ArrowLeftIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function UsersIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function XIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckCircleIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function EmptyUsersIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ChevronDownIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Helper to get user initials
function getInitials(fullName: string, username: string): string {
  if (fullName.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

// Avatar color based on username hash
const avatarColors = [
  '#465fff',
  '#12b76a',
  '#f79009',
  '#f04438',
  '#7c3aed',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// Role badge configuration
const roleConfig: Record<UserRole, { label: string; bg: string; text: string; dot: string }> = {
  ADMIN: {
    label: 'ADMIN',
    bg: 'var(--brand-50)',
    text: 'var(--brand-600)',
    dot: 'var(--brand-500)',
  },
  SUPERVISOR: {
    label: 'SUPERVISOR',
    bg: 'var(--warning-50)',
    text: 'var(--warning-600)',
    dot: 'var(--warning-500)',
  },
  CASHIER: {
    label: 'CASHIER',
    bg: 'var(--gray-100)',
    text: 'var(--gray-600)',
    dot: 'var(--gray-500)',
  },
};

export function UsersPage(): JSX.Element {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect((): (() => void) | void => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadUsers = async (): Promise<void> => {
      setLoading(true);
      const response = await getUsers(user.id);

      if (cancelled) {
        return;
      }

      if (response.success) {
        setUsers(response.data);
      } else {
        setMessage(response.error.message);
      }

      setLoading(false);
    };

    const loadStats = async (): Promise<void> => {
      const statsResp = await getAllUserStats();
      if (!cancelled && statsResp.success) {
        setUserStats(statsResp.data);
      }
      setStatsLoading(false);
    };

    void loadUsers();
    void loadStats();

    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const pieChartData = useMemo(() => {
    if (userStats.length === 0) return [];
    return userStats
      .filter((s) => s.monthlySales > 0)
      .map((s) => ({
        name: s.fullName,
        value: s.monthlySales,
      }));
  }, [userStats]);

  const totalMonthlySales = useMemo(() => {
    return userStats.reduce((sum, s) => sum + s.monthlySales, 0);
  }, [userStats]);

  const totalHoursWorked = useMemo(() => {
    const totalSeconds = userStats.reduce((sum, s) => sum + s.totalWorkedSeconds, 0);
    return (totalSeconds / 3600).toFixed(1);
  }, [userStats]);

  const pieColors = [
    '#465fff',
    '#12b76a',
    '#f79009',
    '#f04438',
    '#7c3aed',
    '#06b6d4',
    '#84cc16',
    '#ec4899',
    '#14b8a6',
    '#f97316',
  ];

  const handleCreate = async (data: Omit<CreateUserInput, 'actorUserId'>): Promise<void> => {
    if (!user) {
      return;
    }

    const response = await createUser({ ...data, actorUserId: user.id });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setUsers((current) =>
      [...current, response.data].sort((a, b) => a.username.localeCompare(b.username)),
    );
    setMessage(`Usuario ${response.data.username} creado.`);
  };

  const handleUpdate = async (
    userId: number,
    data: Omit<UpdateUserInput, 'actorUserId'>,
  ): Promise<void> => {
    if (!user) {
      return;
    }

    const response = await updateUser(userId, { ...data, actorUserId: user.id });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setUsers((current) => current.map((item) => (item.id === userId ? response.data : item)));
    setEditingUser(null);
    setMessage(`Usuario ${response.data.username} actualizado.`);
  };

  const handleToggle = async (target: UserRecord): Promise<void> => {
    if (!user) {
      return;
    }

    const response = await toggleUserActive(target.id, !target.active, user.id);
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setUsers((current) => current.map((item) => (item.id === target.id ? response.data : item)));
  };

  return (
    <div className="tc-page-standalone animate-fadeIn" style={{ background: 'var(--bg-page)' }}>
      <div className="tc-page-container">
        {/* Page Header */}
        <div
          className="animate-slideDown"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            padding: 'var(--space-5) var(--space-6)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--gradient-primary)',
                  color: '#fff',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <UsersIcon />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--brand-600)',
                    margin: 0,
                  }}
                >
                  {es.users.title}
                </p>
                <h1
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--gray-900)',
                    margin: 'var(--space-1) 0 0 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {es.users.subtitle}
                </h1>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="tc-btn tc-btn--secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            >
              <ArrowLeftIcon />
              {es.dashboard.title}
            </Link>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className="animate-slideUp"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-50)',
              border: '1px solid var(--brand-100)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ flexShrink: 0, color: 'var(--brand-600)' }}>
              <CheckCircleIcon />
            </div>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--brand-700)',
                flex: 1,
                margin: 0,
              }}
            >
              {message}
            </p>
            <button
              type="button"
              onClick={() => setMessage('')}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-1)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--brand-500)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-100)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <XIcon />
            </button>
          </div>
        )}

        {/* Stats Cards and Pie Chart */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}
        >
          {/* Total Hours Worked Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <ClockIcon />
              <span
                style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-600)' }}
              >
                Horas Trabajadas (Mes)
              </span>
            </div>
            <div
              style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--brand-600)' }}
            >
              {totalHoursWorked}h
            </div>
          </div>

          {/* Total Sales Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: 'var(--space-5)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <DollarSignIcon />
              <span
                style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--gray-600)' }}
              >
                Ventas del Mes
              </span>
            </div>
            <div
              style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--success-600)' }}
            >
              ${totalMonthlySales.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Pie Chart Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-light)',
              padding: 'var(--space-4)',
              boxShadow: 'var(--shadow-sm)',
              height: '200px',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--gray-600)',
                marginBottom: 'var(--space-2)',
              }}
            >
              Ventas por Cajero
            </h3>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString('es-CO')}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '85%',
                  color: 'var(--gray-400)',
                }}
              >
                Sin datos suficientes
              </div>
            )}
          </div>
        </div>

        {/* Two-Column Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.5fr) minmax(340px, 1fr)',
            gap: 'var(--space-5)',
            alignItems: 'start',
          }}
        >
          {/* Users Table - Left Column */}
          <article
            className="tc-section animate-slideUp"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Table Header */}
            <div
              style={{
                padding: 'var(--space-5) var(--space-6)',
                borderBottom: '1px solid var(--border-light)',
                background: 'linear-gradient(135deg, var(--gray-25) 0%, var(--bg-card) 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
              }}
            >
              <div
                style={{
                  width: '4px',
                  height: '24px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand-500)',
                }}
              />
              <h2
                style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  margin: 0,
                }}
              >
                {es.users.listTitle}
              </h2>
              <span
                style={{
                  marginLeft: 'var(--space-2)',
                  padding: '2px 10px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  background: 'var(--brand-50)',
                  color: 'var(--brand-600)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {users.length}
              </span>
            </div>

            {/* Table Content */}
            {loading ? (
              <div
                style={{
                  padding: 'var(--space-12) var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid var(--brand-100)',
                    borderTopColor: 'var(--brand-500)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <p
                  style={{
                    marginTop: 'var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-500)',
                  }}
                >
                  {es.common.loading}
                </p>
              </div>
            ) : users.length === 0 ? (
              /* Empty State */
              <div
                style={{
                  padding: 'var(--space-12) var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-2xl)',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                    color: 'var(--gray-400)',
                  }}
                >
                  <EmptyUsersIcon />
                </div>
                <h3
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--gray-900)',
                    margin: '0 0 var(--space-2) 0',
                  }}
                >
                  {es.users.listTitle}
                </h3>
                <p
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--gray-500)',
                    margin: 0,
                    maxWidth: '320px',
                  }}
                >
                  No hay usuarios registrados. Comienza creando tu primer usuario en el formulario.
                </p>
              </div>
            ) : (
              <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th style={{ width: '35%' }}>{es.users.fullName}</th>
                      <th style={{ width: '20%' }}>{es.users.role}</th>
                      <th style={{ width: '15%' }}>{es.users.status}</th>
                      <th style={{ width: '30%', textAlign: 'right' }}>{es.users.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item, index) => (
                      <tr key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <td>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                          >
                            {/* Avatar */}
                            <div
                              style={{
                                flexShrink: 0,
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 700,
                                boxShadow: 'var(--shadow-xs)',
                                backgroundColor: getAvatarColor(item.username),
                              }}
                            >
                              {getInitials(item.fullName, item.username)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: 'var(--text-sm)',
                                  fontWeight: 600,
                                  color: 'var(--gray-900)',
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.fullName || '---'}
                              </p>
                              <p
                                style={{
                                  fontSize: 'var(--text-xs)',
                                  color: 'var(--gray-500)',
                                  margin: '2px 0 0 0',
                                }}
                              >
                                @{item.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const config = roleConfig[item.role as UserRole] ?? roleConfig.CASHIER;
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 10px',
                                  fontSize: 'var(--text-xs)',
                                  fontWeight: 700,
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: config.bg,
                                  color: config.text,
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: config.dot,
                                  }}
                                />
                                {config.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 700,
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: item.active
                                ? 'var(--success-50)'
                                : 'var(--danger-50)',
                              color: item.active ? 'var(--success-600)' : 'var(--danger-600)',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: item.active
                                  ? 'var(--success-500)'
                                  : 'var(--danger-500)',
                              }}
                            />
                            {item.active ? es.users.active : es.users.inactive}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: 'var(--space-2)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingUser(item)}
                              className="tc-btn tc-btn--secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)',
                                padding: '6px 12px',
                                minHeight: '34px',
                                fontSize: 'var(--text-xs)',
                              }}
                              title={es.common.edit}
                            >
                              <EditIcon />
                              {es.common.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleToggle(item)}
                              className="tc-btn tc-btn--secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 'var(--space-1)',
                                padding: '6px 12px',
                                minHeight: '34px',
                                fontSize: 'var(--text-xs)',
                                color: item.active ? 'var(--gray-700)' : 'var(--gray-700)',
                              }}
                              title={item.active ? es.users.deactivate : es.users.activate}
                            >
                              <PowerIcon />
                              {item.active ? es.users.deactivate : es.users.activate}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {/* Form Card - Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <article
              className="tc-section animate-slideUp"
              style={{ padding: 0, overflow: 'hidden', animationDelay: '100ms' }}
            >
              {/* Form Header with Gradient */}
              <div
                style={{
                  padding: 'var(--space-5) var(--space-6)',
                  borderBottom: '1px solid var(--border-light)',
                  background: editingUser
                    ? 'linear-gradient(135deg, var(--warning-25) 0%, var(--warning-50) 100%)'
                    : 'linear-gradient(135deg, var(--brand-25) 0%, var(--brand-50) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div
                    style={{
                      width: '4px',
                      height: '24px',
                      borderRadius: 'var(--radius-full)',
                      background: editingUser ? 'var(--warning-500)' : 'var(--brand-500)',
                    }}
                  />
                  <h2
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      color: 'var(--gray-900)',
                      margin: 0,
                    }}
                  >
                    {editingUser ? es.users.editTitle : es.users.createTitle}
                  </h2>
                </div>
                {editingUser && (
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--gray-500)',
                      margin: '0 0 0 var(--space-3)',
                    }}
                  >
                    Editando:{' '}
                    <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
                      @{editingUser.username}
                    </span>
                  </p>
                )}
              </div>

              <div style={{ padding: 'var(--space-6)' }}>
                <UserForm
                  key={editingUser?.id ?? 'create'}
                  initialUser={editingUser}
                  onCancel={() => setEditingUser(null)}
                  onCreate={handleCreate}
                  onUpdate={handleUpdate}
                />
              </div>
            </article>

            {/* Quick Stats Card */}
            {!loading && users.length > 0 && (
              <article
                className="tc-section animate-slideUp"
                style={{ padding: 'var(--space-5)', animationDelay: '200ms' }}
              >
                <h3
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gray-500)',
                    margin: '0 0 var(--space-4) 0',
                  }}
                >
                  Resumen
                </h3>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}
                >
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--success-50)',
                      border: '1px solid var(--success-100)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 800,
                        color: 'var(--success-600)',
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {users.filter((u) => u.active).length}
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--success-700)',
                        margin: 'var(--space-1) 0 0 0',
                      }}
                    >
                      {es.users.active}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: 'var(--danger-50)',
                      border: '1px solid var(--danger-100)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 800,
                        color: 'var(--danger-600)',
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {users.filter((u) => !u.active).length}
                    </p>
                    <p
                      style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--danger-700)',
                        margin: 'var(--space-1) 0 0 0',
                      }}
                    >
                      {es.users.inactive}
                    </p>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserForm({
  initialUser,
  onCancel,
  onCreate,
  onUpdate,
}: {
  initialUser: UserRecord | null;
  onCancel: () => void;
  onCreate: (data: Omit<CreateUserInput, 'actorUserId'>) => Promise<void>;
  onUpdate: (id: number, data: Omit<UpdateUserInput, 'actorUserId'>) => Promise<void>;
}): JSX.Element {
  const [username, setUsername] = useState(initialUser?.username ?? '');
  const [fullName, setFullName] = useState(initialUser?.fullName ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(initialUser?.role ?? 'CASHIER');
  const [hourlyRate, setHourlyRate] = useState(String(initialUser?.hourlyRate ?? '15000'));

  // Field input styles
  const fieldContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  };
  const inputWrapperStyle: React.CSSProperties = { position: 'relative' as const };
  const inputIconStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: '50%',
    left: 'var(--space-3)',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    color: 'var(--gray-400)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    paddingLeft: '40px',
    paddingRight: 'var(--space-3)',
    minHeight: '44px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-medium)',
    fontSize: 'var(--text-sm)',
    color: 'var(--gray-800)',
    backgroundColor: '#fff',
    fontFamily: 'var(--font-family)',
    transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
    boxSizing: 'border-box' as const,
  };
  const selectWrapperStyle: React.CSSProperties = { position: 'relative' as const };
  const selectIconRightStyle: React.CSSProperties = {
    position: 'absolute' as const,
    top: '50%',
    right: 'var(--space-3)',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    color: 'var(--gray-400)',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
    e.target.style.borderColor = 'var(--brand-500)';
    e.target.style.boxShadow = '0 0 0 3px var(--brand-100)';
    e.target.style.outline = 'none';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
    e.target.style.borderColor = 'var(--border-medium)';
    e.target.style.boxShadow = 'none';
  };

  const handleSubmit = async () => {
    console.log('Guardando usuario...', {
      initialUser,
      fullName,
      role,
      hourlyRate: parseFloat(hourlyRate),
    });
    if (initialUser) {
      try {
        await onUpdate(initialUser.id, {
          fullName,
          role,
          password: password || undefined,
          hourlyRate: parseFloat(hourlyRate) || 15000,
        });
        console.log('Usuario actualizado');
      } catch (err) {
        console.error('Error al actualizar:', err);
      }
    } else {
      try {
        await onCreate({
          username,
          fullName,
          password,
          role,
          hourlyRate: parseFloat(hourlyRate) || 15000,
        });
        console.log('Usuario creado');
      } catch (err) {
        console.error('Error al crear:', err);
      }
    }
  };

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      {!initialUser && (
        <div style={fieldContainerStyle}>
          <label className="tc-label">{es.auth.username}</label>
          <div style={inputWrapperStyle}>
            <div style={inputIconStyle}>
              <MailIcon />
            </div>
            <input
              className="tc-input"
              style={inputStyle}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={es.auth.username}
              onFocus={handleFocus}
              onBlur={handleBlur}
              required
            />
          </div>
        </div>
      )}
      <div style={fieldContainerStyle}>
        <label className="tc-label">{es.users.fullName}</label>
        <div style={inputWrapperStyle}>
          <div style={inputIconStyle}>
            <UserIcon />
          </div>
          <input
            className="tc-input"
            style={inputStyle}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={es.users.fullName}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
          />
        </div>
      </div>
      <div style={fieldContainerStyle}>
        <label className="tc-label">
          {es.auth.password}
          {initialUser && (
            <span
              style={{
                marginLeft: 'var(--space-1)',
                fontSize: 'var(--text-xs)',
                fontWeight: 400,
                color: 'var(--gray-400)',
              }}
            >
              (opcional)
            </span>
          )}
        </label>
        <div style={inputWrapperStyle}>
          <div style={inputIconStyle}>
            <KeyIcon />
          </div>
          <input
            className="tc-input"
            style={{ ...inputStyle, paddingRight: '36px' }}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={
              initialUser ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : es.auth.password
            }
            type={showPassword ? 'text' : 'password'}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              top: '50%',
              right: 'var(--space-3)',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gray-400)',
              padding: '2px',
            }}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      <div style={fieldContainerStyle}>
        <label className="tc-label">{es.users.role}</label>
        <div style={selectWrapperStyle}>
          <div style={inputIconStyle}>
            <BadgeIcon />
          </div>
          <select
            className="tc-select"
            style={{ ...inputStyle, paddingRight: '32px', appearance: 'none' as const }}
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            onFocus={handleFocus}
            onBlur={handleBlur}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="CASHIER">CASHIER</option>
          </select>
          <div style={selectIconRightStyle}>
            <ChevronDownIcon />
          </div>
        </div>
      </div>
      <div style={fieldContainerStyle}>
        <label className="tc-label">Tarifa por Hora ($)</label>
        <div style={inputWrapperStyle}>
          <div style={inputIconStyle}>
            <DollarSignIcon />
          </div>
          <input
            className="tc-input"
            style={inputStyle}
            type="number"
            value={hourlyRate}
            onChange={(event) => setHourlyRate(event.target.value)}
            placeholder="15000"
            onFocus={handleFocus}
            onBlur={handleBlur}
            min="0"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--gray-100)',
          marginTop: 'var(--space-2)',
        }}
      >
        <button
          type="submit"
          className="tc-btn tc-btn--primary"
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            background: 'var(--gradient-primary)',
            border: 'none',
          }}
        >
          {initialUser ? (
            <>
              <CheckCircleIcon />
              {es.common.save}
            </>
          ) : (
            <>
              <PlusIcon />
              {es.users.createAction}
            </>
          )}
        </button>
        {initialUser && (
          <button
            type="button"
            onClick={onCancel}
            className="tc-btn tc-btn--secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
          >
            <XIcon />
            {es.common.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
