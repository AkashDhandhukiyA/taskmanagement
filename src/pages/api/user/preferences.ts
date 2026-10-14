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
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, auth.userId))
      .get();

    let prefs = {};
    if (user?.preferences) {
      try {
        prefs = JSON.parse(user.preferences);
      } catch {}
    }

    return successResponse({ preferences: prefs });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch preferences', 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await getUserFromRequest(request);
    if (!auth) return errorResponse('Unauthorized', 401);

    const body = await request.json();
    const db = getDb(locals);

    // Fetch existing preferences
    const user = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, auth.userId))
      .get();

    let currentPrefs = {};
    if (user?.preferences) {
      try {
        currentPrefs = JSON.parse(user.preferences);
      } catch {}
    }

    const merged = { ...currentPrefs, ...body };
    await db
      .update(users)
      .set({ preferences: JSON.stringify(merged) })
      .where(eq(users.id, auth.userId));

    return successResponse({ preferences: merged, message: 'Preferences updated successfully' });
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update preferences', 500);
  }
};
