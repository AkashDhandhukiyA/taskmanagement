import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, users } from '../../../db';
import { verifyPassword, createToken } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const { email, password } = result.data;
    const db = getDb(locals);

    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401);
    }

    const token = await createToken({ userId: user.id, email: user.email, name: user.name });

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return successResponse(
      {
        token,
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        message: 'Logged in successfully',
      },
      200,
      Object.fromEntries(headers.entries())
    );
  } catch (err: any) {
    return errorResponse(err.message || 'Login failed', 500);
  }
};
