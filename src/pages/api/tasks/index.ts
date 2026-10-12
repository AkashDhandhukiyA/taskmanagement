import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, tasks, projects, users } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq, desc } from 'drizzle-orm';

const createTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

const updateTaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const status = url.searchParams.get('status');

    const db = getDb(locals);

    let query = db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        assignedTo: tasks.assignedTo,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectName: projects.name,
        projectColor: projects.color,
        assigneeName: users.name,
        assigneeAvatar: users.avatar,
      })
      .from(tasks)
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(users, eq(users.id, tasks.assignedTo))
      .orderBy(desc(tasks.updatedAt));

    const taskList = await query.all();

    let filtered = taskList;
    if (projectId) {
      filtered = filtered.filter((t) => t.projectId === projectId);
    }
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }

    return successResponse({ tasks: filtered });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch tasks', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = createTaskSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const data = result.data;
    const db = getDb(locals);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(tasks).values({
      id,
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assignedTo || auth.userId,
      dueDate: data.dueDate || null,
      createdAt: now,
      updatedAt: now,
    });

    return successResponse(
      {
        task: {
          id,
          ...data,
          assignedTo: data.assignedTo || auth.userId,
          createdAt: now,
          updatedAt: now,
        },
        message: 'Task created successfully',
      },
      201
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create task', 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = updateTaskSchema.safeParse(body);
    if (!result.success) return errorResponse(result.error.errors[0].message, 400);

    const { id, ...updates } = result.data;
    const db = getDb(locals);

    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!existing) return errorResponse('Task not found', 404);

    const now = new Date().toISOString();
    await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(eq(tasks.id, id));

    return successResponse({ message: 'Task updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update task', 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('Task ID is required', 400);

    const db = getDb(locals);
    await db.delete(tasks).where(eq(tasks.id, id));
    return successResponse({ message: 'Task deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete task', 500);
  }
};
