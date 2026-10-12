import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, projects, workspaceMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and } from 'drizzle-orm';

const createProjectSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  color: z.string().default('#6366f1'),
});

const updateProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');

    const db = getDb(locals);

    if (workspaceId) {
      // Check user belongs to workspace
      const member = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, auth.userId)))
        .get();

      if (!member) return errorResponse('Forbidden: Not a workspace member', 403);

      const projectList = await db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
      return successResponse({ projects: projectList });
    }

    // Return projects across all user workspaces
    const userProjects = await db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, projects.workspaceId))
      .where(eq(workspaceMembers.userId, auth.userId))
      .all();

    // Deduplicate in case of duplicate memberships
    const seen = new Set<string>();
    const deduplicatedProjects = userProjects.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return successResponse({ projects: deduplicatedProjects });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch projects', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { workspaceId, name, description, color } = result.data;
    const db = getDb(locals);

    // Verify membership
    const member = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, auth.userId)))
      .get();

    if (!member) return errorResponse('Not a member of this workspace', 403);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(projects).values({
      id,
      workspaceId,
      name,
      description: description || null,
      color: color || '#6366f1',
      createdAt: now,
    });

    return successResponse({
      project: { id, workspaceId, name, description, color, createdAt: now },
      message: 'Project created successfully',
    }, 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create project', 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { id, name, description, color } = result.data;
    const db = getDb(locals);

    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, projects.workspaceId))
      .where(and(eq(projects.id, id), eq(workspaceMembers.userId, auth.userId)))
      .get();

    if (!existing) return errorResponse('Project not found or access denied', 404);

    await db
      .update(projects)
      .set({
        ...(name ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(color ? { color } : {}),
      })
      .where(eq(projects.id, id));

    return successResponse({ message: 'Project updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update project', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('Project ID is required', 400);

    const db = getDb(locals);

    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, projects.workspaceId))
      .where(and(eq(projects.id, id), eq(workspaceMembers.userId, auth.userId)))
      .get();

    if (!existing) return errorResponse('Project not found or access denied', 404);

    await db.delete(projects).where(eq(projects.id, id));
    return successResponse({ message: 'Project deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete project', 500);
  }
};
