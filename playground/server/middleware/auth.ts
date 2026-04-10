import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mouva-secret-key-change-in-production';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JWTPayload,
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 * Extracts user info from JWT token in Authorization header or cookie
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies?.token) {
    // Fall back to cookie
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Attach user info to request
  req.userId = payload.userId;
  req.userEmail = payload.email;

  next();
}

/**
 * Optional authentication middleware
 * Same as authMiddleware but doesn't require authentication
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.userEmail = payload.email;
    }
  }

  next();
}
