import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db/index.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import bakerRoutes from './routes/baker.js';
import mobileRoutes from './routes/mobile.js';
import subscriptionRoutes from './routes/subscriptions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(cors());
app.use(express.json());

// Initialize database
initDB();

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/baker', bakerRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Serve static client in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback — ONLY for non-API routes
app.get('*', (req: express.Request, res: express.Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Error handler (MUST have 4 params for Express to recognize it)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Juma Boss v2 server running on port ${PORT}`);
});
