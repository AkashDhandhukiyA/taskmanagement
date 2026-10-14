import type { APIRoute } from 'astro';
import { getDb, tasks, comments, users, projects, companyMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { desc, eq, and } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);

    // Fetch user preferences
    const userRow = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, auth.userId))
      .get();

    let notifPrefs = {
      taskAssignments: true,
      comments: true,
      dueDates: true,
      companyActivity: true,
      productUpdates: true,
    };

    if (userRow?.preferences) {
      try {
        const parsed = JSON.parse(userRow.preferences);
        if (parsed.notifications) {
          notifPrefs = { ...notifPrefs, ...parsed.notifications };
        }
      } catch {}
    }

    // Recent comments notifications from user's companies (if enabled)
    let rawComments: any[] = [];
    if (notifPrefs.comments) {
      rawComments = await db
        .select({
          id: comments.id,
          message: comments.message,
          createdAt: comments.createdAt,
          userName: users.name,
          taskId: comments.taskId,
        })
        .from(comments)
        .innerJoin(tasks, eq(tasks.id, comments.taskId))
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .innerJoin(companyMembers, eq(companyMembers.companyId, projects.companyId))
        .leftJoin(users, eq(users.id, comments.userId))
        .where(eq(companyMembers.userId, auth.userId))
        .orderBy(desc(comments.createdAt))
        .limit(8)
        .all();
    }

    const seenCommentIds = new Set<string>();
    const recentComments = rawComments.filter((c) => {
      if (seenCommentIds.has(c.id)) return false;
      seenCommentIds.add(c.id);
      return true;
    }).slice(0, 4);

    // Urgent and high-priority upcoming tasks from user's companies (if enabled)
    let rawTasks: any[] = [];
    if (notifPrefs.taskAssignments || notifPrefs.dueDates) {
      rawTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          status: tasks.status,
        })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .innerJoin(companyMembers, eq(companyMembers.companyId, projects.companyId))
        .where(eq(companyMembers.userId, auth.userId))
        .orderBy(desc(tasks.updatedAt))
        .limit(6)
        .all();
    }


    const seenTaskIds = new Set<string>();
    const urgentTasks = rawTasks.filter((t) => {
      if (seenTaskIds.has(t.id)) return false;
      seenTaskIds.add(t.id);
      return true;
    }).slice(0, 3);

    const notifications = [
      ...recentComments.map((c) => ({
        id: `c-${c.id}`,
        type: 'comment',
        title: `${c.userName || 'Team member'} commented`,
        desc: c.message,
        time: 'Recent',
        link: '/tasks',
      })),
      ...urgentTasks.map((t) => ({
        id: `t-${t.id}`,
        type: 'task',
        title: `Task update: ${t.title}`,
        desc: `Status: ${t.status.replace('_', ' ')} • Priority: ${t.priority}`,
        time: t.dueDate || 'Today',
        link: '/tasks',
      })),
    ];

    return successResponse({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch notifications', 500);
  }
};
