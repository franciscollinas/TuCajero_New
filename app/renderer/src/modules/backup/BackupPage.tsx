import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { createBackup, deleteBackup, getBackupInfo, listBackups, restoreBackup } from '../../shared/api/backup.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import type { BackupMetadata, BackupSummaryInfo } from '../../shared/types/backup.types';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CO');
}

export function BackupPage(): JSX.Element {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [actionInProgress, setActionInProgress] = useState<string>('');
  const [description, setDescription] = useState('');
  const [dbInfo, setDbInfo] = useState<BackupSummaryInfo | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    const [backupsRes, infoRes] = await Promise.all([
      listBackups(user.id),
      getBackupInfo(user.id),
    ]);

    if (backupsRes.success) {
      setBackups(backupsRes.data.backups);
    } else {
      setMessage(backupsRes.error.message);
      setMessageType('error');
    }

    if (infoRes.success) {
      setDbInfo(infoRes.data);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateBackup = async (): Promise<void> => {
    if (!user) return;

    setActionInProgress('create');
    setMessage('');

    const response = await createBackup(user.id, description || undefined);

    if (response.success) {
      setMessage(es.backup.createSuccess);
      setMessageType('success');
      setDescription('');
      await loadData();
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }

    setActionInProgress('');
  };

  const handleDeleteBackup = async (fileName: string): Promise<void> => {
    if (!user) return;
    if (!confirm(es.backup.deleteConfirm.replace('{fileName}', fileName))) return;

    setActionInProgress(`delete:${fileName}`);
    setMessage('');

    const response = await deleteBackup(user.id, fileName);

    if (response.success) {
      setMessage(es.backup.deleteSuccess);
      setMessageType('success');
      await loadData();
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }

    setActionInProgress('');
  };

  const handleRestoreBackup = async (fileName: string): Promise<void> => {
    if (!user) return;
    if (!confirm(es.backup.restoreConfirm.replace('{fileName}', fileName))) return;

    setActionInProgress(`restore:${fileName}`);
    setMessage('');

    const response = await restoreBackup(user.id, fileName);

    if (response.success) {
      setMessage(es.backup.restoreSuccess);
      setMessageType('success');
    } else {
      setMessage(response.error.message);
      setMessageType('error');
    }

    setActionInProgress('');
  };

  const noticeClass = message
    ? `tc-notice tc-notice--${messageType === 'error' ? 'error' : messageType === 'success' ? 'success' : 'info'}`
    : '';

  return (
    <>
      <div className="tc-section-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--brand-600)', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 }}>{es.backup.title}</p>
          <h1 className="tc-section-title">{es.backup.title}</h1>
          <p className="tc-section-subtitle">{es.backup.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/dashboard" className="tc-btn tc-btn--secondary">
            {es.dashboard.title}
          </Link>
        </div>
      </div>

      {message ? (
        <section className={noticeClass}>{message}</section>
      ) : null}

      {dbInfo ? (
        <section className="tc-section">
          <h2 className="tc-section-title">{es.backup.databaseInfo}</h2>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.backup.databasePath}</span>
              <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{dbInfo.databasePath}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.backup.databaseSize}</span>
              <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{dbInfo.databaseSizeFormatted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.backup.totalBackups}</span>
              <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{dbInfo.backupCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.backup.totalSize}</span>
              <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{dbInfo.backupTotalSizeFormatted}</span>
            </div>
            {dbInfo.lastBackup ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0' }}>
                <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{es.backup.lastBackup}</span>
                <span style={{ color: 'var(--gray-800)', fontSize: 'var(--text-sm)' }}>{formatDate(dbInfo.lastBackup.createdAt)}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="tc-section">
        <h2 className="tc-section-title">{es.backup.createBackup}</h2>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <input
            type="text"
            className="tc-input"
            placeholder={es.backup.createPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={actionInProgress.length > 0}
          />
          <button
            type="button"
            className="tc-btn tc-btn--primary"
            onClick={() => void handleCreateBackup()}
            disabled={actionInProgress.length > 0}
          >
            {actionInProgress === 'create' ? es.backup.creating : es.backup.createBackup}
          </button>
        </div>
      </section>

      <section className="tc-section">
        <h2 className="tc-section-title">{es.backup.backupList}</h2>

        {loading ? (
          <p style={{ color: 'var(--gray-500)' }}>{es.common.loading}</p>
        ) : backups.length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>{es.backup.noBackups}</p>
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table">
              <thead>
                <tr>
                  <th>{es.backup.fileName}</th>
                  <th>{es.backup.createdAt}</th>
                  <th>{es.backup.backupSize}</th>
                  <th>{es.inventory.status}</th>
                  <th>{es.backup.actions}</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.fileName}>
                    <td>{backup.fileName}</td>
                    <td>{formatDate(backup.createdAt)}</td>
                    <td>{backup.fileSizeFormatted}</td>
                    <td>
                      <span className={`tc-badge ${backup.isValid ? 'tc-badge--success' : 'tc-badge--danger'}`}>
                        {backup.isValid ? es.backup.backupValid : es.backup.backupInvalid}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          type="button"
                          className="tc-btn tc-btn--secondary"
                          onClick={() => void handleRestoreBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('restore:')}
                        >
                          {actionInProgress === `restore:${backup.fileName}` ? es.backup.restoring : es.backup.restore}
                        </button>
                        <button
                          type="button"
                          className="tc-btn tc-btn--danger"
                          onClick={() => void handleDeleteBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('delete:')}
                        >
                          {actionInProgress === `delete:${backup.fileName}` ? es.backup.deleting : es.backup.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
