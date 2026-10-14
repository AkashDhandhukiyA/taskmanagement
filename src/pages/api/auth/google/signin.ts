import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const origin = url.origin;

  // Read credentials from env (supports process.env, Cloudflare context, and Astro meta env)
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    (locals as any)?.cfContext?.env?.GOOGLE_CLIENT_ID ||
    import.meta.env.GOOGLE_CLIENT_ID ||
    import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    (locals as any)?.cfContext?.env?.GOOGLE_REDIRECT_URI ||
    `${origin}/api/auth/google/callback`;

  if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
    // If not configured, redirect to login with instructions
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/login?error=${encodeURIComponent(
          'Google Client ID is missing. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.'
        )}`,
      },
    });
  }

  // Generate random CSRF state
  const state = crypto.randomUUID();

  // Build official Google OAuth 2.0 authorization URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  const headers = new Headers();
  headers.append('Location', googleAuthUrl.toString());
  headers.append('Set-Cookie', `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  return new Response(null, {
    status: 302,
    headers,
  });
};
