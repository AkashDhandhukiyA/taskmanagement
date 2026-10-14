import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, companies, companyMembers, projects, auditLog } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and } from 'drizzle-orm';

const createCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().optional(),
  jobTitle: z.string().optional(),
});

const updateCompanySchema = z.object({
  id: z.string().min(1, 'Company ID is required'),
  name: z.string().min(2, 'Company name must be at least 2 characters').optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().optional(),
  logo: z.string().optional(),
});

const deleteCompanySchema = z.object({
  id: z.string().min(1, 'Company ID is required'),
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
        website: companies.website,
        ownerId: companies.ownerId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        role: companyMembers.role,
        jobTitle: companyMembers.jobTitle,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, auth.userId))
      .all();

    const seenCompanyIds = new Set<string>();
    const deduplicatedCompanies = userCompanies.filter((c) => {
      if (seenCompanyIds.has(c.id)) return false;
      seenCompanyIds.add(c.id);
      return true;
    });

    return successResponse({
      companies: deduplicatedCompanies,
      // Provide backwards compatibility alias
      workspaces: deduplicatedCompanies,
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
    const result = createCompanySchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { name, timezone, industry, size, website, jobTitle } = result.data;
    const db = getDb(locals);
    const companyId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert company
    await db.insert(companies).values({
      id: companyId,
      name,
      timezone: timezone || 'UTC',
      industry: industry || 'Technology',
      size: size || '1-10',
      website: website || null,
      logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      ownerId: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Add creator as company owner
    await db.insert(companyMembers).values({
      id: crypto.randomUUID(),
      companyId,
      userId: auth.userId,
      role: 'owner',
      jobTitle: jobTitle || 'Company Owner',
      createdAt: now,
    });

    // 3. Create default project for this company
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: 'General Tasks',
      description: `${name} primary team project`,
      color: '#6366f1',
      createdAt: now,
    });

    // 4. Audit log entry
    try {
      await db.insert(auditLog).values({
        id: crypto.randomUUID(),
        companyId,
        userId: auth.userId,
        entityType: 'company',
        entityId: companyId,
        entityName: name,
        action: 'create',
        changes: JSON.stringify({ timezone, industry, size }),
        createdAt: now,
      });
    } catch (e) {
      // non-fatal
    }

    const createdCompany = {
      id: companyId,
      name,
      timezone: timezone || 'UTC',
      industry: industry || 'Technology',
      size: size || '1-10',
      role: 'owner',
    };

    return successResponse(
      {
        company: createdCompany,
        // alias for backward compatibility
        workspace: createdCompany,
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
    const result = updateCompanySchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { id, name, timezone, industry, size, website, logo } = result.data;
    const db = getDb(locals);

    // Verify membership & permissions (owner or admin)
    const membership = await db
      .select()
      .from(companyMembers)
      .where(and(eq(companyMembers.companyId, id), eq(companyMembers.userId, auth.userId)))
      .get();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return errorResponse('Forbidden: Only company owners or admins can update company details', 403);
    }

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };
    if (name !== undefined) updateData.name = name;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (industry !== undefined) updateData.industry = industry;
    if (size !== undefined) updateData.size = size;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;

    await db.update(companies).set(updateData).where(eq(companies.id, id));

    return successResponse({ message: 'Company properties updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update company', 500);
  }
};

export async function deleteCompanyById(
  id: string,
  authUserId: string,
  locals: App.Locals
): Promise<Response> {
  const db = getDb(locals);

  const company = await db.select().from(companies).where(eq(companies.id, id)).get();
  if (!company) return errorResponse('Company not found', 404);

  if (company.ownerId !== authUserId) {
    return errorResponse('Forbidden: Only the company owner can delete the company', 403);
  }

  // Delete all related records
  await db.delete(companyMembers).where(eq(companyMembers.companyId, id));
  await db.delete(projects).where(eq(projects.companyId, id));
  await db.delete(auditLog).where(eq(auditLog.companyId, id));
  await db.delete(companies).where(eq(companies.id, id));

  return successResponse({ message: 'Company deleted successfully' });
}

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    let id: string | null = null;
    try {
      const body = await request.clone().json();
      const parsed = deleteCompanySchema.safeParse(body);
      if (parsed.success) id = parsed.data.id;
    } catch {
      // not json body
    }

    if (!id) {
      const url = new URL(request.url);
      id = url.searchParams.get('id');
    }

    if (!id) return errorResponse('Company ID is required', 400);

    return await deleteCompanyById(id, auth.userId, locals);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete company', 500);
  }
};
