import type { APIRoute } from 'astro';
import { getDb, tasks, projects, workspaceMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { like, or, and, eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();

    if (!q) {
      return successResponse({ tasks: [], projects: [] });
    }

    const db = getDb(locals);

    // Search tasks belonging only to workspaces the user is a member of
    const rawTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        projectId: tasks.projectId,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, projects.workspaceId))
      .where(
        and(
          eq(workspaceMembers.userId, auth.userId),
          or(like(tasks.title, `%${q}%`), like(tasks.description, `%${q}%`))
        )
      )
      .limit(16)
      .all();

    const seenTaskIds = new Set<string>();
    const matchedTasks = rawTasks.filter((t) => {
      if (seenTaskIds.has(t.id)) return false;
      seenTaskIds.add(t.id);
      return true;
    }).slice(0, 8);

    // Search projects belonging only to workspaces the user is a member of
    const rawProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
      })
      .from(projects)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, projects.workspaceId))
      .where(
        and(
          eq(workspaceMembers.userId, auth.userId),
          like(projects.name, `%${q}%`)
        )
      )
      .limit(10)
      .all();

    const seenProjectIds = new Set<string>();
    const matchedProjects = rawProjects.filter((p) => {
      if (seenProjectIds.has(p.id)) return false;
      seenProjectIds.add(p.id);
      return true;
    }).slice(0, 5);

    return successResponse({ tasks: matchedTasks, projects: matchedProjects });
  } catch (err: any) {
    return errorResponse(err.message || 'Search failed', 500);
  }
};
