import type { APIRoute } from 'astro';
import { getDb, tasks, comments, users } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { desc, eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);

    // Recent comments notifications
    const recentComments = await db
      .select({
        id: comments.id,
        message: comments.message,
        createdAt: comments.createdAt,
        userName: users.name,
        taskId: comments.taskId,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .orderBy(desc(comments.createdAt))
      .limit(4)
      .all();

    // Urgent and high-priority upcoming tasks
    const urgentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        status: tasks.status,
      })
      .from(tasks)
      .orderBy(desc(tasks.updatedAt))
      .limit(3)
      .all();

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
