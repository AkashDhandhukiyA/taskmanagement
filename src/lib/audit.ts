import { getDb, auditLog } from '../db';

export async function logAudit(
  locals: App.Locals,
  params: {
    companyId?: string;
    workspaceId?: string;
    userId: string;
    entityType: 'task' | 'project' | 'company' | 'workspace' | 'member' | 'comment';
    entityId: string;
    entityName?: string;
    action: 'create' | 'update' | 'delete';
    changes?: Record<string, { from: any; to: any }>;
  }
) {
  const targetCompanyId = params.companyId || params.workspaceId;
  if (!targetCompanyId) return;

  try {
    const db = getDb(locals);
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      companyId: targetCompanyId,
      userId: params.userId,
      entityType: params.entityType === 'workspace' ? 'company' : params.entityType,
      entityId: params.entityId,
      entityName: params.entityName ?? null,
      action: params.action,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}

