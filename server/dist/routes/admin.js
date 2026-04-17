import { Router } from 'express';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, getBakeryForUser } from '../db/index.js';
import { authMiddleware, generateToken } from '../middleware/auth.js';
import { requireAdmin, requireAuth } from '../middleware/rbac.js';
const router = Router();
router.use(authMiddleware);
router.use(requireAuth);
router.use(requireAdmin);
const db = getDB();
// GET /admin/dashboard
router.get('/dashboard', (req, res) => {
    try {
        // Total bakers
        const totalBakers = db.prepare('SELECT COUNT(*) as count FROM bakeries').get();
        // Active bakers (status = 'active')
        const activeBakers = db.prepare("SELECT COUNT(*) as count FROM bakeries WHERE status = 'active'").get();
        // New bakers this month
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        const newBakersThisMonth = db.prepare(`SELECT COUNT(*) as count FROM bakeries WHERE created_at >= ? AND status = 'active'`).get(firstOfMonth.toISOString());
        // MRR and ARR (include both active and trialing)
        const subscriptionsData = db.prepare(`SELECT SUM(monthly_price) as mrr FROM subscriptions WHERE status IN ('active', 'trialing')`).get();
        const mrr = subscriptionsData.mrr || 0;
        const arr = mrr * 12;
        // Total orders and revenue across all bakeries (exclude cancelled)
        const orderData = db.prepare(`SELECT COUNT(*) as totalOrders, COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status != 'cancelled'`).get();
        // Total customers
        const customerData = db.prepare('SELECT COUNT(*) as count FROM customers').get();
        // Tier breakdown (include trialing subscriptions)
        const tierBreakdown = db.prepare(`
      SELECT
        b.tier,
        COUNT(b.id) as count,
        COALESCE(SUM(s.monthly_price), 0) as revenue
      FROM bakeries b
      LEFT JOIN subscriptions s ON b.id = s.bakery_id
      WHERE s.status IN ('active', 'trialing')
      GROUP BY b.tier
    `).all();
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
    `).all();
        // Growth data (last 12 months)
        const growthData = [];
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
          AND o.status != 'cancelled'
        WHERE strftime('%Y-%m', b.created_at) <= ?
      `).get(monthStr, monthStr);
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
    }
    catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/clients
router.get('/clients', (req, res) => {
    try {
        const search = req.query.search || '';
        const tier = req.query.tier || '';
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
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
        const params = [];
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
        const clients = db.prepare(query).all(...params);
        // Get total count
        let countQuery = `SELECT COUNT(*) as count FROM users u JOIN bakeries b ON u.id = b.owner_id JOIN subscriptions s ON b.id = s.bakery_id WHERE u.role = 'baker'`;
        const countParams = [];
        if (search) {
            countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ?)`;
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        if (tier) {
            countQuery += ` AND s.tier = ?`;
            countParams.push(tier);
        }
        const totalCount = db.prepare(countQuery).get(...countParams);
        res.json({
            clients,
            pagination: {
                page,
                limit,
                total: totalCount.count,
                pages: Math.ceil(totalCount.count / limit),
            },
        });
    }
    catch (err) {
        console.error('Get clients error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/clients/:id
router.get('/clients/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare(`SELECT * FROM users WHERE id = ? AND role = 'baker'`).get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Baker not found' });
        }
        const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId);
        const subscription = db.prepare('SELECT * FROM subscriptions WHERE bakery_id = ?').get(bakery.id);
        // Stats
        const orders = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE bakery_id = ?').get(bakery.id);
        const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE bakery_id = ?').get(bakery.id);
        const customers = db.prepare('SELECT COUNT(*) as count FROM customers WHERE bakery_id = ?').get(bakery.id);
        const employees = db.prepare('SELECT COUNT(*) as count FROM employees WHERE bakery_id = ?').get(bakery.id);
        const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE bakery_id = ? AND status = 'pending'").get(bakery.id);
        // Monthly revenue (current month)
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthlyRevenueData = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE bakery_id = ? AND strftime('%Y-%m', created_at) = ?
    `).get(bakery.id, currentMonthStr);
        // Revenue by month (last 6 months)
        const revenueByMonth = [];
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
      `).get(bakery.id, monthStr);
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
    `).all(bakery.id);
        // Recent orders
        const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ?
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all(bakery.id);
        // Top customers
        const topCustomers = db.prepare(`
      SELECT c.id, c.name, c.email, c.phone, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE c.bakery_id = ?
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `).all(bakery.id);
        // All products
        const productList = db.prepare('SELECT * FROM products WHERE bakery_id = ? ORDER BY created_at DESC').all(bakery.id);
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
                pendingOrders: pendingOrders.count,
                monthlyRevenue: monthlyRevenueData.revenue || 0,
            },
            revenueByMonth,
            ordersByStatus,
            recentOrders,
            topCustomers,
            products: productList,
        });
    }
    catch (err) {
        console.error('Get client detail error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /admin/clients
router.post('/clients', (req, res) => {
    try {
        const { name, email, password, bakeryName, bakery_name, tier, phone } = req.body;
        const resolvedBakeryName = bakeryName || bakery_name;
        if (!name || !email || !password || !resolvedBakeryName || !tier) {
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
            const slug = resolvedBakeryName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            db.prepare(`
        INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bakeryId, userId, resolvedBakeryName, slug, phone || null, tier, 'active', now, now);
            const subscriptionId = uuidv4();
            const tierPrices = { free: 0, starter: 15, pro: 29, enterprise: 49 };
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
      `).run(uuidv4(), req.user.id, 'CREATE_CLIENT', 'user', userId, JSON.stringify({ email, name }), now);
        });
        transaction();
        const newUser = db.prepare('SELECT id, email, name, role, phone FROM users WHERE id = ?').get(userId);
        const bakery = getBakeryForUser(userId);
        res.status(201).json({ user: newUser, bakery });
    }
    catch (err) {
        console.error('Create client error:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /admin/clients/:id
router.put('/clients/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, bakeryName, tier, phone, password, status } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId);
        const now = new Date().toISOString();
        const transaction = db.transaction(() => {
            if (name || email || phone) {
                let updateQuery = 'UPDATE users SET ';
                const updates = [];
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
                const bakeryUpdates = [];
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
                const tierPrices = { free: 0, starter: 15, pro: 29, enterprise: 49 };
                const monthlyPrice = tierPrices[tier] || 0;
                db.prepare('UPDATE subscriptions SET tier = ?, monthly_price = ? WHERE bakery_id = ?').run(tier, monthlyPrice, bakery.id);
                db.prepare('UPDATE bakeries SET tier = ? WHERE id = ?').run(tier, bakery.id);
            }
            db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.user.id, 'UPDATE_CLIENT', 'user', userId, JSON.stringify({ name, email, tier, status }), now);
        });
        transaction();
        const updatedUser = db.prepare('SELECT id, email, name, role, phone FROM users WHERE id = ?').get(userId);
        const updatedBakery = getBakeryForUser(userId);
        res.json({ user: updatedUser, bakery: updatedBakery });
    }
    catch (err) {
        console.error('Update client error:', err);
        res.status(500).json({ error: err.message });
    }
});
// DELETE /admin/clients/:id
router.delete('/clients/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const bakery = db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId);
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
      `).run(uuidv4(), req.user.id, 'DELETE_CLIENT', 'user', userId, JSON.stringify({ email: user.email }), now);
        });
        transaction();
        res.json({ message: 'Client deleted' });
    }
    catch (err) {
        console.error('Delete client error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /admin/clients/:id/impersonate
router.post('/clients/:id/impersonate', (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user || user.role !== 'baker') {
            return res.status(404).json({ error: 'Baker not found' });
        }
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, 'IMPERSONATE', 'user', userId, JSON.stringify({ email: user.email }), now);
        const token = generateToken(user.id, user.email, user.name, user.role);
        const bakery = getBakeryForUser(user.id);
        res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role }, bakery });
    }
    catch (err) {
        console.error('Impersonate error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/analytics
router.get('/analytics', (req, res) => {
    try {
        // Daily orders (last 30 days)
        const dailyOrders = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const data = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
        FROM orders
        WHERE DATE(created_at) = ?
      `).get(dateStr);
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
    `).all();
        // Top products across all bakeries
        const topProducts = db.prepare(`
      SELECT p.name, b.name as bakery_name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue, SUM(oi.quantity) as quantity
      FROM products p
      JOIN bakeries b ON p.bakery_id = b.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id, b.id
      ORDER BY revenue DESC
      LIMIT 10
    `).all();
        // Customer growth (last 12 months)
        const customerGrowth = [];
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
      `).get(monthStr, monthStr);
            customerGrowth.push({
                month: monthStr,
                newCustomers: data.new_customers || 0,
                totalCustomers: data.total_customers || 0,
            });
        }
        // Churn rate
        const churnedBakeries = db.prepare("SELECT COUNT(*) as count FROM bakeries WHERE status = 'churned'").get();
        const totalBakeries = db.prepare('SELECT COUNT(*) as count FROM bakeries').get();
        const churnRate = totalBakeries.count > 0 ? (churnedBakeries.count / totalBakeries.count) * 100 : 0;
        // Retention by month
        const retentionByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthStr = `${year}-${month}`;
            const retained = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) <= ? AND status != 'churned'
      `).get(monthStr);
            const churned = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) <= ? AND status = 'churned'
      `).get(monthStr);
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
    }
    catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/subscriptions
router.get('/subscriptions', (req, res) => {
    try {
        const status = req.query.status || '';
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const offset = (page - 1) * limit;
        let query = `
      SELECT
        s.*,
        b.name as bakery_name, b.slug,
        u.name as owner_name, u.email as owner_email
      FROM subscriptions s
      JOIN bakeries b ON s.bakery_id = b.id
      JOIN users u ON b.owner_id = u.id
    `;
        const params = [];
        if (status) {
            query += ` WHERE s.status = ?`;
            params.push(status);
        }
        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const subscriptions = db.prepare(query).all(...params);
        let countQuery = 'SELECT COUNT(*) as count FROM subscriptions';
        if (status) {
            countQuery += ` WHERE status = ?`;
        }
        const totalCount = db.prepare(countQuery).get(...(status ? [status] : []));
        // Get summary stats
        const totalActive = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").get();
        const totalTrialing = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'trialing'").get();
        const totalPastDue = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'past_due'").get();
        const totalCancelled = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled'").get();
        const totalMrr = db.prepare("SELECT COALESCE(SUM(monthly_price), 0) as total FROM subscriptions WHERE status IN ('active', 'trialing')").get();
        res.json({
            subscriptions,
            summary: {
                total_active: totalActive.count,
                total_trialing: totalTrialing.count,
                total_past_due: totalPastDue.count,
                total_cancelled: totalCancelled.count,
                total_mrr: totalMrr.total || 0,
            },
            pagination: {
                page,
                limit,
                total: totalCount.count,
                pages: Math.ceil(totalCount.count / limit),
            },
        });
    }
    catch (err) {
        console.error('Get subscriptions error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/subscriptions/overview (MUST be before /:id routes)
router.get('/subscriptions/overview', (req, res) => {
    try {
        const active = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").get();
        const trialing = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'trialing'").get();
        const past_due = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'past_due'").get();
        const cancelled = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'cancelled'").get();
        const mrr = db.prepare("SELECT SUM(monthly_price) as total FROM subscriptions WHERE status IN ('active', 'trialing')").get();
        const failedPayments = db.prepare("SELECT COUNT(*) as count FROM billing_history WHERE status = 'failed'").get();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const upcomingRenewals = db.prepare(`
      SELECT
        s.id, s.tier, s.monthly_price,
        b.name as bakery_name,
        u.name as owner_name,
        s.current_period_end
      FROM subscriptions s
      JOIN bakeries b ON s.bakery_id = b.id
      JOIN users u ON b.owner_id = u.id
      WHERE s.status IN ('active', 'trialing')
        AND s.current_period_end BETWEEN datetime('now') AND ?
      ORDER BY s.current_period_end ASC
      LIMIT 10
    `).all(sevenDaysFromNow.toISOString());
        res.json({
            active: active.count,
            trialing: trialing.count,
            past_due: past_due.count,
            cancelled: cancelled.count,
            mrr: mrr.total || 0,
            failedPayments: failedPayments.count,
            upcomingRenewals,
        });
    }
    catch (err) {
        console.error('Subscriptions overview error:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /admin/subscriptions/:id
router.put('/subscriptions/:id', (req, res) => {
    try {
        const subscriptionId = req.params.id;
        const { tier, status } = req.body;
        const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const tierPrices = { free: 0, starter: 15, pro: 29, enterprise: 49 };
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
      `).run(uuidv4(), req.user.id, 'UPDATE_SUBSCRIPTION', 'subscription', subscriptionId, JSON.stringify({ tier, status }), now);
        });
        transaction();
        const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);
        res.json(updated);
    }
    catch (err) {
        console.error('Update subscription error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/onboarding
router.get('/onboarding', (req, res) => {
    try {
        const bakeries = db.prepare(`
      SELECT
        b.id, b.name, b.slug, b.tier, b.created_at,
        u.name as owner_name,
        COUNT(os.id) as total_steps,
        COUNT(CASE WHEN os.completed = 1 THEN 1 END) as completed_steps
      FROM bakeries b
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN onboarding_steps os ON b.id = os.bakery_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `).all();
        const pipeline = bakeries.map((b) => ({
            bakery_id: b.id,
            bakery_name: b.name,
            owner_name: b.owner_name || b.name,
            tier: b.tier,
            slug: b.slug,
            created_at: b.created_at,
            completion_pct: b.total_steps > 0 ? Math.round((b.completed_steps / b.total_steps) * 100) : 0,
            steps: db
                .prepare('SELECT step, completed, completed_at FROM onboarding_steps WHERE bakery_id = ?')
                .all(b.id),
        }));
        res.json({ pipeline });
    }
    catch (err) {
        console.error('Get onboarding error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/audit-log
router.get('/audit-log', (req, res) => {
    try {
        const action = req.query.action || '';
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '50');
        const offset = (page - 1) * limit;
        let query = `
      SELECT
        al.*,
        u.name, u.email
      FROM audit_log al
      JOIN users u ON al.user_id = u.id
    `;
        const params = [];
        if (action) {
            query += ` WHERE al.action = ?`;
            params.push(action);
        }
        query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const logs = db.prepare(query).all(...params);
        let countQuery = 'SELECT COUNT(*) as count FROM audit_log';
        if (action) {
            countQuery += ` WHERE action = ?`;
        }
        const totalCount = db.prepare(countQuery).get(...(action ? [action] : []));
        res.json({
            logs,
            pagination: {
                page,
                limit,
                total: totalCount.count,
                pages: Math.ceil(totalCount.count / limit),
            },
        });
    }
    catch (err) {
        console.error('Get audit log error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /admin/announcements
router.post('/announcements', (req, res) => {
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
    `).run(announcementId, req.user.id, title, message, target_tiers || null, 1, now);
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
        res.status(201).json(announcement);
    }
    catch (err) {
        console.error('Create announcement error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/announcements
router.get('/announcements', (req, res) => {
    try {
        const announcements = db
            .prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC')
            .all();
        res.json({ announcements });
    }
    catch (err) {
        console.error('Get announcements error:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /admin/announcements/:id (toggle active, update)
router.put('/announcements/:id', (req, res) => {
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
    }
    catch (err) {
        console.error('Update announcement error:', err);
        res.status(500).json({ error: err.message });
    }
});
// DELETE /admin/announcements/:id
router.delete('/announcements/:id', (req, res) => {
    try {
        const announcementId = req.params.id;
        const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        db.prepare('DELETE FROM announcements WHERE id = ?').run(announcementId);
        res.json({ message: 'Announcement deleted' });
    }
    catch (err) {
        console.error('Delete announcement error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/settings
router.get('/settings', (req, res) => {
    try {
        const tierPrices = {
            free: 0,
            starter: 15,
            pro: 29,
            enterprise: 49,
        };
        const features = db.prepare('SELECT * FROM features ORDER BY tier_required, category').all();
        res.json({
            tierPrices,
            features,
        });
    }
    catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: err.message });
    }
});
// PUT /admin/settings
router.put('/settings', (req, res) => {
    try {
        const { tierPrices, features } = req.body;
        const now = new Date().toISOString();
        const transaction = db.transaction(() => {
            if (features && Array.isArray(features)) {
                for (const feature of features) {
                    const existing = db.prepare('SELECT id FROM features WHERE slug = ?').get(feature.slug);
                    if (existing) {
                        db.prepare('UPDATE features SET name = ?, description = ?, tier_required = ? WHERE slug = ?').run(feature.name, feature.description, feature.tier_required, feature.slug);
                    }
                    else {
                        db.prepare(`
              INSERT INTO features (id, name, slug, description, tier_required, category, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), feature.name, feature.slug, feature.description, feature.tier_required, feature.category || 'general', now);
                    }
                }
            }
            db.prepare(`
        INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.user.id, 'UPDATE_SETTINGS', 'settings', 'platform', JSON.stringify({ tierPrices, features: features || [] }), now);
        });
        transaction();
        res.json({ message: 'Settings updated' });
    }
    catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /admin/subscriptions/:id/discount
router.post('/subscriptions/:id/discount', (req, res) => {
    try {
        const subscriptionId = req.params.id;
        const { amount, reason } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid discount amount' });
        }
        const subscription = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const now = new Date().toISOString();
        const discountId = uuidv4();
        db.prepare(`
      INSERT INTO billing_history (id, subscription_id, amount, status, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(discountId, subscriptionId, -amount, 'discount', reason || 'Manual discount applied', now);
        db.prepare(`
      INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, 'APPLY_DISCOUNT', 'subscription', subscriptionId, JSON.stringify({ amount, reason }), now);
        res.json({ message: 'Discount applied successfully' });
    }
    catch (err) {
        console.error('Apply discount error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/financial-reports
router.get('/financial-reports', (req, res) => {
    try {
        // MRR history (last 12 months)
        const mrrHistory = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthStr = `${year}-${month}`;
            // New MRR (subscriptions started this month)
            const newMrr = db.prepare(`
        SELECT COALESCE(SUM(s.monthly_price), 0) as total
        FROM subscriptions s
        WHERE strftime('%Y-%m', s.started_at) = ?
          AND s.status IN ('active', 'trialing')
      `).get(monthStr);
            // Expansion (tier upgrades)
            const expansion = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM billing_history
        WHERE strftime('%Y-%m', created_at) = ?
          AND description LIKE '%upgrade%'
      `).get(monthStr);
            // Contraction (tier downgrades)
            const contraction = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM billing_history
        WHERE strftime('%Y-%m', created_at) = ?
          AND description LIKE '%downgrade%'
      `).get(monthStr);
            // Churn (cancelled subscriptions)
            const churn = db.prepare(`
        SELECT COALESCE(SUM(s.monthly_price), 0) as total
        FROM subscriptions s
        WHERE strftime('%Y-%m', s.updated_at) = ?
          AND s.status = 'cancelled'
      `).get(monthStr);
            const total = (newMrr.total || 0) + (expansion.total || 0) - Math.abs(contraction.total || 0) - (churn.total || 0);
            mrrHistory.push({
                month: monthStr,
                new: newMrr.total || 0,
                expansion: expansion.total || 0,
                contraction: Math.abs(contraction.total || 0),
                churn: churn.total || 0,
                total: Math.max(0, total),
            });
        }
        // Payment method breakdown (use payments table as primary source)
        let paymentMethodRows = db.prepare(`
      SELECT method, COUNT(*) as count
      FROM payments
      WHERE method IS NOT NULL
      GROUP BY method
    `).all();
        // Fallback to billing_history if payments table is empty
        if (paymentMethodRows.length === 0) {
            paymentMethodRows = db.prepare(`
        SELECT payment_method as method, COUNT(*) as count
        FROM billing_history
        WHERE payment_method IS NOT NULL
        GROUP BY payment_method
      `).all();
        }
        const totalPayments = paymentMethodRows.reduce((sum, pm) => sum + pm.count, 0) || 1;
        const paymentMethodsWithPercentage = paymentMethodRows.map((pm) => ({
            method: pm.method,
            count: pm.count,
            percentage: (pm.count / totalPayments) * 100,
        }));
        // Churn trend (last 12 months)
        const churnTrend = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthStr = `${year}-${month}`;
            const currentMonthSubs = db.prepare(`
        SELECT COUNT(*) as count FROM subscriptions
        WHERE strftime('%Y-%m', current_period_end) <= ?
      `).get(monthStr);
            const churnedSubs = db.prepare(`
        SELECT COUNT(*) as count FROM subscriptions
        WHERE status = 'cancelled' AND strftime('%Y-%m', updated_at) = ?
      `).get(monthStr);
            const churnRate = currentMonthSubs.count > 0 ? (churnedSubs.count / currentMonthSubs.count) * 100 : 0;
            churnTrend.push({
                month: monthStr,
                rate: churnRate,
            });
        }
        // LTV by tier (SQLite doesn't have DATEDIFF, use julianday)
        const tierData = db.prepare(`
      SELECT
        b.tier,
        COUNT(DISTINCT b.id) as baker_count,
        AVG(
          CAST((julianday(COALESCE(s.current_period_end, date('now'))) - julianday(s.started_at)) / 30.0 AS REAL)
        ) as avg_duration,
        AVG(s.monthly_price) as avg_price
      FROM bakeries b
      JOIN subscriptions s ON b.id = s.bakery_id
      WHERE s.status IN ('active', 'trialing', 'cancelled')
      GROUP BY b.tier
    `).all();
        const ltvByTier = tierData.map((tier) => ({
            tier: tier.tier,
            avgDuration: tier.avg_duration || 6,
            avgMonthlyPrice: tier.avg_price || 0,
            ltv: (tier.avg_duration || 6) * (tier.avg_price || 0),
        }));
        // Failed payments tracker
        const failedPayments = db.prepare(`
      SELECT
        bh.id,
        b.name as bakery_name,
        u.name as owner_name,
        bh.amount,
        bh.created_at as attempt_date,
        CASE
          WHEN bh.status = 'failed' THEN 'pending'
          ELSE bh.status
        END as retry_status
      FROM billing_history bh
      JOIN subscriptions s ON bh.subscription_id = s.id
      JOIN bakeries b ON s.bakery_id = b.id
      JOIN users u ON b.owner_id = u.id
      WHERE bh.status = 'failed'
      ORDER BY bh.created_at DESC
      LIMIT 20
    `).all();
        res.json({
            mrrHistory,
            paymentMethods: paymentMethodsWithPercentage,
            churnTrend,
            ltvByTier,
            failedPayments,
        });
    }
    catch (err) {
        console.error('Financial reports error:', err);
        res.status(500).json({ error: err.message });
    }
});
// POST /admin/financial-reports/export
router.post('/financial-reports/export', (req, res) => {
    try {
        const { type } = req.body;
        if (!type || !['revenue', 'churn'].includes(type)) {
            return res.status(400).json({ error: 'Invalid report type' });
        }
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO audit_log (id, user_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, 'EXPORT_REPORT', 'financial_report', type, JSON.stringify({ type }), now);
        res.json({ message: `${type} report exported successfully` });
    }
    catch (err) {
        console.error('Export report error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/cost-intelligence - Aggregated cost/margin data across all bakeries
router.get('/cost-intelligence', (req, res) => {
    try {
        // Get all bakeries with their product/recipe data
        const bakeries = db.prepare('SELECT id, name FROM bakeries').all();
        let allProducts = [];
        const bakeryData = [];
        for (const bakery of bakeries) {
            const products = db.prepare('SELECT * FROM products WHERE bakery_id = ?').all(bakery.id);
            let bakeryRevenue = 0;
            let bakeryCOGS = 0;
            let productsWithRecipe = 0;
            const margins = [];
            for (const product of products) {
                const recipeItems = db.prepare(`
          SELECT ri.*, i.cost_per_unit
          FROM recipe_items ri
          JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE ri.product_id = ?
        `).all(product.id);
                let ingredientCost = 0;
                recipeItems.forEach((item) => {
                    ingredientCost += (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
                });
                const hasRecipe = recipeItems.length > 0;
                if (hasRecipe)
                    productsWithRecipe++;
                const effectiveCost = hasRecipe ? ingredientCost : product.cost;
                const margin = product.price > 0 ? ((product.price - effectiveCost) / product.price) * 100 : 0;
                margins.push(margin);
                const sales = db.prepare(`
          SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
                 COALESCE(SUM(oi.quantity), 0) as quantity
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.bakery_id = ? AND oi.product_id = ?
        `).get(bakery.id, product.id);
                bakeryRevenue += sales.revenue;
                bakeryCOGS += sales.quantity * effectiveCost;
                allProducts.push({
                    bakeryId: bakery.id,
                    bakeryName: bakery.name,
                    productName: product.name,
                    category: product.category,
                    price: product.price,
                    effectiveCost,
                    margin,
                    hasRecipe,
                    revenue: sales.revenue,
                    quantitySold: sales.quantity,
                });
            }
            const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
            bakeryData.push({
                id: bakery.id,
                name: bakery.name,
                totalProducts: products.length,
                productsWithRecipe,
                avgMargin,
                revenue: bakeryRevenue,
                cogs: bakeryCOGS,
                grossProfit: bakeryRevenue - bakeryCOGS,
                grossMargin: bakeryRevenue > 0 ? ((bakeryRevenue - bakeryCOGS) / bakeryRevenue) * 100 : 0,
            });
        }
        // Category benchmarks across all bakeries
        const categoryMap = new Map();
        allProducts.forEach(p => {
            const cat = p.category || 'outros';
            if (!categoryMap.has(cat)) {
                categoryMap.set(cat, { margins: [], prices: [], costs: [], count: 0 });
            }
            const c = categoryMap.get(cat);
            c.margins.push(p.margin);
            c.prices.push(p.price);
            c.costs.push(p.effectiveCost);
            c.count++;
        });
        const categoryBenchmarks = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            count: data.count,
            avgMargin: data.margins.reduce((a, b) => a + b, 0) / data.margins.length,
            avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length,
            avgCost: data.costs.reduce((a, b) => a + b, 0) / data.costs.length,
            minMargin: Math.min(...data.margins),
            maxMargin: Math.max(...data.margins),
        })).sort((a, b) => b.count - a.count);
        // Platform-wide aggregates
        const totalRevenue = bakeryData.reduce((sum, b) => sum + b.revenue, 0);
        const totalCOGS = bakeryData.reduce((sum, b) => sum + b.cogs, 0);
        const totalProducts = allProducts.length;
        const totalWithRecipe = allProducts.filter(p => p.hasRecipe).length;
        const platformAvgMargin = allProducts.length > 0
            ? allProducts.reduce((sum, p) => sum + p.margin, 0) / allProducts.length
            : 0;
        // Bakeries sorted by margin (best to worst)
        const bakeryRanking = [...bakeryData].sort((a, b) => b.grossMargin - a.grossMargin);
        res.json({
            platform: {
                totalRevenue,
                totalCOGS,
                grossProfit: totalRevenue - totalCOGS,
                platformMargin: totalRevenue > 0 ? ((totalRevenue - totalCOGS) / totalRevenue) * 100 : 0,
                avgMargin: platformAvgMargin,
                totalProducts,
                totalWithRecipe,
                recipeAdoption: totalProducts > 0 ? (totalWithRecipe / totalProducts) * 100 : 0,
                totalBakeries: bakeries.length,
            },
            bakeryRanking,
            categoryBenchmarks,
        });
    }
    catch (err) {
        console.error('Cost intelligence error:', err);
        res.status(500).json({ error: err.message });
    }
});
// GET /admin/bi-dashboard - Comprehensive Business Intelligence Endpoint
router.get('/bi-dashboard', (req, res) => {
    try {
        // Helper: Get current and last month strings
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        // ============================================
        // 1. PLATFORM HEALTH METRICS
        // ============================================
        // Total revenue all time (exclude cancelled)
        const totalRevenueAllTime = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as value FROM orders WHERE status != 'cancelled'
    `).get();
        // This month revenue (exclude cancelled)
        const thisMonthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as value
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
    `).get(currentMonthStr);
        // Last month revenue (exclude cancelled)
        const lastMonthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as value
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
    `).get(lastMonthStr);
        const momRevenueGrowth = lastMonthRevenue.value > 0
            ? (((thisMonthRevenue.value - lastMonthRevenue.value) / lastMonthRevenue.value) * 100)
            : 0;
        // Total orders (exclude cancelled)
        const totalOrdersAllTime = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status != 'cancelled'
    `).get();
        // This month orders (exclude cancelled)
        const thisMonthOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
    `).get(currentMonthStr);
        // Last month orders (exclude cancelled)
        const lastMonthOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
    `).get(lastMonthStr);
        const momOrdersGrowth = lastMonthOrders.count > 0
            ? (((thisMonthOrders.count - lastMonthOrders.count) / lastMonthOrders.count) * 100)
            : 0;
        // Average order value current month
        const aovCurrentMonth = thisMonthOrders.count > 0
            ? (thisMonthRevenue.value / thisMonthOrders.count)
            : 0;
        // Average order value last month
        const aovLastMonth = lastMonthOrders.count > 0
            ? (lastMonthRevenue.value / lastMonthOrders.count)
            : 0;
        // Active bakers
        const activeBakers = db.prepare(`
      SELECT COUNT(*) as count FROM bakeries WHERE status = 'active'
    `).get();
        // Total customers
        const totalCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM customers
    `).get();
        // Churn rate: bakers that went from active to churned/suspended
        const recentlyChurned = db.prepare(`
      SELECT COUNT(*) as count FROM bakeries WHERE status IN ('churned', 'suspended')
    `).get();
        const totalBakeries = db.prepare(`
      SELECT COUNT(*) as count FROM bakeries
    `).get();
        const churnRate = totalBakeries.count > 0
            ? (recentlyChurned.count / totalBakeries.count) * 100
            : 0;
        const platformHealth = {
            revenue: {
                allTime: totalRevenueAllTime.value,
                thisMonth: thisMonthRevenue.value,
                lastMonth: lastMonthRevenue.value,
                momGrowthPct: parseFloat(momRevenueGrowth.toFixed(2)),
            },
            orders: {
                allTime: totalOrdersAllTime.count,
                thisMonth: thisMonthOrders.count,
                lastMonth: lastMonthOrders.count,
                momGrowthPct: parseFloat(momOrdersGrowth.toFixed(2)),
            },
            averageOrderValue: {
                currentMonth: parseFloat(aovCurrentMonth.toFixed(2)),
                lastMonth: parseFloat(aovLastMonth.toFixed(2)),
            },
            activeBakers: activeBakers.count,
            totalCustomers: totalCustomers.count,
            churnRate: parseFloat(churnRate.toFixed(2)),
        };
        // ============================================
        // 2. REVENUE ANALYTICS (12 MONTHS)
        // ============================================
        const revenueAnalytics = [];
        let cumulativeRevenue = 0;
        let cumulativeOrders = 0;
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const monthStr = `${year}-${month}`;
            const monthData = db.prepare(`
        SELECT
          COALESCE(SUM(o.total), 0) as revenue,
          COUNT(o.id) as orders,
          CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END as avg_order_value
        FROM orders o
        WHERE strftime('%Y-%m', o.created_at) = ? AND o.status != 'cancelled'
      `).get(monthStr);
            // New bakers that joined this month (separate query for clarity)
            const newBakersData = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) = ?
      `).get(monthStr);
            cumulativeRevenue += monthData.revenue;
            cumulativeOrders += monthData.orders;
            revenueAnalytics.push({
                month: monthStr,
                revenue: parseFloat(monthData.revenue.toFixed(2)),
                orders: monthData.orders,
                newBakers: newBakersData.count,
                avgOrderValue: parseFloat(monthData.avg_order_value.toFixed(2)),
                cumulativeRevenue: parseFloat(cumulativeRevenue.toFixed(2)),
                cumulativeOrders,
            });
        }
        // ============================================
        // 3. BAKER PERFORMANCE RANKINGS
        // ============================================
        // Top 10 bakers by revenue
        const topBakers = db.prepare(`
      SELECT
        u.name as baker_name,
        b.name as bakery_name,
        b.tier,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END as avg_order_value,
        (SELECT COUNT(*) FROM customers WHERE bakery_id = b.id) as total_customers,
        (SELECT COUNT(*) FROM products WHERE bakery_id = b.id) as total_products,
        (SELECT COUNT(DISTINCT product_id) FROM recipe_items WHERE product_id IN (SELECT id FROM products WHERE bakery_id = b.id)) as recipe_items,
        (SELECT COUNT(*) FROM products WHERE bakery_id = b.id) as total_products_2
      FROM bakeries b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN orders o ON b.id = o.bakery_id
      GROUP BY b.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all();
        const topBakersFormatted = topBakers.map((b) => ({
            id: b.bakery_id || b.baker_name,
            name: b.baker_name,
            bakery_name: b.bakery_name,
            tier: b.tier,
            totalOrders: b.total_orders,
            totalRevenue: parseFloat(b.total_revenue.toFixed(2)),
            avgOrderValue: parseFloat(b.avg_order_value.toFixed(2)),
            totalCustomers: b.total_customers,
            totalProducts: b.total_products,
            recipeAdoption: b.total_products_2 > 0 ? parseFloat((b.recipe_items / b.total_products_2 * 100).toFixed(2)) : 0,
        }));
        // Bottom 5 bakers by revenue (churn risk)
        const bottomBakers = db.prepare(`
      SELECT
        u.name as baker_name,
        b.name as bakery_name,
        b.tier,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_revenue,
        CASE WHEN COUNT(o.id) > 0 THEN COALESCE(SUM(o.total), 0) / COUNT(o.id) ELSE 0 END as avg_order_value,
        (SELECT COUNT(*) FROM customers WHERE bakery_id = b.id) as total_customers,
        (SELECT COUNT(*) FROM products WHERE bakery_id = b.id) as total_products,
        (SELECT COUNT(DISTINCT product_id) FROM recipe_items WHERE product_id IN (SELECT id FROM products WHERE bakery_id = b.id)) as recipe_items,
        (SELECT COUNT(*) FROM products WHERE bakery_id = b.id) as total_products_2
      FROM bakeries b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN orders o ON b.id = o.bakery_id
      WHERE b.status = 'active'
      GROUP BY b.id
      ORDER BY total_revenue ASC
      LIMIT 5
    `).all();
        const bottomBakersFormatted = bottomBakers.map((b) => ({
            id: b.bakery_id || b.baker_name,
            name: b.baker_name,
            bakery_name: b.bakery_name,
            tier: b.tier,
            totalOrders: b.total_orders,
            totalRevenue: parseFloat(b.total_revenue.toFixed(2)),
            avgOrderValue: parseFloat(b.avg_order_value.toFixed(2)),
            totalCustomers: b.total_customers,
            totalProducts: b.total_products,
            recipeAdoption: b.total_products_2 > 0 ? parseFloat((b.recipe_items / b.total_products_2 * 100).toFixed(2)) : 0,
        }));
        // Most active bakers (by order count this month)
        const mostActiveBakers = db.prepare(`
      SELECT
        u.name as baker_name,
        b.name as bakery_name,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as month_revenue
      FROM bakeries b
      JOIN users u ON b.owner_id = u.id
      LEFT JOIN orders o ON b.id = o.bakery_id
        AND strftime('%Y-%m', o.created_at) = ?
      WHERE b.status = 'active'
      GROUP BY b.id
      ORDER BY order_count DESC
      LIMIT 10
    `).all(currentMonthStr);
        const mostActiveBakersFormatted = mostActiveBakers.map((b) => ({
            name: b.baker_name,
            bakery_name: b.bakery_name,
            ordersThisMonth: b.order_count,
            revenueThisMonth: parseFloat((b.month_revenue || 0).toFixed(2)),
        }));
        const bakerPerformance = {
            topBakers: topBakersFormatted,
            bottomBakers: bottomBakersFormatted,
            mostActiveThisMonth: mostActiveBakersFormatted,
        };
        // ============================================
        // 4. COHORT ANALYSIS
        // ============================================
        const cohortAnalysis = [];
        for (let i = 11; i >= 0; i--) {
            const cohortDate = new Date();
            cohortDate.setMonth(cohortDate.getMonth() - i);
            const cohortYear = cohortDate.getFullYear();
            const cohortMonth = String(cohortDate.getMonth() + 1).padStart(2, '0');
            const cohortStr = `${cohortYear}-${cohortMonth}`;
            const cohortBakers = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) = ?
      `).get(cohortStr);
            const activeCohortBakers = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries
        WHERE strftime('%Y-%m', created_at) = ? AND status = 'active'
      `).get(cohortStr);
            const retentionPct = cohortBakers.count > 0
                ? (activeCohortBakers.count / cohortBakers.count) * 100
                : 0;
            const cohortRevenue = db.prepare(`
        SELECT COALESCE(SUM(o.total), 0) as total FROM orders o
        JOIN bakeries b ON o.bakery_id = b.id
        WHERE strftime('%Y-%m', b.created_at) = ? AND o.status != 'cancelled'
      `).get(cohortStr);
            const avgRevenuePerBaker = cohortBakers.count > 0
                ? cohortRevenue.total / cohortBakers.count
                : 0;
            cohortAnalysis.push({
                cohort: cohortStr,
                totalBakers: cohortBakers.count,
                activeBakers: activeCohortBakers.count,
                retentionRate: parseFloat(retentionPct.toFixed(2)),
                totalRevenue: parseFloat(cohortRevenue.total.toFixed(2)),
                avgRevenuePerBaker: parseFloat(avgRevenuePerBaker.toFixed(2)),
            });
        }
        // ============================================
        // 5. PRODUCT INTELLIGENCE
        // ============================================
        // Top 20 products by quantity sold
        const topProducts = db.prepare(`
      SELECT
        p.name as product_name,
        p.category,
        b.name as bakery_name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue,
        CASE WHEN SUM(oi.quantity) > 0 THEN COALESCE(SUM(oi.quantity * oi.unit_price), 0) / SUM(oi.quantity) ELSE 0 END as avg_price
      FROM products p
      JOIN bakeries b ON p.bakery_id = b.id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY quantity_sold DESC
      LIMIT 20
    `).all();
        const topProductsFormatted = topProducts.map((p) => ({
            name: p.product_name,
            category: p.category,
            bakery_name: p.bakery_name,
            quantity_sold: p.quantity_sold,
            revenue: parseFloat(p.revenue.toFixed(2)),
            avg_price: parseFloat(p.avg_price.toFixed(2)),
        }));
        // Category breakdown
        const categoryBreakdown = db.prepare(`
      SELECT
        p.category,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
        COALESCE(SUM(oi.quantity), 0) as total_quantity,
        COUNT(DISTINCT p.id) as product_count,
        CASE WHEN SUM(oi.quantity) > 0 THEN COALESCE(SUM(oi.quantity * oi.unit_price), 0) / SUM(oi.quantity) ELSE 0 END as avg_price,
        CASE WHEN SUM(oi.quantity * oi.unit_price) > 0
          THEN (SUM(oi.quantity * oi.unit_price) - COALESCE(SUM(oi.quantity * p.cost), 0)) / SUM(oi.quantity * oi.unit_price) * 100
          ELSE 0 END as avg_margin
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.category IS NOT NULL
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `).all();
        const categoryBreakdownFormatted = categoryBreakdown.map((c) => ({
            category: c.category,
            totalRevenue: parseFloat(c.total_revenue.toFixed(2)),
            totalQuantity: c.total_quantity,
            productCount: c.product_count,
            avgPrice: parseFloat(c.avg_price.toFixed(2)),
            avgMargin: parseFloat(c.avg_margin.toFixed(2)),
        }));
        const productIntelligence = {
            topProducts: topProductsFormatted,
            categoryBreakdown: categoryBreakdownFormatted,
        };
        // ============================================
        // 6. CUSTOMER INTELLIGENCE
        // ============================================
        const totalCustomersCount = db.prepare(`
      SELECT COUNT(*) as count FROM customers
    `).get();
        const activeBakersCount = db.prepare(`
      SELECT COUNT(*) as count FROM bakeries WHERE status = 'active'
    `).get();
        const avgCustomersPerBakery = activeBakersCount.count > 0
            ? totalCustomersCount.count / activeBakersCount.count
            : 0;
        // Top 10 customers by total spent
        const topCustomers = db.prepare(`
      SELECT
        c.name,
        b.name as bakery_name,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM customers c
      JOIN bakeries b ON c.bakery_id = b.id
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `).all();
        const topCustomersFormatted = topCustomers.map((c) => ({
            name: c.name,
            bakery_name: c.bakery_name,
            total_orders: c.total_orders,
            total_spent: parseFloat(c.total_spent.toFixed(2)),
        }));
        // Customer concentration: % of revenue from top 10% of customers
        const totalRevenueAll = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'
    `).get();
        const topTenPercentCustomers = db.prepare(`
      SELECT COALESCE(SUM(o.total), 0) as total
      FROM (
        SELECT c.id, SUM(o.total) as spent
        FROM customers c
        LEFT JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id
        ORDER BY spent DESC
        LIMIT (SELECT MAX(1, COUNT(*) / 10) FROM customers)
      ) top10
      LEFT JOIN orders o ON top10.id = o.customer_id
    `).get();
        const customerConcentration = totalRevenueAll.total > 0
            ? (topTenPercentCustomers.total / totalRevenueAll.total) * 100
            : 0;
        const customerIntelligence = {
            totalCustomers: totalCustomersCount.count,
            avgCustomersPerBakery: parseFloat(avgCustomersPerBakery.toFixed(2)),
            topCustomers: topCustomersFormatted,
            concentrationPercent: parseFloat(customerConcentration.toFixed(2)),
        };
        // ============================================
        // 7. OPERATIONAL METRICS
        // ============================================
        // Order status distribution
        const orderStatusDist = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM orders
      GROUP BY status
    `).all();
        const totalOrdersCount = db.prepare(`
      SELECT COUNT(*) as count FROM orders
    `).get();
        const orderStatusFormatted = orderStatusDist.map((s) => ({
            status: s.status,
            count: s.count,
            percentage: totalOrdersCount.count > 0 ? parseFloat((s.count / totalOrdersCount.count * 100).toFixed(2)) : 0,
        }));
        // Payment method breakdown
        const paymentMethodDist = db.prepare(`
      SELECT
        COALESCE(method, 'unknown') as method,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      GROUP BY method
    `).all();
        const paymentMethodFormatted = paymentMethodDist.map((p) => ({
            method: p.method,
            count: p.count,
            totalAmount: parseFloat(p.total_amount.toFixed(2)),
        }));
        // Average delivery time (created to delivered)
        const avgDeliveryTime = db.prepare(`
      SELECT
        AVG((julianday(updated_at) - julianday(created_at)) * 24) as avg_hours
      FROM orders
      WHERE status = 'delivered'
    `).get();
        const operationalMetrics = {
            orderStatusDistribution: orderStatusFormatted,
            paymentMethodBreakdown: paymentMethodFormatted,
            avgDeliveryTimeHours: avgDeliveryTime.avg_hours ? parseFloat(avgDeliveryTime.avg_hours.toFixed(2)) : 0,
        };
        // ============================================
        // 8. TIER INSIGHTS
        // ============================================
        const tierInsights = [];
        const tiers = ['free', 'starter', 'pro', 'enterprise'];
        for (const tier of tiers) {
            const tierBakeries = db.prepare(`
        SELECT COUNT(*) as count FROM bakeries WHERE tier = ?
      `).get(tier);
            const tierRevenue = db.prepare(`
        SELECT COALESCE(SUM(o.total), 0) as total FROM orders o
        JOIN bakeries b ON o.bakery_id = b.id
        WHERE b.tier = ? AND o.status != 'cancelled'
      `).get(tier);
            const avgRevenuePerTierBaker = tierBakeries.count > 0
                ? tierRevenue.total / tierBakeries.count
                : 0;
            const tierOrders = db.prepare(`
        SELECT COUNT(*) as count FROM orders o
        JOIN bakeries b ON o.bakery_id = b.id
        WHERE b.tier = ? AND o.status != 'cancelled'
      `).get(tier);
            const avgOrdersPerTierBaker = tierBakeries.count > 0
                ? tierOrders.count / tierBakeries.count
                : 0;
            const tierProducts = db.prepare(`
        SELECT AVG(pc.count) as avg_products FROM (
          SELECT b.id, COUNT(*) as count FROM products
          JOIN bakeries b ON b.id = products.bakery_id
          WHERE b.tier = ?
          GROUP BY b.id
        ) pc
      `).get(tier);
            const tierCustomers = db.prepare(`
        SELECT AVG(cc.count) as avg_customers FROM (
          SELECT b.id, COUNT(*) as count FROM customers
          JOIN bakeries b ON b.id = customers.bakery_id
          WHERE b.tier = ?
          GROUP BY b.id
        ) cc
      `).get(tier);
            tierInsights.push({
                tier,
                bakerCount: tierBakeries.count,
                avgRevenue: parseFloat(avgRevenuePerTierBaker.toFixed(2)),
                avgOrders: parseFloat(avgOrdersPerTierBaker.toFixed(2)),
                avgProducts: tierProducts.avg_products ? parseFloat(tierProducts.avg_products.toFixed(2)) : 0,
                avgCustomers: tierCustomers.avg_customers ? parseFloat(tierCustomers.avg_customers.toFixed(2)) : 0,
            });
        }
        // ============================================
        // COMPILE FINAL RESPONSE
        // ============================================
        res.json({
            platformHealth,
            revenueAnalytics,
            bakerPerformance,
            cohortAnalysis,
            productIntelligence,
            customerIntelligence,
            operationalMetrics,
            tierInsights,
        });
    }
    catch (err) {
        console.error('BI Dashboard error:', err);
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=admin.js.map