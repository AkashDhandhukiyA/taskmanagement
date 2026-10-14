import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, companies, companyMembers, projects } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and } from 'drizzle-orm';

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().optional(),
});

const updateWorkspaceSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  timezone: z.string().optional(),
});

const deleteWorkspaceSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);
    const userCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        timezone: companies.timezone,
        industry: companies.industry,
        size: companies.size,
        logo: companies.logo,
        ownerId: companies.ownerId,
        createdAt: companies.createdAt,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, auth.userId))
      .all();

    const seenIds = new Set<string>();
    const deduplicated = userCompanies.filter((w) => {
      if (seenIds.has(w.id)) return false;
      seenIds.add(w.id);
      return true;
    });

    return successResponse({
      workspaces: deduplicated,
      companies: deduplicated,
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch companies', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = createWorkspaceSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const db = getDb(locals);
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(companies).values({
      id: companyId,
      name: result.data.name,
      timezone: result.data.timezone || 'UTC',
      industry: 'Technology',
      size: '1-10',
      ownerId: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(companyMembers).values({
      id: crypto.randomUUID(),
      companyId,
      userId: auth.userId,
      role: 'owner',
      jobTitle: 'Company Owner',
      createdAt: now,
    });

    // Create default project
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: 'General Tasks',
      description: 'Default project workspace',
      color: '#6366f1',
      createdAt: now,
    });

    return successResponse(
      {
        workspace: { id: companyId, name: result.data.name, role: 'owner' },
        company: { id: companyId, name: result.data.name, role: 'owner' },
        message: 'Company created successfully',
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create company', 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = updateWorkspaceSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const db = getDb(locals);
    const membership = await db
      .select()
      .from(companyMembers)
      .where(
        and(
          eq(companyMembers.companyId, result.data.id),
          eq(companyMembers.userId, auth.userId)
        )
      )
      .get();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return errorResponse('Forbidden: insufficient permissions', 403);
    }

    await db
      .update(companies)
      .set({
        name: result.data.name,
        ...(result.data.timezone ? { timezone: result.data.timezone } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(companies.id, result.data.id));

    return successResponse({ message: 'Company updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update company', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    let id: string | null = null;
    try {
      const body = await request.clone().json();
      const parsed = deleteWorkspaceSchema.safeParse(body);
      if (parsed.success) id = parsed.data.id;
    } catch {
      // not json
    }

    if (!id) {
      const url = new URL(request.url);
      id = url.searchParams.get('id');
    }

    if (!id) return errorResponse('Company ID is required', 400);

    const db = getDb(locals);
    const company = await db.select().from(companies).where(eq(companies.id, id)).get();
    if (!company) return errorResponse('Company not found', 404);

    if (company.ownerId !== auth.userId) {
      return errorResponse('Only the owner can delete the company', 403);
    }

    await db.delete(companyMembers).where(eq(companyMembers.companyId, id));
    await db.delete(projects).where(eq(projects.companyId, id));
    await db.delete(companies).where(eq(companies.id, id));

    return successResponse({ message: 'Company deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete company', 500);
  }
};

