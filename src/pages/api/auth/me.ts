import type { APIRoute } from 'astro';
import { getDb, users, companies, companyMembers } from '../../../db';
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
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .get();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Fetch user's companies
    const memberRows = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        timezone: companies.timezone,
        industry: companies.industry,
        size: companies.size,
        role: companyMembers.role,
        jobTitle: companyMembers.jobTitle,
        isOwner: eq(companies.ownerId, user.id),
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, user.id))
      .all();

    // Map for backward compatibility
    const workspacesMapped = memberRows.map((m) => ({
      workspaceId: m.companyId,
      workspaceName: m.companyName,
      role: m.role,
      isOwner: m.isOwner,
    }));

    return successResponse({
      user,
      companies: memberRows,
      workspaces: workspacesMapped,
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch user', 500);
  }
};

