import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, comments, users, tasks, projects, companyMembers } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, asc, and } from 'drizzle-orm';

const createCommentSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  message: z.string().min(1, 'Comment message cannot be empty'),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    if (!taskId) return errorResponse('Task ID is required', 400);

    const db = getDb(locals);

    // Verify task belongs to a company user has access to
    const taskAccess = await db
      .select({ id: tasks.id })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(companyMembers, eq(companyMembers.companyId, projects.companyId))
      .where(and(eq(tasks.id, taskId), eq(companyMembers.userId, auth.userId)))
      .get();

    if (!taskAccess) return errorResponse('Task not found or access denied', 404);

    const commentList = await db
      .select({
        id: comments.id,
        taskId: comments.taskId,
        message: comments.message,
        createdAt: comments.createdAt,
        userId: users.id,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.taskId, taskId))
      .orderBy(asc(comments.createdAt))
      .all();

    return successResponse({ comments: commentList });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch comments', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = createCommentSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { taskId, message } = result.data;
    const db = getDb(locals);

    // Verify task belongs to a company user has access to
    const taskAccess = await db
      .select({ id: tasks.id })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .innerJoin(companyMembers, eq(companyMembers.companyId, projects.companyId))
      .where(and(eq(tasks.id, taskId), eq(companyMembers.userId, auth.userId)))
      .get();


    if (!taskAccess) return errorResponse('Task not found or access denied', 404);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(comments).values({
      id,
      taskId,
      userId: auth.userId,
      message,
      createdAt: now,
    });

    return successResponse(
      {
        comment: {
          id,
          taskId,
          message,
          createdAt: now,
          userId: auth.userId,
          userName: auth.name,
        },
        message: 'Comment posted successfully',
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to post comment', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('Comment ID is required', 400);

    const db = getDb(locals);
    const existing = await db.select().from(comments).where(eq(comments.id, id)).get();
    if (!existing) return errorResponse('Comment not found', 404);

    if (existing.userId !== auth.userId) {
      return errorResponse('Forbidden: cannot delete other users comments', 403);
    }

    await db.delete(comments).where(eq(comments.id, id));
    return successResponse({ message: 'Comment deleted' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete comment', 500);
  }
};
