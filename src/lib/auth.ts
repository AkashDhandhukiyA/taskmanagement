import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const DEFAULT_SECRET = 'task-flow-super-secure-production-jwt-secret-key-32chars!';

export function getJwtSecretKey(secret?: string): Uint8Array {
  const s = secret || DEFAULT_SECRET;
  return new TextEncoder().encode(s);
}









export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: TokenPayload, secret?: string): Promise<string> {
  const secretKey = getJwtSecretKey(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function verifyToken(token: string, secret?: string): Promise<TokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=');
      return [key, decodeURIComponent(v.join('='))];
    })
  );
}

export async function getUserFromRequest(
  request: Request,
  secret?: string
): Promise<TokenPayload | null> {
  // Check Authorization Bearer header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token, secret);
  }

  // Check Cookie
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  if (cookies.auth_token) {
    return verifyToken(cookies.auth_token, secret);
  }

  return null;
}
