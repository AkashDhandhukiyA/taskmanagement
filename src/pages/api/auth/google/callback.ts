import type { APIRoute } from 'astro';
import { getDb, users, companyMembers } from '../../../../db';
import { hashPassword, createToken, parseCookies } from '../../../../lib/auth';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  if (error) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent(`Google sign-in was cancelled or denied: ${error}`)}`,
      },
    });
  }

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent('No authorization code received from Google.')}`,
      },
    });
  }

  // Validate CSRF state
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  if (state && cookies.google_oauth_state && cookies.google_oauth_state !== state) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent('Invalid OAuth state. Please try logging in again.')}`,
      },
    });
  }

  const origin = url.origin;
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    (locals as any)?.cfContext?.env?.GOOGLE_CLIENT_ID ||
    import.meta.env.GOOGLE_CLIENT_ID ||
    import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    (locals as any)?.cfContext?.env?.GOOGLE_CLIENT_SECRET ||
    import.meta.env.GOOGLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (locals as any)?.cfContext?.env?.GOOGLE_REDIRECT_URI ||
    `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file.')}`,
      },
    });
  }

  try {
    // 1. Exchange authorization code with Google for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Google token exchange error:', errText);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent('Google token exchange failed. Check client ID and secret.')}`,
        },
      });
    }

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated profile from Google UserInfo
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userinfoResponse.ok) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent('Failed to retrieve user profile from Google.')}`,
        },
      });
    }

    const googleUser: any = await userinfoResponse.json();
    const email = googleUser.email?.toLowerCase().trim();
    const name = googleUser.name || email.split('@')[0];
    const avatar = googleUser.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    if (!email) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `/login?error=${encodeURIComponent('No email address provided by your Google account.')}`,
        },
      });
    }

    const db = getDb(locals);

    // 3. Find or Create User in Cloudflare D1
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
      // Sync Google avatar
      try {
        await db.update(users).set({ avatar }).where(eq(users.id, user.id));
        user.avatar = avatar;
      } catch {}
    }

    // 4. Create App JWT token
    const appToken = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // 5. Check if user already belongs to any company
    const userMemberships = await db
      .select({ companyId: companyMembers.companyId })
      .from(companyMembers)
      .where(eq(companyMembers.userId, user.id))
      .all();

    const targetUrl = userMemberships.length > 0 ? '/dashboard' : '/company/create';

    const headers = new Headers();
    headers.append('Location', targetUrl);
    headers.append(
      'Set-Cookie',
      `auth_token=${appToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    );
    headers.append(
      'Set-Cookie',
      'google_oauth_state=; Path=/; HttpOnly; Max-Age=0'
    );

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    console.error('Google callback error:', err);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent(err.message || 'Authentication error')}`,
      },
    });
  }
};
