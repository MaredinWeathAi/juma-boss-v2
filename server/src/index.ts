import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, getDB } from './db/index.js';
import { seedDatabase } from './db/seed.js';
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

// Auto-seed if database is empty OR if named demo accounts are missing (force re-seed)
try {
  const db = getDB();
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    console.log('Empty database detected — running auto-seed...');
    seedDatabase();
    console.log('Database seeded successfully on startup.');
  } else {
    // Check if pricing is current (2x MRR update) — if starter subs still have old price, re-seed
    const pricingCurrent = db.prepare("SELECT id FROM subscriptions WHERE tier = 'starter' AND monthly_price = 30 LIMIT 1").get();
    if (!pricingCurrent) {
      console.log('Pricing outdated — dropping all data and re-seeding...');
      // Drop all tables and re-create via initDB
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'").all() as any[];
      for (const t of tables) {
        db.prepare(`DROP TABLE IF EXISTS "${t.name}"`).run();
      }
      console.log(`Dropped ${tables.length} tables.`);
      initDB();
      seedDatabase();
      console.log('Database re-seeded successfully with named demo accounts.');
    } else {
      console.log(`Database has ${userCount.count} users (demo accounts present) — skipping seed.`);
    }
  }
} catch (err) {
  console.error('Auto-seed check failed:', err);
}

// Health check (before auth middleware)
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  try {
    const db = getDB();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const clientDistPath = path.join(__dirname, '../../client/dist');
    const clientExists = fs.existsSync(path.join(clientDistPath, 'index.html'));
    res.json({
      status: 'ok',
      port: PORT,
      users: userCount.count,
      clientDist: clientExists,
      clientPath: clientDistPath,
      cwd: process.cwd(),
      dirname: __dirname,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

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
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).json({
      error: 'Client build not found',
      expected: indexPath,
      cwd: process.cwd(),
      dirname: __dirname,
    });
  }
});

// Error handler (MUST have 4 params for Express to recognize it)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Juma Boss v2 server running on port ${PORT}`);
});
