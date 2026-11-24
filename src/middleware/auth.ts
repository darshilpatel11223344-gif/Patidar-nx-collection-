import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { adminUsers } from '../db/schema.ts';

declare global {
  var _pnxSessionSecret: string | undefined;
}

export interface SafeAdminRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  adminRecord?: SafeAdminRecord;
}

interface SessionPayload {
  adminId: number;
  email: string;
  role: string;
  exp: number;
}

function getSessionSecret(): string {
  const configured = (process.env.SESSION_SECRET || '').trim();
  if (configured) return configured;
  if (!global._pnxSessionSecret) {
    global._pnxSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return global._pnxSessionSecret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

export function verifyConstantSecret(input: string, secret: string): boolean {
  if (!input || !secret) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export function signSessionToken(admin: {
  id: number;
  email: string;
  role: string;
}): string {
  const payload: SessionPayload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload;
    if (
      typeof parsed.adminId !== 'number' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  try {
    const [matched] = await db
      .select({
        id: adminUsers.id,
        uid: adminUsers.uid,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, session.adminId))
      .limit(1);

    if (!matched) {
      return res.status(401).json({ error: 'Admin account no longer exists' });
    }

    req.adminRecord = matched;
    return next();
  } catch (error) {
    console.error('Admin verification database error:', error);
    return res.status(500).json({ error: 'Unable to verify admin privileges' });
  }
};
