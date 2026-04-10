import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/database';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const SALT_ROUNDS = 10;

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const newUser = await queryOne<User>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );

    if (!newUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate token
    const token = generateToken(newUser.id, newUser.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await queryOne<User>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (clear cookie)
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await queryOne<User & { display_name: string | null; avatar_url: string | null }>(
      'SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's active subscription
    const subscription = await queryOne<{
      plan_id: string;
      plan_name: string;
      status: string;
      expires_at: Date | null;
    }>(`
      SELECT us.plan_id, sp.name as plan_name, us.status, us.expires_at
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      LIMIT 1
    `, [req.userId]);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        subscription: subscription ? {
          plan: subscription.plan_id,
          planName: subscription.plan_name,
          status: subscription.status,
          expiresAt: subscription.expires_at,
        } : {
          plan: 'free',
          planName: 'Free',
          status: 'active',
          expiresAt: null,
        },
      },
    });
  } catch (error: any) {
    console.error('[Auth] Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
