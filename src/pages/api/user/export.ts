import type { APIRoute } from 'astro';
import { getDb, users, companies, companyMembers, projects, tasks, comments } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse } from '../../../utils/api';
import { eq, inArray } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);

    // 1. User Profile
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .get();

    // 2. Memberships & Companies
    const memberships = await db
      .select({
        companyId: companyMembers.companyId,
        role: companyMembers.role,
        jobTitle: companyMembers.jobTitle,
        joinedAt: companyMembers.createdAt,
        companyName: companies.name,
        companyTimezone: companies.timezone,
        companyIndustry: companies.industry,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, auth.userId))
      .all();

    const companyIds = memberships.map((m) => m.companyId);

    // 3. Projects
    let userProjects: any[] = [];
    if (companyIds.length > 0) {
      userProjects = await db
        .select()
        .from(projects)
        .where(inArray(projects.companyId, companyIds))
        .all();
    }

    const projectIds = userProjects.map((p) => p.id);

    // 4. Tasks
    let userTasks: any[] = [];
    if (projectIds.length > 0) {
      userTasks = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.projectId, projectIds))
        .all();
    }

    // 5. Comments
    const userComments = await db
      .select()
      .from(comments)
      .where(eq(comments.userId, auth.userId))
      .all();

    const exportPayload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        service: 'TaskFlow',
      },
      profile: user,
      companies: memberships,
      projects: userProjects,
      tasks: userTasks,
      comments: userComments,
    };

    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="taskflow-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to export data', 500);
  }
};
