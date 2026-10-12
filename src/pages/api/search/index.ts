import type { APIRoute } from 'astro';
import { getDb, tasks, projects } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { like, or } from 'drizzle-orm';

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

    // Search tasks by title or description
    const matchedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        status: tasks.status,
        projectId: tasks.projectId,
      })
      .from(tasks)
      .where(or(like(tasks.title, `%${q}%`), like(tasks.description, `%${q}%`)))
      .limit(8)
      .all();

    // Search projects by name
    const matchedProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
      })
      .from(projects)
      .where(like(projects.name, `%${q}%`))
      .limit(5)
      .all();

    return successResponse({ tasks: matchedTasks, projects: matchedProjects });
  } catch (err: any) {
    return errorResponse(err.message || 'Search failed', 500);
  }
};
