import type { APIRoute } from 'astro';
import { getDb, users } from '../../../db';
import { getUserFromRequest } from '../../../lib/auth';
import { errorResponse, successResponse } from '../../../utils/api';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const db = getDb(locals);
    const user = await db
      .select({ twoFactorSecret: users.twoFactorSecret })
      .from(users)
      .where(eq(users.id, auth.userId))
      .get();

    return successResponse({
      enabled: Boolean(user?.twoFactorSecret),
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to check 2FA status', 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const { action } = body; // 'enable' | 'disable'
    const db = getDb(locals);

    if (action === 'disable') {
      await db
        .update(users)
        .set({ twoFactorSecret: null })
        .where(eq(users.id, auth.userId));
      return successResponse({ enabled: false, message: 'Two-Factor Authentication disabled' });
    }

    // Generate a 16-character base32-like TOTP secret
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    await db
      .update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.id, auth.userId));

    return successResponse({
      enabled: true,
      secret,
      message: 'Two-Factor Authentication enabled successfully',
    });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update 2FA', 500);
  }
};
