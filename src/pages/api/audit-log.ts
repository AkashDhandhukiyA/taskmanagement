import type { APIRoute } from 'astro';
import { getDb, auditLog, users } from '../../db';
import { getUserFromRequest } from '../../lib/auth';
import { errorResponse, successResponse } from '../../utils/api';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    if (!workspaceId) return errorResponse('workspaceId is required', 400);

    const db = getDb(locals);
    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        entityName: auditLog.entityName,
        changes: auditLog.changes,
        createdAt: auditLog.createdAt,
        userId: auditLog.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(eq(auditLog.workspaceId, workspaceId))
      .orderBy(desc(auditLog.createdAt))
      .limit(200)
      .all();

    return successResponse({ events: rows });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to load audit log', 500);
  }
};
