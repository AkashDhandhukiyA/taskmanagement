import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, workspaces, workspaceMembers, projects } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, and } from 'drizzle-orm';

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

const updateWorkspaceSchema = z.object({
  id: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);
    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, auth.userId))
      .all();

    return successResponse({ workspaces: userWorkspaces });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch workspaces', 500);
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
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(workspaces).values({
      id: workspaceId,
      name: result.data.name,
      ownerId: auth.userId,
      createdAt: now,
    });

    await db.insert(workspaceMembers).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId: auth.userId,
      role: 'owner',
    });

    // Create default project in this workspace
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      workspaceId,
      name: 'Default Project',
      description: 'Workspace initial project',
      color: '#6366f1',
      createdAt: now,
    });

    return successResponse({
      workspace: { id: workspaceId, name: result.data.name, role: 'owner' },
      message: 'Workspace created successfully',
    }, 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create workspace', 500);
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
    // Verify membership
    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, result.data.id), eq(workspaceMembers.userId, auth.userId)))
      .get();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return errorResponse('Forbidden: insufficient permissions', 403);
    }

    await db.update(workspaces).set({ name: result.data.name }).where(eq(workspaces.id, result.data.id));
    return successResponse({ message: 'Workspace updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update workspace', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('Workspace ID is required', 400);

    const db = getDb(locals);
    const workspace = await db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!workspace) return errorResponse('Workspace not found', 404);

    if (workspace.ownerId !== auth.userId) {
      return errorResponse('Only the owner can delete the workspace', 403);
    }

    await db.delete(workspaces).where(eq(workspaces.id, id));
    return successResponse({ message: 'Workspace deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete workspace', 500);
  }
};
