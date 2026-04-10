import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { generateToken } from '../middleware/auth';
import { sendVerificationCode, generateVerificationCode } from '../services/email';

const router = Router();

// Verification code expiry (10 minutes)
const CODE_EXPIRY_MS = 10 * 60 * 1000;

interface VerificationCode {
  id: string;
  email: string;
  code: string;
  expires_at: Date;
  used: boolean;
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

/**
 * POST /api/auth/code/send
 * Send verification code to email
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Rate limiting: Check for recent codes (max 3 per email per hour)
    const recentCodes = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM verification_codes 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email.toLowerCase()]
    );
    
    if (recentCodes[0]?.count >= 3) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

    // Store code in database
    await queryOne(
      `INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), code, expiresAt]
    );

    // Send email
    const sent = await sendVerificationCode(email, code);
    if (!sent) {
      return res.status(500).json({ error: 'Failed to send verification code' });
    }

    return res.json({ 
      success: true, 
      message: 'Verification code sent',
      expiresIn: CODE_EXPIRY_MS / 1000, // seconds
    });
  } catch (error: any) {
    console.error('[Auth] Send code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/code/verify
 * Verify code and login/register user
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    // Find valid code
    const verification = await queryOne<VerificationCode>(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), code]
    );

    if (!verification) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    // Mark code as used
    await queryOne(
      `UPDATE verification_codes SET used = true WHERE id = $1`,
      [verification.id]
    );

    // Find or create user
    let user = await queryOne<User>(
      `SELECT id, email, display_name FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!user) {
      // Create new user (email-verified user, no password required)
      user = await queryOne<User>(
        `INSERT INTO users (email) VALUES ($1) RETURNING id, email, display_name`,
        [email.toLowerCase()]
      );
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
      token,
    });
  } catch (error: any) {
    console.error('[Auth] Verify code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
