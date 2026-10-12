import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, users, workspaces, workspaceMembers, projects, tasks } from '../../../db';
import { hashPassword, createToken } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.errors.map((e) => e.message).join(', ');
      return errorResponse(errorMsg, 400);
    }

    const { name, email, password } = result.data;
    const db = getDb(locals);

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (existing) {
      return errorResponse('An account with this email already exists', 409);
    }

    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      createdAt: now,
    });

    // Create default workspace
    await db.insert(workspaces).values({
      id: workspaceId,
      name: `${name}'s Workspace`,
      ownerId: userId,
      createdAt: now,
    });

    // Add user as workspace owner member
    await db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId,
      userId,
      role: 'owner',
    });

    // Create initial project
    await db.insert(projects).values({
      id: projectId,
      workspaceId,
      name: 'General Tasks',
      description: 'Your default project workspace',
      color: '#6366f1',
      createdAt: now,
    });

    // Create sample starter task
    await db.insert(tasks).values({
      id: crypto.randomUUID(),
      projectId,
      title: 'Welcome to TaskFlow! 🎉',
      description: 'Explore the Kanban board, create workspaces, assign tasks, and track team analytics.',
      priority: 'high',
      status: 'in_progress',
      assignedTo: userId,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    });

    const token = await createToken({ userId, email: email.toLowerCase(), name });

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return successResponse(
      {
        token,
        user: { id: userId, name, email: email.toLowerCase() },
        message: 'Account created successfully',
      },
      201,
      Object.fromEntries(headers.entries())
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Registration failed', 500);
  }
};
