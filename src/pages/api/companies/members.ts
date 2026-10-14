import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, companies, companyMembers, users, auditLog } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and } from 'drizzle-orm';

const inviteMemberSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  identifier: z.string().min(1, 'Email or User ID is required'),
  role: z.enum(['member', 'admin']).default('member'),
  jobTitle: z.string().optional(),
});

const updateMemberSchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.enum(['member', 'admin']).optional(),
  jobTitle: z.string().optional(),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');
    if (!companyId) return errorResponse('companyId parameter is required', 400);

    const db = getDb(locals);

    // Verify requesting user is member of this company
    const hasAccess = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, auth.userId)))
      .get();

    if (!hasAccess) return errorResponse('Forbidden: You are not a member of this company', 403);

    const members = await db
      .select({
        id: companyMembers.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: companyMembers.role,
        jobTitle: companyMembers.jobTitle,
        createdAt: companyMembers.createdAt,
      })
      .from(companyMembers)
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companyMembers.companyId, companyId))
      .all();

    return successResponse({ members });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch company members', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = inviteMemberSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { companyId, identifier, role, jobTitle } = result.data;
    const db = getDb(locals);

    // Verify caller has permissions (owner or admin)
    const callerMembership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, auth.userId)))
      .get();

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return errorResponse('Forbidden: Only company owners or admins can invite members', 403);
    }

    // Look up target user by ID or by email
    const trimmed = identifier.trim();
    let targetUser = await db.select().from(users).where(eq(users.id, trimmed)).get();
    if (!targetUser) {
      targetUser = await db.select().from(users).where(eq(users.email, trimmed.toLowerCase())).get();
    }

    if (!targetUser) {
      return errorResponse(
        `User not found. No registered account matches "${trimmed}". Please have them register first.`,
        404
      );
    }

    // Check if target user is already in this company
    const existingMembership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, targetUser.id)))
      .get();

    if (existingMembership) {
      return errorResponse(`"${targetUser.name || targetUser.email}" is already a member of this company`, 400);
    }

    const memberId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(companyMembers).values({
      id: memberId,
      companyId,
      userId: targetUser.id,
      role,
      jobTitle: jobTitle || 'Team Member',
      createdAt: now,
    });

    // Audit log
    try {
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        companyId,
        userId: auth.userId,
        entityType: 'member',
        entityId: targetUser.id,
        entityName: targetUser.name,
        action: 'create',
        changes: JSON.stringify({ role, jobTitle }),
        createdAt: now,
      });
    } catch (e) {
      // non-fatal
    }

    return successResponse(
      {
        message: 'Member added successfully',
        member: {
          id: memberId,
          userId: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          role,
          jobTitle: jobTitle || 'Team Member',
          createdAt: now,
        },
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to add member', 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = updateMemberSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { companyId, memberId, role, jobTitle } = result.data;
    const db = getDb(locals);

    // Verify caller is owner or admin
    const callerMembership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, auth.userId)))
      .get();

    if (!callerMembership || (callerMembership.role !== 'owner' && callerMembership.role !== 'admin')) {
      return errorResponse('Forbidden: Only company owners or admins can modify team roles', 403);
    }

    // Verify target member
    const targetMember = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.id, memberId), eq(companyMembers.companyId, companyId)))
      .get();

    if (!targetMember) return errorResponse('Member not found in this company', 404);

    if (targetMember.role === 'owner') {
      return errorResponse('Cannot change the role of the company owner', 400);
    }

    const updateFields: any = {};
    if (role) updateFields.role = role;
    if (jobTitle !== undefined) updateFields.jobTitle = jobTitle;

    await db.update(companyMembers).set(updateFields).where(eq(companyMembers.id, memberId));

    return successResponse({ message: 'Team member updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update member', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    let companyId: string | null = null;
    let memberId: string | null = null;

    try {
      const body = await request.clone().json();
      companyId = body.companyId;
      memberId = body.memberId;
    } catch {
      // not json
    }

    if (!companyId || !memberId) {
      const url = new URL(request.url);
      companyId = companyId || url.searchParams.get('companyId');
      memberId = memberId || url.searchParams.get('memberId');
    }

    if (!companyId || !memberId) {
      return errorResponse('companyId and memberId are required', 400);
    }

    const db = getDb(locals);

    // Fetch target member
    const targetMember = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.id, memberId), eq(companyMembers.companyId, companyId)))
      .get();

    if (!targetMember) return errorResponse('Member not found', 404);

    if (targetMember.role === 'owner') {
      return errorResponse('Cannot remove the company owner from the company', 400);
    }

    // Check caller permission: must be owner, admin, or the member themselves leaving
    const callerMembership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, auth.userId)))
      .get();

    const isSelfLeaving = targetMember.userId === auth.userId;
    const isOwnerOrAdmin = callerMembership?.role === 'owner' || callerMembership?.role === 'admin';

    if (!isSelfLeaving && !isOwnerOrAdmin) {
      return errorResponse('Forbidden: You do not have permission to remove this member', 403);
    }

    await db.delete(companyMembers).where(eq(companyMembers.id, memberId));

    return successResponse({ message: 'Member removed from company' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to remove member', 500);
  }
};
