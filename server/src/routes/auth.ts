import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, getBakeryForUser } from '../db/index.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';
import { requireAuth } from '../middleware/rbac.js';

const router = Router();
const db = getDB();

// POST /api/auth/register
router.post('/register', (req: any, res: any) => {
  try {
    const { email, password, name, bakeryName, phone } = req.body;

    if (!email || !password || !name || !bakeryName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userId = uuidv4();
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const now = new Date().toISOString();

    // Start transaction
    const transaction = db.transaction(() => {
      // Create user
      db.prepare(`
        INSERT INTO users (id, email, password, name, role, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, email, hashedPassword, name, 'baker', phone || null, now);

      // Create bakery
      const bakeryId = uuidv4();
      const slug = bakeryName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      db.prepare(`
        INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bakeryId, userId, bakeryName, slug, phone || null, 'free', 'active', now, now);

      // Create subscription
      const subscriptionId = uuidv4();
      db.prepare(`
        INSERT INTO subscriptions (id, bakery_id, tier, status, monthly_price, started_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(subscriptionId, bakeryId, 'free', 'active', 0, now, now);

      // Create default onboarding steps
      const steps = [
        'profile_setup',
        'add_products',
        'add_customers',
        'create_first_order',
        'team_setup',
      ];
      for (const step of steps) {
        db.prepare(`
          INSERT INTO onboarding_steps (id, bakery_id, step, completed)
          VALUES (?, ?, ?, ?)
        `).run(uuidv4(), bakeryId, step, 0);
      }
    });

    transaction();

    const token = generateToken(userId, email, name, 'baker');
    const bakery = getBakeryForUser(userId);

    res.status(201).json({
      token,
      user: { id: userId, email, name, role: 'baker' },
      bakery,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = bcryptjs.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    const token = generateToken(user.id, user.email, user.name, user.role);

    let bakery = null;
    if (user.role === 'baker') {
      bakery = getBakeryForUser(user.id);
    }

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      bakery,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, requireAuth, (req: AuthRequest, res: any) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, phone, avatar_url FROM users WHERE id = ?').get(
      req.user!.id
    ) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let bakery = null;
    if (user.role === 'baker') {
      bakery = getBakeryForUser(user.id);
    }

    res.json({
      user,
      bakery,
    });
  } catch (err: any) {
    console.error('Me error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
