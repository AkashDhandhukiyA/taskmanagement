import { defineMiddleware } from 'astro:middleware';
import { getUserFromRequest } from './lib/auth';
import { env } from 'cloudflare:workers';

export const onRequest = defineMiddleware(async (context, next) => {
  const secret = (env as any)?.JWT_SECRET || (context.locals as any)?.cfContext?.env?.JWT_SECRET;
  const user = await getUserFromRequest(context.request, secret);
  context.locals.user = user;

  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Protect private app pages
  const protectedPrefixes = ['/dashboard', '/workspace', '/projects', '/tasks', '/settings'];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    return context.redirect('/login');
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && user) {
    return context.redirect('/dashboard');
  }

  return next();
});
