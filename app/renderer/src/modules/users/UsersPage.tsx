import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { createUser, getUsers, toggleUserActive, updateUser } from '../../shared/api/users.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
import type { UserRole } from '../../shared/types/auth.types';
import type { CreateUserInput, UpdateUserInput, UserRecord } from '../../shared/types/user.types';

export function UsersPage(): JSX.Element {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

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

    void loadUsers();

    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const handleCreate = async (data: Omit<CreateUserInput, 'actorUserId'>): Promise<void> => {
    if (!user) {
      return;
    }

    const response = await createUser({ ...data, actorUserId: user.id });
    if (!response.success) {
      setMessage(response.error.message);
      return;
    }

    setUsers((current) => [...current, response.data].sort((a, b) => a.username.localeCompare(b.username)));
    setMessage(`Usuario ${response.data.username} creado.`);
  };

  const handleUpdate = async (userId: number, data: Omit<UpdateUserInput, 'actorUserId'>): Promise<void> => {
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
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.users.title}</p>
            <h1 style={titleStyle}>{es.users.title}</h1>
            <p style={subtleStyle}>{es.users.subtitle}</p>
          </div>
          <Link to="/dashboard" style={secondaryLinkStyle}>
            {es.dashboard.title}
          </Link>
        </header>

        {message && <div style={noticeStyle}>{message}</div>}

        <section style={layoutStyle}>
          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>{es.users.listTitle}</h2>
            {loading ? (
              <p style={subtleStyle}>{es.common.loading}</p>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{es.auth.username}</th>
                      <th style={thStyle}>{es.users.fullName}</th>
                      <th style={thStyle}>{es.users.role}</th>
                      <th style={thStyle}>{es.users.status}</th>
                      <th style={thStyle}>{es.users.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td style={tdStyle}>{item.username}</td>
                        <td style={tdStyle}>{item.fullName}</td>
                        <td style={tdStyle}>{item.role}</td>
                        <td style={tdStyle}>{item.active ? es.users.active : es.users.inactive}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setEditingUser(item)} style={actionButtonStyle}>
                              {es.common.edit}
                            </button>
                            <button type="button" onClick={() => void handleToggle(item)} style={actionButtonStyle}>
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

          <article style={panelStyle}>
            <h2 style={sectionTitleStyle}>{editingUser ? es.users.editTitle : es.users.createTitle}</h2>
            <UserForm
              key={editingUser?.id ?? 'create'}
              initialUser={editingUser}
              onCancel={() => setEditingUser(null)}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          </article>
        </section>
      </section>
    </main>
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
  const [role, setRole] = useState<UserRole>(initialUser?.role ?? 'CASHIER');

  return (
    <form
      style={formStyle}
      onSubmit={(event) => {
        event.preventDefault();
        if (initialUser) {
          void onUpdate(initialUser.id, {
            fullName,
            role,
            password: password || undefined,
          });
        } else {
          void onCreate({
            username,
            fullName,
            password,
            role,
          });
        }
      }}
    >
      {!initialUser && (
        <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={es.auth.username} style={inputStyle} />
      )}
      <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={es.users.fullName} style={inputStyle} />
      <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={es.auth.password} type="password" style={inputStyle} />
      <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} style={inputStyle}>
        <option value="ADMIN">ADMIN</option>
        <option value="SUPERVISOR">SUPERVISOR</option>
        <option value="CASHIER">CASHIER</option>
      </select>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button type="submit" style={primaryButtonStyle}>
          {initialUser ? es.common.save : es.users.createAction}
        </button>
        {initialUser && (
          <button type="button" onClick={onCancel} style={secondaryButtonStyle}>
            {es.common.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

const pageStyle: CSSProperties = { minHeight: '100vh', padding: tokens.spacing[6], background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 52%, #E5E7EB 100%)' };
const shellStyle: CSSProperties = { maxWidth: 1400, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' };
const layoutStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.8fr)', gap: tokens.spacing[5], alignItems: 'start' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '22px', color: '#111827' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' };
const actionButtonStyle: CSSProperties = { minHeight: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', cursor: 'pointer' };
const formStyle: CSSProperties = { display: 'grid', gap: '12px' };
const inputStyle: CSSProperties = { width: '100%', minHeight: '48px', boxSizing: 'border-box', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', padding: '0 14px', fontSize: '16px' };
const primaryButtonStyle: CSSProperties = { minHeight: '48px', padding: '0 18px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '48px', padding: '0 18px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };
