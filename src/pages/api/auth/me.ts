import type { APIRoute } from 'astro';
import { getDb, users, workspaces, workspaceMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser) {
      return errorResponse('Unauthorized', 401);
    }

    const db = getDb(locals);
    const user = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, authUser.userId)).get();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Fetch user's workspaces
    const memberRows = await db
      .select({
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        role: workspaceMembers.role,
        isOwner: eq(workspaces.ownerId, user.id),
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, user.id))
      .all();

    return successResponse({
      user,
      workspaces: memberRows,
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch user', 500);
  }
};
