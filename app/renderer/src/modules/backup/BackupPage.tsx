import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  createBackup,
  deleteBackup,
  getBackupInfo,
  listBackups,
  restoreBackup,
} from '../../shared/api/backup.api';
import { useAuth } from '../../shared/context/AuthContext';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { es } from '../../shared/i18n';
import type { BackupMetadata, BackupSummaryInfo } from '../../shared/types/backup.types';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-CO');
}

// Inline SVG icon components for premium UI
const DatabaseIcon = (): JSX.Element => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="6" rx="7" ry="4" stroke="currentColor" strokeWidth="2" />
    <path d="M5 6v6c0 2.21 3.13 4 7 4s7-1.79 7-4V6" stroke="currentColor" strokeWidth="2" />
    <path d="M5 12v6c0 2.21 3.13 4 7 4s7-1.79 7-4v-6" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CloudUploadIcon = (): JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 16V4m0 0L8 8m4-4l4 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RestoreIcon = (): JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 12a9 9 0 1018 0A9 9 0 003 12z" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 8v4l3 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = (): JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckCircleIcon = (): JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M8 12l3 3 5-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XCircleIcon = (): JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M9 9l6 6m0-6l-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FileIcon = (): JSX.Element => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon = (): JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8h.01M11 12h2v4h-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ArrowLeftIcon = (): JSX.Element => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19 12H5m7-7l-7 7 7 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ShieldCheckIcon = (): JSX.Element => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function BackupPage(): JSX.Element {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'info' | 'error' | 'success'>('info');
  const [actionInProgress, setActionInProgress] = useState<string>('');
  const [description, setDescription] = useState('');
  const [dbInfo, setDbInfo] = useState<BackupSummaryInfo | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning',
  });

  const loadData = useCallback(async (): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setMessage('');

    const [backupsRes, infoRes] = await Promise.all([listBackups(user.id), getBackupInfo(user.id)]);

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

  const handleDeleteBackup = (fileName: string): void => {
    setConfirmDialog({
      open: true,
      title: es.backup.delete,
      message: es.backup.deleteConfirm.replace('{fileName}', fileName),
      variant: 'danger',
      onConfirm: async () => {
        if (!user) return;
        setActionInProgress(`delete:${fileName}`);
        setMessage('');

        const response = await deleteBackup(user.id, fileName);

        if (response.success) {
          setMessage(es.backup.deleteSuccess);
          setMessageType('success');
          await loadData();
        } else {
          setMessage(response.error.message || es.backup.deleteError);
          setMessageType('error');
        }

        setActionInProgress('');
      },
    });
  };

  const handleRestoreBackup = (fileName: string): void => {
    setConfirmDialog({
      open: true,
      title: es.backup.restore,
      message: es.backup.restoreConfirm.replace('{fileName}', fileName),
      variant: 'warning',
      onConfirm: async () => {
        if (!user) return;
        setActionInProgress(`restore:${fileName}`);
        setMessage('');

        const response = await restoreBackup(user.id, fileName);

        if (response.success) {
          setMessage(es.backup.restoreSuccess);
          setMessageType('success');
          // No reload immediately to let the user see the success message
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setMessage(response.error.message || es.backup.restoreError);
          setMessageType('error');
        }

        setActionInProgress('');
      },
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .backup-card {
          animation: slideUp 0.4s ease-out both;
        }
        .backup-card:nth-child(1) { animation-delay: 0.05s; }
        .backup-card:nth-child(2) { animation-delay: 0.1s; }
        .backup-card:nth-child(3) { animation-delay: 0.15s; }
        .backup-row-hover:hover {
          background-color: #f9fafb !important;
          transition: background-color 0.15s ease;
        }
        .backup-btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #3b5bdb 0%, #465fff 100%) !important;
          box-shadow: 0 4px 12px rgba(70, 95, 255, 0.35) !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        .backup-btn-secondary:hover:not(:disabled) {
          background-color: #e0e7ff !important;
          color: #465fff !important;
          border-color: #c7d2fe !important;
          transition: all 0.2s ease;
        }
        .backup-btn-danger:hover:not(:disabled) {
          background-color: #fef2f2 !important;
          color: #dc2626 !important;
          border-color: #fecaca !important;
          transition: all 0.2s ease;
        }
        .backup-input:focus {
          outline: none;
          border-color: #465fff !important;
          box-shadow: 0 0 0 3px rgba(70, 95, 255, 0.12) !important;
        }
        .backup-table-row {
          transition: background-color 0.15s ease;
        }
        .backup-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .backup-badge-success {
          background-color: #ecfdf3;
          color: #059669;
        }
        .backup-badge-danger {
          background-color: #fef2f2;
          color: #dc2626;
        }
        .backup-notice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          animation: slideUp 0.3s ease-out;
        }
        .backup-notice-success {
          background: linear-gradient(135deg, #ecfdf3 0%, #d1fae5 100%);
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
        .backup-notice-error {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        .backup-notice-info {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #bfdbfe;
          color: #1e40af;
        }
      `}</style>

      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #465fff 0%, #7c3aed 100%)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(70, 95, 255, 0.3)',
                }}
              >
                <ShieldCheckIcon />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {es.backup.title}
                </p>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '26px',
                    fontWeight: 700,
                    color: '#111827',
                    lineHeight: 1.2,
                  }}
                >
                  {es.backup.title}
                </h1>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
              {es.backup.subtitle}
            </p>
          </div>
          <div>
            <Link
              to="/dashboard"
              className="backup-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#ffffff',
                color: '#465fff',
                border: '1.5px solid #e0e7ff',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <ArrowLeftIcon />
              {es.dashboard.title}
            </Link>
          </div>
        </div>
      </div>

      {/* Message Notices */}
      {message ? (
        <div
          className={`backup-notice backup-notice-${messageType === 'error' ? 'error' : messageType === 'success' ? 'success' : 'info'}`}
          style={{ marginBottom: '24px' }}
        >
          {messageType === 'success' && <CheckCircleIcon />}
          {messageType === 'error' && <XCircleIcon />}
          {messageType === 'info' && <InfoIcon />}
          <span>{message}</span>
        </div>
      ) : null}

      {/* Database Info Card */}
      {dbInfo ? (
        <div
          className="backup-card"
          style={{
            background: 'linear-gradient(135deg, #fafaff 0%, #f0f4ff 100%)',
            border: '1px solid #e0e7ff',
            borderRadius: '14px',
            padding: '22px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #465fff 0%, #6366f1 100%)',
                borderRadius: '8px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#ffffff',
              }}
            >
              <DatabaseIcon />
            </div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
              {es.backup.databaseInfo}
            </h2>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{ fontWeight: 600, color: '#374151', fontSize: '13px', marginBottom: '4px' }}
              >
                {es.backup.databasePath}
              </div>
              <div
                style={{
                  color: '#6b7280',
                  fontSize: '13px',
                  fontFamily: 'ui-monospace, monospace',
                  wordBreak: 'break-all',
                }}
              >
                {dbInfo.databasePath}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                  {es.backup.databaseSize}
                </span>
                <span style={{ color: '#465fff', fontSize: '14px', fontWeight: 700 }}>
                  {dbInfo.databaseSizeFormatted}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                  {es.backup.totalBackups}
                </span>
                <span style={{ color: '#12b76a', fontSize: '14px', fontWeight: 700 }}>
                  {dbInfo.backupCount}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                  {es.backup.totalSize}
                </span>
                <span style={{ color: '#f79009', fontSize: '14px', fontWeight: 700 }}>
                  {dbInfo.backupTotalSizeFormatted}
                </span>
              </div>
              {dbInfo.lastBackup ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                    {es.backup.lastBackup}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>
                    {formatDate(dbInfo.lastBackup.createdAt)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Create Backup Section */}
      <div
        className="backup-card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '22px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #12b76a 0%, #0ea5e9 100%)',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#ffffff',
            }}
          >
            <CloudUploadIcon />
          </div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
            {es.backup.createBackup}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            type="text"
            className="backup-input"
            placeholder={es.backup.createPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={actionInProgress.length > 0}
            style={{
              width: '100%',
              padding: '11px 14px',
              border: '1.5px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              color: '#111827',
              backgroundColor: '#fafafa',
              transition: 'all 0.2s ease',
            }}
          />
          <button
            type="button"
            className="backup-btn-primary"
            onClick={() => void handleCreateBackup()}
            disabled={actionInProgress.length > 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 20px',
              background: 'linear-gradient(135deg, #465fff 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: actionInProgress.length > 0 ? 'not-allowed' : 'pointer',
              opacity: actionInProgress.length > 0 ? 0.7 : 1,
              boxShadow: '0 2px 8px rgba(70, 95, 255, 0.25)',
              alignSelf: 'flex-start',
              transition: 'all 0.2s ease',
            }}
          >
            <CloudUploadIcon />
            {actionInProgress === 'create' ? es.backup.creating : es.backup.createBackup}
          </button>
        </div>
      </div>

      {/* Backup List Section */}
      <div
        className="backup-card"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '14px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #f79009 0%, #f59e0b 100%)',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#ffffff',
            }}
          >
            <FileIcon />
          </div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827' }}>
            {es.backup.backupList}
          </h2>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            <span style={{ animation: 'pulse 1.5s infinite', marginRight: '8px' }}>
              {es.common.loading}
            </span>
          </div>
        ) : backups.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 20px',
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: '12px', color: '#d1d5db' }}>
              <FileIcon />
            </div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500 }}>{es.backup.noBackups}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: '#374151',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {es.backup.fileName}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: '#374151',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {es.backup.createdAt}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: '#374151',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {es.backup.backupSize}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: '#374151',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {es.inventory.status}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px',
                      fontWeight: 700,
                      color: '#374151',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {es.backup.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr
                    key={backup.fileName}
                    className="backup-table-row backup-row-hover"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 12px',
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#374151',
                        }}
                      >
                        <FileIcon />
                        {backup.fileName}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {formatDate(backup.createdAt)}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#6b7280',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {backup.fileSizeFormatted}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        className={`backup-badge ${backup.isValid ? 'backup-badge-success' : 'backup-badge-danger'}`}
                      >
                        {backup.isValid ? <CheckCircleIcon /> : <XCircleIcon />}
                        {backup.isValid ? es.backup.backupValid : es.backup.backupInvalid}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="backup-btn-secondary"
                          onClick={() => void handleRestoreBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('restore:')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            backgroundColor: '#ffffff',
                            color: '#12b76a',
                            border: '1.5px solid #d1fae5',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: actionInProgress.startsWith('restore:')
                              ? 'not-allowed'
                              : 'pointer',
                            opacity: actionInProgress.startsWith('restore:') ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <RestoreIcon />
                          {actionInProgress === `restore:${backup.fileName}`
                            ? es.backup.restoring
                            : es.backup.restore}
                        </button>
                        <button
                          type="button"
                          className="backup-btn-danger"
                          onClick={() => void handleDeleteBackup(backup.fileName)}
                          disabled={actionInProgress.startsWith('delete:')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '7px 14px',
                            backgroundColor: '#ffffff',
                            color: '#f04438',
                            border: '1.5px solid #fecaca',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: actionInProgress.startsWith('delete:')
                              ? 'not-allowed'
                              : 'pointer',
                            opacity: actionInProgress.startsWith('delete:') ? 0.6 : 1,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <TrashIcon />
                          {actionInProgress === `delete:${backup.fileName}`
                            ? es.backup.deleting
                            : es.backup.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirmDialog.open && (
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
            setActionInProgress('');
          }}
        />
      )}
    </div>
  );
}
