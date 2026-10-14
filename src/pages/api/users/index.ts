import type { APIRoute } from 'astro';
import { getDb, users, companyMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and, inArray } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const targetCompanyId = url.searchParams.get('companyId') || url.searchParams.get('workspaceId');

    const db = getDb(locals);

    if (targetCompanyId) {
      // Verify user has access to this company
      const hasAccess = await db
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, targetCompanyId), eq(companyMembers.userId, auth.userId)))
        .get();

      if (!hasAccess) return errorResponse('Forbidden: Not a member of this company', 403);

      const members = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: companyMembers.role,
          jobTitle: companyMembers.jobTitle,
        })
        .from(companyMembers)
        .innerJoin(users, eq(users.id, companyMembers.userId))
        .where(eq(companyMembers.companyId, targetCompanyId))
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

    // When no companyId is given, find all companies the user is part of
    const userCompanyMemberships = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(eq(companyMembers.userId, auth.userId))
      .all();

    const companyIds = userCompanyMemberships.map((w) => w.companyId);

    let deduplicatedUsers: any[] = [];
    if (companyIds.length > 0) {
      const teamMembers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(companyMembers)
        .innerJoin(users, eq(users.id, companyMembers.userId))
        .where(inArray(companyMembers.companyId, companyIds))
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
    const { companyId, workspaceId, userId, email, role = 'member', jobTitle } = body;
    const targetCompanyId = companyId || workspaceId;

    const identifier = (userId || email || '').trim();
    if (!targetCompanyId || !identifier) {
      return errorResponse('Company ID and User ID or Email are required', 400);
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

    // Check if user is already a member of this company
    const existingMembership = await db
      .select()
      .from(companyMembers)
      .where(eq(companyMembers.companyId, targetCompanyId))
      .all();

    const isAlreadyMember = existingMembership.some((m) => m.userId === existingUser!.id);
    if (isAlreadyMember) {
      return errorResponse(`"${existingUser.name || existingUser.email}" is already a member of this company`, 400);
    }

    // Add to company
    const memberId = crypto.randomUUID();
    await db.insert(companyMembers).values({
      id: memberId,
      companyId: targetCompanyId,
      userId: existingUser.id,
      role: role as 'owner' | 'admin' | 'member',
      jobTitle: jobTitle || 'Team Member',
      createdAt: new Date().toISOString(),
    });

    return successResponse({
      message: 'Member added successfully',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatar: existingUser.avatar,
        role,
        jobTitle: jobTitle || 'Team Member',
      },
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to add member', 500);
  }
};


