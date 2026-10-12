import type { APIRoute } from 'astro';
import { getDb, users, workspaceMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and, inArray } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    const db = getDb(locals);

    if (workspaceId) {
      // Verify user has access to this workspace
      const hasAccess = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, auth.userId)))
        .get();

      if (!hasAccess) return errorResponse('Forbidden: Not a member of this workspace', 403);

      const members = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(eq(workspaceMembers.workspaceId, workspaceId))
        .all();

      // Deduplicate members
      const seen = new Set<string>();
      const deduplicatedMembers = members.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      return successResponse({ users: deduplicatedMembers });
    }

    // When no workspaceId is given, find all workspaces the user is part of
    const userWorkspaceMemberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, auth.userId))
      .all();

    const workspaceIds = userWorkspaceMemberships.map((w) => w.workspaceId);

    let deduplicatedUsers: any[] = [];
    if (workspaceIds.length > 0) {
      const teamMembers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(inArray(workspaceMembers.workspaceId, workspaceIds))
        .all();

      const seen = new Set<string>();
      deduplicatedUsers = teamMembers.filter((u) => {
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
    }

    // If query returned empty or only self, ensure current user is present
    if (deduplicatedUsers.length === 0) {
      const self = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, auth.userId))
        .get();
      if (self) deduplicatedUsers.push(self);
    }

    return successResponse({ users: deduplicatedUsers });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch users', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body: any = await request.json();
    const { workspaceId, userId, email, role = 'member' } = body;

    const identifier = (userId || email || '').trim();
    if (!workspaceId || !identifier) {
      return errorResponse('Workspace ID and User ID or Email are required', 400);
    }

    const db = getDb(locals);

    // Look up user by User ID or by Email
    let existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, identifier))
      .get();

    if (!existingUser) {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, identifier.toLowerCase()))
        .get();
    }

    // If user does not exist in system
    if (!existingUser) {
      return errorResponse(
        `User not found. No registered account matches "${identifier}". Please ensure they have registered first or verify their User ID.`,
        404
      );
    }

    // Check if user is already a member of this workspace
    const existingMembership = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .all();

    const isAlreadyMember = existingMembership.some((m) => m.userId === existingUser!.id);
    if (isAlreadyMember) {
      return errorResponse(`"${existingUser.name || existingUser.email}" is already a member of this workspace`, 400);
    }

    // Add to workspace
    const memberId = crypto.randomUUID();
    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId: existingUser.id,
      role: role as 'owner' | 'admin' | 'member',
    });

    return successResponse({
      message: 'Member added successfully',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: existingUser.avatar,
        role,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to add member', 500);
  }
};

