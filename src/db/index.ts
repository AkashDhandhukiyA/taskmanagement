import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
import { env } from 'cloudflare:workers';

export function getDb(localsOrEnv?: any) {
  const d1 =
    (env as any)?.DB ||
    localsOrEnv?.cfContext?.env?.DB ||
    localsOrEnv?.DB ||
    localsOrEnv;

  if (!d1 || typeof d1.prepare !== 'function') {
    throw new Error('Cloudflare D1 database binding "DB" is not available in current request context.');
  }
  return drizzle(d1, { schema });
}

export * from './schema';
