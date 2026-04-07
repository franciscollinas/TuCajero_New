import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { createUser, getUsers, toggleUserActive, updateUser } from '../../shared/api/users.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
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
    <div className="tc-page-container">
      <section className="tc-section">
        <div className="tc-section-header">
          <div>
            <h2 className="tc-section-title">{es.users.title}</h2>
            <p className="tc-section-subtitle">{es.users.subtitle}</p>
          </div>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>

        {message && <div className="tc-notice tc-notice--info">{message}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.8fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
          <article className="tc-section">
            <header className="tc-section-header">
              <div>
                <h3 className="tc-section-title">{es.users.listTitle}</h3>
              </div>
            </header>
            {loading ? (
              <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
            ) : (
              <div className="tc-table-wrap">
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th>{es.auth.username}</th>
                      <th>{es.users.fullName}</th>
                      <th>{es.users.role}</th>
                      <th>{es.users.status}</th>
                      <th>{es.users.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id}>
                        <td>{item.username}</td>
                        <td>{item.fullName}</td>
                        <td>{item.role}</td>
                        <td>{item.active ? es.users.active : es.users.inactive}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setEditingUser(item)} className="tc-btn tc-btn--secondary">
                              {es.common.edit}
                            </button>
                            <button type="button" onClick={() => void handleToggle(item)} className="tc-btn tc-btn--secondary">
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

          <article className="tc-section">
            <header className="tc-section-header">
              <h3 className="tc-section-title">{editingUser ? es.users.editTitle : es.users.createTitle}</h3>
            </header>
            <UserForm
              key={editingUser?.id ?? 'create'}
              initialUser={editingUser}
              onCancel={() => setEditingUser(null)}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          </article>
        </div>
      </section>
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
  const [role, setRole] = useState<UserRole>(initialUser?.role ?? 'CASHIER');

  return (
    <form
      className="tc-grid-form"
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
        <div className="tc-field">
          <label className="tc-label">{es.auth.username}</label>
          <input className="tc-input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={es.auth.username} />
        </div>
      )}
      <div className="tc-field">
        <label className="tc-label">{es.users.fullName}</label>
        <input className="tc-input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={es.users.fullName} />
      </div>
      <div className="tc-field">
        <label className="tc-label">{es.auth.password}</label>
        <input className="tc-input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={es.auth.password} type="password" />
      </div>
      <div className="tc-field">
        <label className="tc-label">{es.users.role}</label>
        <select className="tc-select" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
          <option value="CASHIER">CASHIER</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
        <button type="submit" className="tc-btn tc-btn--primary">
          {initialUser ? es.common.save : es.users.createAction}
        </button>
        {initialUser && (
          <button type="button" onClick={onCancel} className="tc-btn tc-btn--secondary">
            {es.common.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
