import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, getBakeryForUser } from '../db/index.js';
import { authMiddleware, generateToken, AuthRequest } from '../middleware/auth.js';
import { requireAdmin, requireAuth } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);
router.use(requireAdmin);

const db = getDB();

// GET /admin/dashboard
router.get('/dashboard', (req: AuthRequest, res: any) => {
  try {
    // Total bakers
    const totalBakers = db.prepare('SELECT COUNT(*) as count FROM bakeries').get() as any;

    // Active bakers (status = 'active')
    const activeBakers = db.prepare("SELECT COUNT(*) as count FROM bakeries WHERE status = 'active'").get() as any;

    // New bakers this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const newBakersThisMonth = db.prepare(
      `SELECT COUNT(*) as count FROM bakeries WHERE created_at >= ? AND status = 'active'`
    ).get(firstOfMonth.toISOString()) as any;

    // MRR and ARR
    const subscriptionsData = db.prepare(
      `SELECT SUM(monthly_price) as mrr FROM subscriptions WHERE status = 'active'`
    ).get() as any;
    const mrr = subscriptionsData.mrr || 0;
    const arr = mrr * 12;

    // Total orders and revenue across all bakeries
    const orderData = db.prepare(`SELECT COUNT(*) as totalOrders, SUM(total) as totalRevenue FROM orders`).get() as any;

    // Total customers
    const customerData = db.prepare('SELECT COUNT(*) as count FROM customers').get() as any;

    // Tier breakdown
    const tierBreakdown = db.prepare(`
      SELECT
        b.tier,
        COUNT(b.id) as count,
        COALESCE(SUM(s.monthly_price), 0) as revenue
      FROM bakeries b
      LEFT JOIN subscriptions s ON b.id = s.bakery_id
      WHERE s.status = 'active'
      GROUP BY b.tier
    `).all() as any[];

    // Recent activity (last 10 orders)
    const recentActivity = db.prepare(`
      SELECT
        o.id,
        o.order_number,
        o.total,
        o.status,
        o.created_at,
        c.name as customer_name,
        b.name as bakery_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN bakeries b ON o.bakery_id = b.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all() as any[];

    // Growth data (last 12 months)
    const growthData: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const stats = db.prepare(`
        SELECT
          COUNT(DISTINCT b.id) as bakers,
          COUNT(o.id) as orders,
          COALESCE(SUM(o.total), 0) as revenue
        FROM bakeries b
        LEFT JOIN orders o ON b.id = o.bakery_id
          AND strftime('%Y-%m', o.created_at) = ?
        WHERE strftime('%Y-%m', b.created_at) <= ?
      `).get(monthStr, monthStr) as any;

      growthData.push({
        month: monthStr,
        bakers: stats.bakers || 0,
        orders: stats.orders || 0,
        revenue: stats.revenue || 0,
      });
    }

    res.json({
      totalBakers: totalBakers.count,
      activeBakers: activeBakers.count,
      newBakersThisMonth: newBakersThisMonth.count,
      mrr,
      arr,
      totalOrders: orderData.totalOrders || 0,
      totalRevenue: orderData.totalRevenue || 0,
      totalCustomers: customerData.count,
      tierBreakdown,
      recentActivity,
      growthData,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/clients
router.get('/clients', (req: AuthRequest, res: any) => {
  try {
    const search = (req.query.search as string) || '';
    const tier = (req.query.tier as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const offset = (page - 1) * limit;

    // Use subqueries for stats to avoid cartesian product from multiple LEFT JOINs
    let query = `
      SELECT
        u.id, u.email, u.name, u.phone, u.created_at,
        b.id as bakery_id, b.name as bakery_name, b.slug, b.status,
        s.tier, s.status as subscription_status,
        (SELECT COUNT(*) FROM orders WHERE bakery_id = b.id) as total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE bakery_id = b.id) as total_revenue,
        (SELECT COUNT(*) FROM products WHERE bakery_id = b.id) as total_products,
        (SELECT COUNT(*) FROM customers WHERE bakery_id = b.id) as total_customers,
        (SELECT COUNT(*) FROM employees WHERE bakery_id = b.id) as total_employees
      FROM users u
      JOIN bakeries b ON u.id = b.owner_id
      JOIN subscriptions s ON b.id = s.bakery_id
      WHERE u.role = 'baker'
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (tier) {
      query += ` AND s.tier = ?`;
      params.push(tier);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const clients = db.prepare(query).all(...params) as any[];

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM users u JOIN bakeries b ON u.id = b.owner_id JOIN subscriptions s ON b.id = s.bakery_id WHERE u.role = 'baker'`;
    const countParams: any[] = [];

    if (search) {
      countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (tier) {
      countQuery += ` AND s.tier = ?`;
      countParams.push(tier);
    }

    const totalCount = db.prepare(countQuery).get(...countParams) as any;

    res.json({
      clients,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/clients/:id
router.get('/clients/:id', (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;

    const user = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'baker'`).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'Baker not found' });
    }

    const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId) as any;
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE bakery_id = ?').get(bakery.id) as any;

    // Stats
    const orders = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE bakery_id = ?').get(
      bakery.id
    ) as any;
    const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE bakery_id = ?').get(bakery.id) as any;
    const customers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE bakery_id = ?').get(bakery.id) as any;
    const employees = db.prepare('SELECT COUNT(*) as count FROM employees WHERE bakery_id = ?').get(bakery.id) as any;

    // Revenue by month (last 6 months)
    const revenueByMonth: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const monthData = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE bakery_id = ? AND strftime('%Y-%m', created_at) = ?
      `).get(bakery.id, monthStr) as any;

      revenueByMonth.push({
        month: monthStr,
        revenue: monthData.revenue || 0,
      });
    }

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE bakery_id = ?
      GROUP BY status
    `).all(bakery.id) as any[];

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all(bakery.id) as any[];

    // Top customers
    const topCustomers = db.prepare(`
      SELECT c.id, c.name, c.email, c.phone, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.bakery_id = ?
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `).all(bakery.id) as any[];

    // All products
    const productList = db.prepare('SELECT * FROM products WHERE bakery_id = ? ORDER BY created_at DESC').all(bakery.id) as any[];

    res.json({
      user,
      bakery,
      subscription,
      stats: {
        totalOrders: orders.count,
        totalRevenue: orders.revenue,
        totalProducts: products.count,
        totalCustomers: customers.count,
        totalEmployees: employees.count,
      },
      revenueByMonth,
      ordersByStatus,
      recentOrders,
      topCustomers,
      products: productList,
    });
  } catch (err: any) {
    console.error('Get client detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/clients
router.post('/clients', (req: AuthRequest, res: any) => {
  try {
    const { name, email, password, bakeryName, tier, phone } = req.body;

    if (!name || !email || !password || !bakeryName || !tier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = bcryptjs.hashSync(password, 10);
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, email, password, name, role, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, email, hashedPassword, name, 'baker', phone || null, now);

      const bakeryId = uuidv4();
      const slug = bakeryName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      db.prepare(`
        INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bakeryId, userId, bakeryName, slug, phone || null, tier, 'active', now, now);

      const subscriptionId = uuidv4();
      const tierPrices: any = { free: 0, starter: 29, pro: 79, enterprise: 199 };
      const monthlyPrice = tierPrices[tier] || 0;

      db.prepare(`
        INSERT INTO subscriptions (id, bakery_id, tier, status, monthly_price, started_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(subscriptionId, bakeryId, tier, 'active', monthlyPrice, now, now);

      // Create onboarding steps
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

      // Log to audit
      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.user!.id, 'CREATE_CLIENT', 'user', userId, JSON.stringify({ email, name }), now);
    });

    transaction();

    const newUser = db.prepare('SELECT id, email, name, role, phone FROM users WHERE id = ?').get(userId);
    const bakery = getBakeryForUser(userId);

    res.status(201).json({ user: newUser, bakery });
  } catch (err: any) {
    console.error('Create client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/clients/:id
router.put('/clients/:id', (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;
    const { name, email, bakeryName, tier, phone, password, status } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId) as any;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      if (name || email || phone) {
        let updateQuery = 'UPDATE users SET ';
        const updates: any[] = [];

        if (name) {
          updateQuery += 'name = ?, ';
          updates.push(name);
        }
        if (email) {
          updateQuery += 'email = ?, ';
          updates.push(email);
        }
        if (password) {
          updateQuery += 'password = ?, ';
          updates.push(bcryptjs.hashSync(password, 10));
        }
        if (phone !== undefined) {
          updateQuery += 'phone = ?, ';
          updates.push(phone || null);
        }

        updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
        updates.push(userId);
        db.prepare(updateQuery).run(...updates);
      }

      if (bakeryName || phone !== undefined) {
        let bakeryUpdate = 'UPDATE bakeries SET ';
        const bakeryUpdates: any[] = [];

        if (bakeryName) {
          bakeryUpdate += 'name = ?, ';
          bakeryUpdates.push(bakeryName);
        }
        if (phone !== undefined) {
          bakeryUpdate += 'phone = ?, ';
          bakeryUpdates.push(phone || null);
        }

        bakeryUpdate += 'updated_at = ? WHERE id = ?';
        bakeryUpdates.push(now, bakery.id);
        db.prepare(bakeryUpdate).run(...bakeryUpdates);
      }

      if (status) {
        db.prepare('UPDATE bakeries SET status = ?, updated_at = ? WHERE id = ?').run(status, now, bakery.id);
      }

      if (tier) {
        const tierPrices: any = { free: 0, starter: 29, pro: 79, enterprise: 199 };
        const monthlyPrice = tierPrices[tier] || 0;
        db.prepare(
          'UPDATE subscriptions SET tier = ?, monthly_price = ? WHERE bakery_id = ?'
        ).run(tier, monthlyPrice, bakery.id);
        db.prepare('UPDATE bakeries SET tier = ? WHERE id = ?').run(tier, bakery.id);
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        req.user!.id,
        'UPDATE_CLIENT',
        'user',
        userId,
        JSON.stringify({ name, email, tier, status }),
        now
      );
    });

    transaction();

    const updatedUser = db.prepare('SELECT id, email, name, role, phone FROM users WHERE id = ?').get(userId);
    const updatedBakery = getBakeryForUser(userId);

    res.json({ user: updatedUser, bakery: updatedBakery });
  } catch (err: any) {
    console.error('Update client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/clients/:id
router.delete('/clients/:id', (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId) as any;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      // Delete bakery and cascade (due to FK constraints)
      if (bakery) {
        db.prepare('DELETE FROM bakeries WHERE id = ?').run(bakery.id);
      }

      // Delete user
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      // Log to audit
      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.user!.id, 'DELETE_CLIENT', 'user', userId, JSON.stringify({ email: user.email }), now);
    });

    transaction();

    res.json({ message: 'Client deleted' });
  } catch (err: any) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/clients/:id/impersonate
router.post('/clients/:id/impersonate', (req: AuthRequest, res: any) => {
  try {
    const userId = req.params.id as string;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user || user.role !== 'baker') {
      return res.status(404).json({ error: 'Baker not found' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user!.id, 'IMPERSONATE', 'user', userId, JSON.stringify({ email: user.email }), now);

    const token = generateToken(user.id, user.email, user.name, user.role);
    const bakery = getBakeryForUser(user.id);

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, bakery });
  } catch (err: any) {
    console.error('Impersonate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/analytics
router.get('/analytics', (req: AuthRequest, res: any) => {
  try {
    // Daily orders (last 30 days)
    const dailyOrders: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const data = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE DATE(created_at) = ?
      `).get(dateStr) as any;

      dailyOrders.push({
        date: dateStr,
        count: data.count,
        revenue: data.revenue || 0,
      });
    }

    // Top bakers by revenue
    const topBakers = db.prepare(`
      SELECT u.name, b.name as bakery_name, COALESCE(SUM(o.total), 0) as revenue, COUNT(o.id) as order_count
      FROM users u
      JOIN bakeries b ON u.id = b.owner_id
      LEFT JOIN orders o ON b.id = o.bakery_id
      WHERE u.role = 'baker'
      GROUP BY u.id, b.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all() as any[];

    // Top products across all bakeries
    const topProducts = db.prepare(`
      SELECT p.name, b.name as bakery_name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue, SUM(oi.quantity) as quantity
      FROM products p
      JOIN bakeries b ON p.bakery_id = b.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, b.id
      ORDER BY revenue DESC
      LIMIT 10
    `).all() as any[];

    // Customer growth (last 12 months)
    const customerGrowth: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const data = db.prepare(`
        SELECT
          COUNT(DISTINCT CASE WHEN strftime('%Y-%m', c.created_at) = ? THEN c.id END) as new_customers,
          COUNT(DISTINCT c.id) as total_customers
        FROM customers c
        WHERE strftime('%Y-%m', c.created_at) <= ?
      `).get(monthStr, monthStr) as any;

      customerGrowth.push({
        month: monthStr,
        newCustomers: data.new_customers || 0,
        totalCustomers: data.total_customers || 0,
      });
    }

    // Churn rate
    const churnedBakeries = db.prepare(
      "SELECT COUNT(*) as count FROM bakeries WHERE status = 'churned'"
    ).get() as any;
    const totalBakeries = db.prepare('SELECT COUNT(*) as count FROM bakeries').get() as any;
    const churnRate = totalBakeries.count > 0 ? (churnedBakeries.count / totalBakeries.count) * 100 : 0;

    // Retention by month
    const retentionByMonth: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const retained = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) <= ? AND status != 'churned'
      `).get(monthStr) as any;

      const churned = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) <= ? AND status = 'churned'
      `).get(monthStr) as any;

      retentionByMonth.push({
        month: monthStr,
        retained: retained.count || 0,
        churned: churned.count || 0,
      });
    }

    res.json({
      dailyOrders,
      topBakers,
      topProducts,
      customerGrowth,
      churnRate: parseFloat(churnRate.toFixed(2)),
      retentionByMonth,
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/subscriptions
router.get('/subscriptions', (req: AuthRequest, res: any) => {
  try {
    const status = (req.query.status as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        s.*,
        b.name as bakery_name, b.slug,
        u.name, u.email
      FROM subscriptions s
      JOIN bakeries b ON s.bakery_id = b.id
      JOIN users u ON b.owner_id = u.id
    `;

    const params: any[] = [];

    if (status) {
      query += ` WHERE s.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const subscriptions = db.prepare(query).all(...params) as any[];

    let countQuery = 'SELECT COUNT(*) as count FROM subscriptions';
    if (status) {
      countQuery += ` WHERE status = ?`;
    }

    const totalCount = db.prepare(countQuery).get(...(status ? [status] : [])) as any;

    res.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get subscriptions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/subscriptions/:id
router.put('/subscriptions/:id', (req: AuthRequest, res: any) => {
  try {
    const subscriptionId = req.params.id;
    const { tier, status } = req.body;

    const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId) as any;

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const tierPrices: any = { free: 0, starter: 29, pro: 79, enterprise: 199 };
    const monthlyPrice = tierPrices[tier] || subscription.monthly_price;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE subscriptions SET tier = ?, status = ?, monthly_price = ? WHERE id = ?
      `).run(tier || subscription.tier, status || subscription.status, monthlyPrice, subscriptionId);

      if (tier) {
        db.prepare('UPDATE bakeries SET tier = ? WHERE id = ?').run(tier, subscription.bakery_id);
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        req.user!.id,
        'UPDATE_SUBSCRIPTION',
        'subscription',
        subscriptionId,
        JSON.stringify({ tier, status }),
        now
      );
    });

    transaction();

    const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/onboarding
router.get('/onboarding', (req: AuthRequest, res: any) => {
  try {
    const bakeries = db.prepare(`
      SELECT
        b.id, b.name, b.slug, b.created_at,
        COUNT(os.id) as total_steps,
        COUNT(CASE WHEN os.completed = 1 THEN 1 END) as completed_steps
      FROM bakeries b
      LEFT JOIN onboarding_steps os ON b.id = os.bakery_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all() as any[];

    const detailed = bakeries.map((b: any) => ({
      bakery_id: b.id,
      bakery_name: b.name,
      slug: b.slug,
      created_at: b.created_at,
      completion_percent: b.total_steps > 0 ? Math.round((b.completed_steps / b.total_steps) * 100) : 0,
      steps: db
        .prepare('SELECT step, completed, completed_at FROM onboarding_steps WHERE bakery_id = ?')
        .all(b.id) as any[],
    }));

    res.json({ bakeries: detailed });
  } catch (err: any) {
    console.error('Get onboarding error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/audit-log
router.get('/audit-log', (req: AuthRequest, res: any) => {
  try {
    const action = (req.query.action as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        al.*,
        u.name, u.email
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
    `;

    const params: any[] = [];

    if (action) {
      query += ` WHERE al.action = ?`;
      params.push(action);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params) as any[];

    let countQuery = 'SELECT COUNT(*) as count FROM audit_log';
    if (action) {
      countQuery += ` WHERE action = ?`;
    }

    const totalCount = db.prepare(countQuery).get(...(action ? [action] : [])) as any;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get audit log error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/announcements
router.post('/announcements', (req: AuthRequest, res: any) => {
  try {
    const { title, message, target_tiers } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    const announcementId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO announcements (id, author_id, title, message, target_tiers, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      announcementId,
      req.user!.id,
      title,
      message,
      target_tiers ? JSON.stringify(target_tiers) : null,
      1,
      now
    );

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);

    res.status(201).json(announcement);
  } catch (err: any) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/announcements
router.get('/announcements', (req: AuthRequest, res: any) => {
  try {
    const announcements = db
      .prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC')
      .all() as any[];

    res.json({ announcements });
  } catch (err: any) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/announcements/:id (toggle active, update)
router.put('/announcements/:id', (req: AuthRequest, res: any) => {
  try {
    const announcementId = req.params.id;
    const { is_active, title, message, target_tiers } = req.body;

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (is_active !== undefined) {
      db.prepare('UPDATE announcements SET is_active = ? WHERE id = ?').run(is_active, announcementId);
    }
    if (title) {
      db.prepare('UPDATE announcements SET title = ? WHERE id = ?').run(title, announcementId);
    }
    if (message) {
      db.prepare('UPDATE announcements SET message = ? WHERE id = ?').run(message, announcementId);
    }
    if (target_tiers) {
      db.prepare('UPDATE announcements SET target_tiers = ? WHERE id = ?').run(target_tiers, announcementId);
    }

    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
    res.json(updated);
  } catch (err: any) {
    console.error('Update announcement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/announcements/:id
router.delete('/announcements/:id', (req: AuthRequest, res: any) => {
  try {
    const announcementId = req.params.id;

    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    db.prepare('DELETE FROM announcements WHERE id = ?').run(announcementId);

    res.json({ message: 'Announcement deleted' });
  } catch (err: any) {
    console.error('Delete announcement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/settings
router.get('/settings', (req: AuthRequest, res: any) => {
  try {
    const tierPrices = {
      free: 0,
      starter: 29,
      pro: 79,
      enterprise: 199,
    };

    const features = db.prepare('SELECT * FROM features ORDER BY tier_required, category').all() as any[];

    res.json({
      tierPrices,
      features,
    });
  } catch (err: any) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/settings
router.put('/settings', (req: AuthRequest, res: any) => {
  try {
    const { tierPrices, features } = req.body;
    const now = new Date().toISOString();

    const transaction = db.transaction(() => {
      if (features && Array.isArray(features)) {
        for (const feature of features) {
          const existing = db.prepare('SELECT id FROM features WHERE slug = ?').get(feature.slug);

          if (existing) {
            db.prepare(
              'UPDATE features SET name = ?, description = ?, tier_required = ? WHERE slug = ?'
            ).run(feature.name, feature.description, feature.tier_required, feature.slug);
          } else {
            db.prepare(`
              INSERT INTO features (id, name, slug, description, tier_required, category, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              feature.name,
              feature.slug,
              feature.description,
              feature.tier_required,
              feature.category || 'general',
              now
            );
          }
        }
      }

      db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        req.user!.id,
        'UPDATE_SETTINGS',
        'settings',
        'platform',
        JSON.stringify({ tierPrices, features: features || [] }),
        now
      );
    });

    transaction();

    res.json({ message: 'Settings updated' });
  } catch (err: any) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
