import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { generateToken } from '../middleware/auth';
import { sendMagicLink, generateMagicLinkToken } from '../services/email';

const router = Router();

// Magic Link expiry (15 minutes)
const LINK_EXPIRY_MS = 15 * 60 * 1000;

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
 * POST /api/auth/magic/send
 * Send magic link to email
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

    // Rate limiting: Check for recent codes (max 5 per email per hour)
    const recentCodes = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM verification_codes 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email.toLowerCase()]
    );
    
    if (recentCodes[0]?.count >= 5) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // Generate token
    const token = generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + LINK_EXPIRY_MS);

    // Store token in database (using verification_codes table)
    await queryOne(
      `INSERT INTO verification_codes (email, code, expires_at) VALUES ($1, $2, $3)`,
      [email.toLowerCase(), token, expiresAt]
    );

    // Construct link
    // Default to frontend verification handling
    // We send a link to the backend which sets cookie and redirects to frontend
    // OR we send link to frontend which calls backend API
    
    // Approach: Link points to Backend Verify Route
    // This allows HTTPOnly cookie to be set immediately
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5177';
    // Link points to Backend verify endpoint
    // We need the backend URL. Assuming it's relative or configured.
    // Actually, safest is to point to Frontend with token, and Frontend calls API.
    // Why? Cross-domain cookie issues if backend is on different domain (though here local).
    // Let's stick to Frontend -> API for simplicity in CORS contexts usually.
    // BUT user asked for "Magic Link", usually implies clicking link logs you in.
    // Let's make the link point to Backend, which sets cookie and redirects to Frontend.
    
    // We need standard way to know backend URL. 
    // In dev: http://localhost:5800/api/auth/magic/verify?email=...&token=...
    // In prod: https://api.mouva.ai/api/auth/magic/verify
    
    // For now, let's construct it assuming standard API path relative to origin if same domain
    // or use environment variable for API_URL.
    
    // Let's use a "Verify Page" on frontend to keep it simple and avoid 302 redirect cookie issues across domains.
    // Link: user clicks -> Frontend /verify-magic?email=...&token=... -> API /verify -> Cookie -> /ai-designer
    
    const magicLink = `${frontendUrl}/verify-magic?email=${encodeURIComponent(email)}&token=${token}`;

    // Send email
    const sent = await sendMagicLink(email, magicLink);
    if (!sent) {
      return res.status(500).json({ error: 'Failed to send magic link' });
    }

    return res.json({ 
      success: true, 
      message: 'Magic link sent',
      expiresIn: LINK_EXPIRY_MS / 1000, 
    });
  } catch (error: any) {
    console.error('[Auth] Send magic link error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/magic/verify
 * Verify magic link token
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }

    // Find valid token
    const verification = await queryOne<VerificationCode>(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), token]
    );

    if (!verification) {
      return res.status(401).json({ error: 'Invalid or expired magic link' });
    }

    // Mark as used
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
      // Create new user
      user = await queryOne<User>(
        `INSERT INTO users (email) VALUES ($1) RETURNING id, email, display_name`,
        [email.toLowerCase()]
      );
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    // Generate token
    const jwtToken = generateToken(user.id, user.email);

    // Set cookie
    res.cookie('token', jwtToken, {
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
      token: jwtToken,
    });
  } catch (error: any) {
    console.error('[Auth] Verify magic link error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
