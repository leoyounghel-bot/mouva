import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import verificationRoutes from './routes/verification';
import magicRoutes from './routes/magic';
import sessionsRoutes from './routes/sessions';
import subscriptionRoutes from './routes/subscription';
import settingsRoutes from './routes/settings';
import paymentsRoutes from './routes/payments';
import convertRoutes from './routes/convert';

const app = express();
const PORT = process.env.PORT || 5800;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5177',
  'http://localhost:5173',
  'http://localhost:5801',
  'https://mouva.ai',
  'https://www.mouva.ai',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check exact match or allowed patterns
    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.mouva.ai')
    ) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24 hours
}));
// Capture raw body for webhook signature verification
app.use(express.json({ 
  limit: '50mb',
  verify: (req: any, res, buf) => {
    // Store raw body for webhook routes that need signature verification
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// API Routes - Mount at both /api and root / to be flexible
const mountRoutes = (prefix: string = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/auth/oauth`, oauthRoutes);
  app.use(`${prefix}/auth/code`, verificationRoutes);
  app.use(`${prefix}/auth/magic`, magicRoutes);
  app.use(`${prefix}/sessions`, sessionsRoutes);
  app.use(`${prefix}/subscription`, subscriptionRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
  app.use(`${prefix}/payments`, paymentsRoutes);
  app.use(`${prefix}/convert`, convertRoutes);
};

mountRoutes('/api');
mountRoutes(); // Fallback for requests without /api prefix

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Mouva API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
