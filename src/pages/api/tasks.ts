import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, tasks, projects, users, auditLog } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

// ---------- Validation ----------
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  projectId: z.string().min(1, 'Project is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  projectId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

// ---------- Audit helper ----------
async function logAudit(
  locals: App.Locals,
  params: {
    workspaceId: string | null;
    userId: string;
    entityType: 'task' | 'project' | 'workspace' | 'member' | 'comment';
    entityId: string;
    entityName?: string | null;
    action: 'create' | 'update' | 'delete';
    changes?: Record<string, { from: any; to: any }> | null;
  }
) {
  if (!params.workspaceId) return;
  try {
    const db = getDb(locals);
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      workspaceId: params.workspaceId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName ?? null,
      action: params.action,
      changes: params.changes ? JSON.stringify(params.changes) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('audit log failed:', err);
  }
}

function diffFields(before: any, after: any) {
  const out: Record<string, { from: any; to: any }> = {};
  for (const k of Object.keys(after)) {
    if (k === 'id') continue;
    if (after[k] === undefined) continue;
    const b = before?.[k] ?? null;
    const a = after[k] ?? null;
    if (b !== a) out[k] = { from: b, to: a };
  }
  return out;
}

// ---------- GET ----------
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    const baseQuery = db
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
      .leftJoin(projects, eq(projects.id, tasks.projectId))
      .leftJoin(users, eq(users.id, tasks.assignedTo));

    const rows = projectId
      ? await baseQuery.where(eq(tasks.projectId, projectId)).all()
      : await baseQuery.all();

    return successResponse({ tasks: rows });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch tasks', 500);
  }
};

// ---------- POST ----------
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const db = getDb(locals);

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, parsed.data.projectId))
      .get();

    if (!project) return errorResponse('Project not found', 404);

    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(tasks).values({
      id: taskId,
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority ?? 'medium',
      status: parsed.data.status ?? 'todo',
      assignedTo: parsed.data.assignedTo ?? null,
      dueDate: parsed.data.dueDate ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await logAudit(locals, {
      workspaceId: project.workspaceId,
      userId: auth.userId,
      entityType: 'task',
      entityId: taskId,
      entityName: parsed.data.title,
      action: 'create',
    });

    const created = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    return successResponse({ task: created, message: 'Task created successfully' }, 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create task', 500);
  }
};

// ---------- PATCH ----------
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 400);

    const { id, ...patch } = parsed.data;
    const db = getDb(locals);

    const before = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!before) return errorResponse('Task not found', 404);

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, before.projectId))
      .get();

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.projectId !== undefined) updates.projectId = patch.projectId;
    if (patch.priority !== undefined) updates.priority = patch.priority;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.assignedTo !== undefined) updates.assignedTo = patch.assignedTo;
    if (patch.dueDate !== undefined) updates.dueDate = patch.dueDate;

    await db.update(tasks).set(updates).where(eq(tasks.id, id));

    const changes = diffFields(before, { ...before, ...patch });
    if (Object.keys(changes).length > 0) {
      await logAudit(locals, {
        workspaceId: project?.workspaceId ?? null,
        userId: auth.userId,
        entityType: 'task',
        entityId: id,
        entityName: patch.title ?? before.title,
        action: 'update',
        changes,
      });
    }

    const updated = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    return successResponse({ task: updated, message: 'Task updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update task', 500);
  }
};

// ---------- DELETE ----------
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return errorResponse('Task ID is required', 400);

    const db = getDb(locals);

    const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
    if (!task) return errorResponse('Task not found', 404);

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, task.projectId))
      .get();

    await logAudit(locals, {
      workspaceId: project?.workspaceId ?? null,
      userId: auth.userId,
      entityType: 'task',
      entityId: id,
      entityName: task.title,
      action: 'delete',
    });

    await db.delete(tasks).where(eq(tasks.id, id));

    return successResponse({ message: 'Task deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete task', 500);
  }
};
