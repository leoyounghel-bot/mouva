import { Router, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { uploadTemplate, downloadTemplate, deleteTemplate } from '../config/r2';

const router = Router();

// All session routes require authentication
router.use(authMiddleware);

interface Session {
  id: string;
  user_id: string;
  title: string;
  messages: any[];
  template_snapshot: any;
  r2_template_key: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/sessions
 * Get all sessions for the authenticated user
 * User isolation: Only returns sessions where user_id matches the authenticated user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = await query<Session>(
      `SELECT id, title, messages, template_snapshot, r2_template_key, created_at, updated_at 
       FROM sessions 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [req.userId]
    );

    return res.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title || getSessionTitle(s.messages),
        messages: s.messages,
        templateSnapshot: s.template_snapshot,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error: any) {
    console.error('[Sessions] Get sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sessions/:id
 * Get a single session
 * User isolation: Verifies the session belongs to the authenticated user
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // User isolation: Only select if user_id matches
    const session = await queryOne<Session>(
      `SELECT id, title, messages, template_snapshot, r2_template_key, created_at, updated_at 
       FROM sessions 
       WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If template is stored in R2, download it
    let templateSnapshot = session.template_snapshot;
    if (session.r2_template_key && !templateSnapshot) {
      templateSnapshot = await downloadTemplate(session.r2_template_key);
    }

    return res.json({
      session: {
        id: session.id,
        title: session.title || getSessionTitle(session.messages),
        messages: session.messages,
        templateSnapshot,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Sessions] Get session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, messages, templateSnapshot } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Store large templates in R2
    let r2TemplateKey: string | null = null;
    let templateToStore = templateSnapshot;
    
    if (templateSnapshot && JSON.stringify(templateSnapshot).length > 50000) {
      // Large template - store in R2
      const sessionId = `temp-${Date.now()}`;
      r2TemplateKey = await uploadTemplate(req.userId!, sessionId, templateSnapshot);
      templateToStore = null; // Don't store in database
    }

    const session = await queryOne<Session>(
      `INSERT INTO sessions (user_id, title, messages, template_snapshot, r2_template_key) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, title, messages, template_snapshot, r2_template_key, created_at, updated_at`,
      [req.userId, title || '', JSON.stringify(messages), templateToStore ? JSON.stringify(templateToStore) : null, r2TemplateKey]
    );

    if (!session) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    return res.status(201).json({
      session: {
        id: session.id,
        title: session.title || getSessionTitle(session.messages),
        messages: session.messages,
        templateSnapshot: templateSnapshot, // Return original, not null
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Sessions] Create session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/sessions/:id
 * Update an existing session
 * User isolation: Verifies the session belongs to the authenticated user
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, messages, templateSnapshot } = req.body;

    // First verify ownership
    const existing = await queryOne<Session>(
      'SELECT id, r2_template_key FROM sessions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Handle template storage
    let r2TemplateKey = existing.r2_template_key;
    let templateToStore = templateSnapshot;
    
    const templateSize = templateSnapshot ? JSON.stringify(templateSnapshot).length : 0;
    
    if (templateSnapshot && templateSize > 50000) {
      // Large template - store in R2
      // Delete old R2 object if exists (to replace with new one)
      if (r2TemplateKey) {
        try {
          await deleteTemplate(r2TemplateKey);
        } catch (e) {
          console.warn('[Sessions] Failed to delete old R2 template:', e);
        }
      }
      r2TemplateKey = await uploadTemplate(req.userId!, id, templateSnapshot);
      templateToStore = null; // Don't store in database
      console.log(`[Sessions] Large template (${Math.round(templateSize / 1024)}KB) stored in R2: ${r2TemplateKey}`);
    } else if (templateSnapshot && templateSize <= 50000) {
      // Small template - store in database
      if (r2TemplateKey) {
        // Delete R2 object since we're now storing in DB
        try {
          await deleteTemplate(r2TemplateKey);
          console.log(`[Sessions] Template reduced in size, deleted R2 and storing in DB`);
        } catch (e) {
          console.warn('[Sessions] Failed to delete old R2 template:', e);
        }
        r2TemplateKey = null;
      }
      // templateToStore remains as templateSnapshot
    }

    const session = await queryOne<Session>(
      `UPDATE sessions 
       SET title = COALESCE($1, title), 
           messages = COALESCE($2, messages), 
           template_snapshot = $3,
           r2_template_key = $4
       WHERE id = $5 AND user_id = $6
       RETURNING id, title, messages, template_snapshot, r2_template_key, created_at, updated_at`,
      [
        title, 
        messages ? JSON.stringify(messages) : null, 
        templateToStore ? JSON.stringify(templateToStore) : null,
        r2TemplateKey,
        id, 
        req.userId
      ]
    );

    if (!session) {
      return res.status(500).json({ error: 'Failed to update session' });
    }

    return res.json({
      session: {
        id: session.id,
        title: session.title || getSessionTitle(session.messages),
        messages: session.messages,
        templateSnapshot: templateSnapshot,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
    });
  } catch (error: any) {
    console.error('[Sessions] Update session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session
 * User isolation: Verifies the session belongs to the authenticated user
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First get the session to check R2 key
    const session = await queryOne<Session>(
      'SELECT r2_template_key FROM sessions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete from R2 if exists
    if (session.r2_template_key) {
      try {
        await deleteTemplate(session.r2_template_key);
      } catch (e) {
        console.warn('[Sessions] Failed to delete R2 template:', e);
      }
    }

    // Delete from database (user_id check for extra safety)
    await query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Sessions] Delete session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper: Generate session title from first user message
 */
function getSessionTitle(messages: any[]): string {
  if (!messages || !Array.isArray(messages)) return 'Untitled Session';
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg && firstUserMsg.content) {
    const content = firstUserMsg.content;
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  }
  return 'Untitled Session';
}

export default router;
