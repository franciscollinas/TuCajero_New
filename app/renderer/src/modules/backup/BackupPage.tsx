import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { createBackup, deleteBackup, getBackupInfo, listBackups, restoreBackup } from '../../shared/api/backup.api';
import { useAuth } from '../../shared/context/AuthContext';
import { es } from '../../shared/i18n';
import { tokens } from '../../shared/theme';
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

  return (
    <main style={pageStyle}>
      <section style={shellStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>{es.backup.title}</p>
            <h1 style={titleStyle}>{es.backup.title}</h1>
            <p style={subtleStyle}>{es.backup.subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={secondaryLinkStyle}>
              {es.dashboard.title}
            </Link>
          </div>
        </header>

        {message ? (
          <section style={{
            ...noticeStyle,
            ...(messageType === 'error' ? noticeErrorStyle : {}),
            ...(messageType === 'success' ? noticeSuccessStyle : {}),
          }}>
            {message}
          </section>
        ) : null}

        {dbInfo ? (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>{es.backup.databaseInfo}</h2>
            <div style={infoGridStyle}>
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.backup.databasePath}</span>
                <span style={infoValueStyle}>{dbInfo.databasePath}</span>
              </div>
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.backup.databaseSize}</span>
                <span style={infoValueStyle}>{dbInfo.databaseSizeFormatted}</span>
              </div>
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.backup.totalBackups}</span>
                <span style={infoValueStyle}>{dbInfo.backupCount}</span>
              </div>
              <div style={infoItemStyle}>
                <span style={infoLabelStyle}>{es.backup.totalSize}</span>
                <span style={infoValueStyle}>{dbInfo.backupTotalSizeFormatted}</span>
              </div>
              {dbInfo.lastBackup ? (
                <div style={infoItemStyle}>
                  <span style={infoLabelStyle}>{es.backup.lastBackup}</span>
                  <span style={infoValueStyle}>{formatDate(dbInfo.lastBackup.createdAt)}</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.backup.createBackup}</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <input
              type="text"
              placeholder={es.backup.createPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
              disabled={actionInProgress.length > 0}
            />
            <button
              type="button"
              onClick={() => void handleCreateBackup()}
              disabled={actionInProgress.length > 0}
              style={primaryButtonStyle}
            >
              {actionInProgress === 'create' ? es.backup.creating : es.backup.createBackup}
            </button>
          </div>
        </section>

        <section style={panelStyle}>
          <h2 style={sectionTitleStyle}>{es.backup.backupList}</h2>

          {loading ? (
            <p style={subtleStyle}>{es.common.loading}</p>
          ) : backups.length === 0 ? (
            <p style={subtleStyle}>{es.backup.noBackups}</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{es.backup.fileName}</th>
                    <th style={thStyle}>{es.backup.createdAt}</th>
                    <th style={thStyle}>{es.backup.backupSize}</th>
                    <th style={thStyle}>{es.inventory.status}</th>
                    <th style={thStyle}>{es.backup.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.fileName}>
                      <td style={tdStyle}>{backup.fileName}</td>
                      <td style={tdStyle}>{formatDate(backup.createdAt)}</td>
                      <td style={tdStyle}>{backup.fileSizeFormatted}</td>
                      <td style={tdStyle}>
                        <span style={backup.isValid ? badgeValidStyle : badgeInvalidStyle}>
                          {backup.isValid ? es.backup.backupValid : es.backup.backupInvalid}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => void handleRestoreBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('restore:')}
                          style={secondaryButtonStyle}
                        >
                          {actionInProgress === `restore:${backup.fileName}` ? es.backup.restoring : es.backup.restore}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('delete:')}
                          style={dangerButtonStyle}
                        >
                          {actionInProgress === `delete:${backup.fileName}` ? es.backup.deleting : es.backup.delete}
                        </button>
                      </td>
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
  background:
    'radial-gradient(circle at top left, rgba(22, 163, 74, 0.08), transparent 24%), linear-gradient(180deg, #FAFAF9 0%, #F3F4F6 52%, #E5E7EB 100%)',
};
const shellStyle: CSSProperties = { maxWidth: 1100, margin: '0 auto', display: 'grid', gap: tokens.spacing[5] };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.md };
const eyebrowStyle: CSSProperties = { margin: 0, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '12px', fontWeight: 700 };
const titleStyle: CSSProperties = { margin: '6px 0 0', fontSize: '32px', color: '#111827' };
const subtleStyle: CSSProperties = { margin: '8px 0 0', color: '#6B7280' };
const panelStyle: CSSProperties = { padding: '24px', borderRadius: '18px', background: '#FFFFFF', boxShadow: tokens.shadows.sm, display: 'grid', gap: '16px' };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: '24px', color: '#111827' };
const infoGridStyle: CSSProperties = { display: 'grid', gap: '12px' };
const infoItemStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' };
const infoLabelStyle: CSSProperties = { fontWeight: 600, color: '#374151' };
const infoValueStyle: CSSProperties = { color: '#111827', fontSize: '15px' };
const inputStyle: CSSProperties = { minHeight: '46px', borderRadius: '12px', border: '1px solid #D1D5DB', padding: '0 14px', fontSize: '15px' };
const noticeStyle: CSSProperties = { padding: '12px 16px', borderRadius: '12px', border: '1px solid' };
const noticeSuccessStyle: CSSProperties = { background: '#F0FDFA', borderColor: '#99F6E4', color: '#0F766E' };
const noticeErrorStyle: CSSProperties = { background: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: '16px', border: '1px solid #E5E7EB' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '14px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top', color: '#111827' };
const primaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: 'none', background: '#0F766E', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' };
const secondaryButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#111827', fontWeight: 700, cursor: 'pointer' };
const dangerButtonStyle: CSSProperties = { minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, cursor: 'pointer' };
const badgeValidStyle: CSSProperties = { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', background: '#DCFCE7', color: '#166534', fontSize: '13px', fontWeight: 600 };
const badgeInvalidStyle: CSSProperties = { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', background: '#FEE2E2', color: '#991B1B', fontSize: '13px', fontWeight: 600 };
const secondaryLinkStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: '46px', padding: '0 16px', borderRadius: '12px', border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#111827', textDecoration: 'none', fontWeight: 700 };
