import type { APIRoute } from 'astro';
import { successResponse } from '../../../utils/api';

export const POST: APIRoute = async () => {
  const headers = new Headers();
  headers.append('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return successResponse({ message: 'Logged out successfully' }, 200, Object.fromEntries(headers.entries()));
};
