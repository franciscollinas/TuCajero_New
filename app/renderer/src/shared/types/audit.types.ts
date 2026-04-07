export interface AuditActor {
  id: number;
  username: string;
  fullName: string;
  role: string;
}

export interface AuditLogEntry {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number | null;
  payload: string;
  createdAt: string;
  user: AuditActor;
}
