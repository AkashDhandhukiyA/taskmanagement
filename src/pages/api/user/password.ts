import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, users } from '../../../db';
import { getUserFromRequest, verifyPassword, hashPassword } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const { currentPassword, newPassword } = result.data;
    const db = getDb(locals);

    const user = await db.select().from(users).where(eq(users.id, auth.userId)).get();
    if (!user) return errorResponse('User not found', 404);

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return errorResponse('Current password does not match', 400);
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, auth.userId));

    return successResponse({ message: 'Password updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update password', 500);
  }
};
