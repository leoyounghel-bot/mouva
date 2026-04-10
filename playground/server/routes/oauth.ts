import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { queryOne } from '../config/database';
import { generateToken } from '../middleware/auth';

const router = Router();

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  oauth_provider: string | null;
}

interface MicrosoftUserProfile {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string | null;
}

/**
 * POST /api/auth/oauth/google
 * Authenticate with Google ID token
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Email is required from Google' });
    }

    // Check if user exists with this Google OAuth
    let user = await queryOne<User>(
      'SELECT id, email, display_name, avatar_url FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
      ['google', googleId]
    );

    if (!user) {
      // Check if email already exists (link accounts)
      user = await queryOne<User>(
        'SELECT id, email, display_name, avatar_url, oauth_provider FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (user && user.oauth_provider) {
        // Email exists with different OAuth provider
        return res.status(409).json({ 
          error: `This email is already registered with ${user.oauth_provider}` 
        });
      }

      if (user) {
        // Link Google to existing email/password account
        await queryOne(
          'UPDATE users SET oauth_provider = $1, oauth_id = $2, display_name = COALESCE(display_name, $3), avatar_url = COALESCE(avatar_url, $4) WHERE id = $5',
          ['google', googleId, name, picture, user.id]
        );
      } else {
        // Create new user
        user = await queryOne<User>(
          `INSERT INTO users (email, oauth_provider, oauth_id, display_name, avatar_url) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, email, display_name, avatar_url`,
          [email.toLowerCase(), 'google', googleId, name, picture]
        );
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create or find user' });
    }

    // Generate JWT token
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
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
      token,
    });
  } catch (error: any) {
    console.error('[OAuth] Google auth error:', error);
    return res.status(500).json({ error: 'Google authentication failed' });
  }
});

/**
 * POST /api/auth/oauth/microsoft
 * Authenticate with Microsoft access token
 */
router.post('/microsoft', async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Microsoft access token is required' });
    }

    // Fetch user info from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid Microsoft token' });
    }

    const msUser = (await response.json()) as MicrosoftUserProfile;
    const { id: microsoftId, mail, userPrincipalName, displayName } = msUser;

    // Microsoft may return email in mail or userPrincipalName
    const email = mail || userPrincipalName;
    if (!email) {
      return res.status(400).json({ error: 'Email is required from Microsoft' });
    }

    // Fetch profile photo (optional)
    let avatarUrl: string | null = null;
    try {
      const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (photoResponse.ok) {
        // Convert to base64 data URL
        const photoBuffer = await photoResponse.arrayBuffer();
        const base64 = Buffer.from(photoBuffer).toString('base64');
        avatarUrl = `data:image/jpeg;base64,${base64}`;
      }
    } catch {
      // Photo fetch is optional, ignore errors
    }

    // Check if user exists with this Microsoft OAuth
    let user = await queryOne<User>(
      'SELECT id, email, display_name, avatar_url FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
      ['microsoft', microsoftId]
    );

    if (!user) {
      // Check if email already exists
      user = await queryOne<User>(
        'SELECT id, email, display_name, avatar_url, oauth_provider FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (user && user.oauth_provider) {
        return res.status(409).json({ 
          error: `This email is already registered with ${user.oauth_provider}` 
        });
      }

      if (user) {
        // Link Microsoft to existing account
        await queryOne(
          'UPDATE users SET oauth_provider = $1, oauth_id = $2, display_name = COALESCE(display_name, $3), avatar_url = COALESCE(avatar_url, $4) WHERE id = $5',
          ['microsoft', microsoftId, displayName, avatarUrl, user.id]
        );
      } else {
        // Create new user
        user = await queryOne<User>(
          `INSERT INTO users (email, oauth_provider, oauth_id, display_name, avatar_url) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, email, display_name, avatar_url`,
          [email.toLowerCase(), 'microsoft', microsoftId, displayName, avatarUrl]
        );
      }
    }

    if (!user) {
      return res.status(500).json({ error: 'Failed to create or find user' });
    }

    // Generate JWT token
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
        avatarUrl: user.avatar_url,
      },
      token,
    });
  } catch (error: any) {
    console.error('[OAuth] Microsoft auth error:', error);
    return res.status(500).json({ error: 'Microsoft authentication failed' });
  }
});

export default router;
