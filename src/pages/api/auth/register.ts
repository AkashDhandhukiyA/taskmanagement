import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, users } from '../../../db';
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
        requiresCompany: true,
        message: 'Account created successfully. Please create your company next.',
      },
      201,
      Object.fromEntries(headers.entries())
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Registration failed', 500);
  }
};

