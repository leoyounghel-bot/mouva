import { Router, Response } from 'express';
import { queryOne } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// =====================================================
// TYPES
// =====================================================

interface UserSettings {
  user_id: string;
  language: string;
  theme: string;
  timezone: string;
  email_notifications: boolean;
  marketing_emails: boolean;
}

// =====================================================
// ROUTES
// =====================================================

/**
 * GET /api/settings
 * Get current user's settings
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settings = await queryOne<UserSettings>(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.userId]
    );

    if (!settings) {
      // Create default settings if none exist
      settings = await queryOne<UserSettings>(`
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        RETURNING *
      `, [req.userId]);
    }

    return res.json({
      settings: {
        language: settings?.language || 'zh',
        theme: settings?.theme || 'light',
        timezone: settings?.timezone || 'Asia/Shanghai',
        emailNotifications: settings?.email_notifications ?? true,
        marketingEmails: settings?.marketing_emails ?? false,
      },
    });
  } catch (error: any) {
    console.error('[Settings] Get settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Update user settings
 */
router.put('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { language, theme, timezone, emailNotifications, marketingEmails } = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(language);
    }
    if (theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(theme);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(timezone);
    }
    if (emailNotifications !== undefined) {
      updates.push(`email_notifications = $${paramIndex++}`);
      values.push(emailNotifications);
    }
    if (marketingEmails !== undefined) {
      updates.push(`marketing_emails = $${paramIndex++}`);
      values.push(marketingEmails);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings to update' });
    }

    values.push(req.userId);

    const settings = await queryOne<UserSettings>(`
      UPDATE user_settings 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING *
    `, values);

    if (!settings) {
      // Create if doesn't exist
      const newSettings = await queryOne<UserSettings>(`
        INSERT INTO user_settings (user_id, language, theme, timezone, email_notifications, marketing_emails)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        req.userId,
        language || 'zh',
        theme || 'light',
        timezone || 'Asia/Shanghai',
        emailNotifications ?? true,
        marketingEmails ?? false,
      ]);

      return res.json({
        settings: {
          language: newSettings?.language || 'zh',
          theme: newSettings?.theme || 'light',
          timezone: newSettings?.timezone || 'Asia/Shanghai',
          emailNotifications: newSettings?.email_notifications ?? true,
          marketingEmails: newSettings?.marketing_emails ?? false,
        },
      });
    }

    return res.json({
      settings: {
        language: settings.language,
        theme: settings.theme,
        timezone: settings.timezone,
        emailNotifications: settings.email_notifications,
        marketingEmails: settings.marketing_emails,
      },
    });
  } catch (error: any) {
    console.error('[Settings] Update settings error:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
