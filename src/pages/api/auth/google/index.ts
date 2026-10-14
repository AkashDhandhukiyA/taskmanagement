import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb, users, companyMembers } from '../../../../db';
import { hashPassword, createToken } from '../../../../lib/auth';
import { errorResponse, successResponse } from '../../../../utils/api';
import { eq } from 'drizzle-orm';

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const result = googleAuthSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Google credential token is required', 400);
    }

    // Verify token with Google's tokeninfo API
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(result.data.credential)}`
    );

    if (!verifyRes.ok) {
      return errorResponse('Invalid or expired Google authentication token', 401);
    }

    const payload: any = await verifyRes.json();
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    const avatar = payload.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    if (!email) {
      return errorResponse('No email found in Google token', 400);
    }

    const db = getDb(locals);

    // Find or create user
    let user = await db.select().from(users).where(eq(users.email, email)).get();

    if (!user) {
      const userId = crypto.randomUUID();
      const randomPassword = await hashPassword(crypto.randomUUID());
      const now = new Date().toISOString();

      await db.insert(users).values({
        id: userId,
        name,
        email,
        password: randomPassword,
        avatar,
        createdAt: now,
      });

      user = {
        id: userId,
        name,
        email,
        password: randomPassword,
        avatar,
        preferences: null,
        twoFactorSecret: null,
        createdAt: now,
      };
    } else if (avatar && (!user.avatar || user.avatar.includes('dicebear'))) {
      try {
        await db.update(users).set({ avatar }).where(eq(users.id, user.id));
        user.avatar = avatar;
      } catch {}
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const userMemberships = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(eq(companyMembers.userId, user.id))
      .all();

    const hasCompany = userMemberships.length > 0;
    const firstCompanyId = hasCompany ? userMemberships[0].companyId : null;

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );

    return successResponse(
      {
        token,
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        hasCompany,
        companyId: firstCompanyId,
        message: 'Signed in with Google successfully',
      },
      200,
      Object.fromEntries(headers.entries())
    );
  } catch (err: any) {
    console.error('Google token error:', err);
    return errorResponse(err.message || 'Google authentication failed', 500);
  }
};
