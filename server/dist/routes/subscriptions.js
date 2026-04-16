import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, getBakeryForUser } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireBaker, requireAuth, requireAdmin } from '../middleware/rbac.js';
const router = Router();
const db = getDB();
// Helper: Get bakery_id for authenticated user
function getBakeryId(userId) {
    const bakery = getBakeryForUser(userId);
    if (!bakery) {
        throw new Error('Bakery not found');
    }
    return bakery.id;
}
// Helper: Generate invoice number
function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const randomNum = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    return `JB-${year}-${randomNum}`;
}
// Helper: Calculate prorated amount
function calculateProratedAmount(dailyRate, daysRemaining) {
    return Math.round(dailyRate * daysRemaining * 100) / 100;
}
// ============================================================================
// BAKER ROUTES (authenticated as baker)
// ============================================================================
// GET /api/subscriptions/plans - List all available plans with features
router.get('/plans', authMiddleware, requireAuth, (req, res) => {
    try {
        const plans = db.prepare(`
      SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price ASC
    `).all();
        const formattedPlans = plans.map((plan) => ({
            ...plan,
            features: plan.features ? JSON.parse(plan.features) : [],
        }));
        res.json(formattedPlans);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/subscriptions/current - Get current subscription details + billing history
router.get('/current', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const bakeryId = getBakeryId(req.user.id);
        const subscription = db.prepare(`
      SELECT s.*, sp.name as plan_name, sp.features as plan_features, bpm.label as payment_method_label
      FROM subscriptions s
      LEFT JOIN subscription_plans sp ON s.tier = sp.slug
      LEFT JOIN baker_payment_methods bpm ON s.payment_method_id = bpm.id
      WHERE s.bakery_id = ?
    `).get(bakeryId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        // Get billing history
        const billingHistory = db.prepare(`
      SELECT * FROM billing_history
      WHERE bakery_id = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).all(bakeryId);
        res.json({
            subscription: {
                ...subscription,
                plan_features: subscription.plan_features ? JSON.parse(subscription.plan_features) : [],
            },
            billingHistory,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/subscriptions/upgrade - Upgrade/downgrade plan
router.post('/upgrade', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { planSlug, billingCycle } = req.body;
        const bakeryId = getBakeryId(req.user.id);
        if (!planSlug || !['free', 'starter', 'pro', 'enterprise'].includes(planSlug)) {
            return res.status(400).json({ error: 'Invalid plan slug' });
        }
        if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }
        // Get new plan
        const newPlan = db.prepare(`
      SELECT * FROM subscription_plans WHERE slug = ?
    `).get(planSlug);
        if (!newPlan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        // Get current subscription
        const currentSub = db.prepare(`
      SELECT * FROM subscriptions WHERE bakery_id = ?
    `).get(bakeryId);
        if (!currentSub) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        // Determine pricing
        const price = billingCycle === 'annual' ? newPlan.annual_price : newPlan.monthly_price;
        const now = new Date().toISOString();
        // Calculate prorated credit if upgrading mid-cycle
        let proratedCredit = 0;
        if (currentSub.status === 'active' && currentSub.current_period_end) {
            const periodEnd = new Date(currentSub.current_period_end);
            const today = new Date();
            const daysRemaining = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysRemaining > 0) {
                const currentDailyRate = currentSub.monthly_price / 30;
                proratedCredit = calculateProratedAmount(currentDailyRate, daysRemaining);
            }
        }
        // Create billing record for the change
        if (proratedCredit > 0) {
            const invoiceNumber = generateInvoiceNumber();
            db.prepare(`
        INSERT INTO billing_history (id, subscription_id, bakery_id, amount, currency, status, invoice_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), currentSub.id, bakeryId, -proratedCredit, 'BRL', 'paid', invoiceNumber, now);
        }
        // Calculate next billing date
        const nextBillingDate = new Date();
        if (billingCycle === 'annual') {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }
        else {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
        // Update subscription
        db.prepare(`
      UPDATE subscriptions
      SET tier = ?, monthly_price = ?, billing_cycle = ?, annual_discount_applied = ?, next_billing_date = ?
      WHERE bakery_id = ?
    `).run(planSlug, price, billingCycle, billingCycle === 'annual' ? 1 : 0, nextBillingDate.toISOString(), bakeryId);
        // Update bakery tier
        db.prepare(`
      UPDATE bakeries SET tier = ?, updated_at = ? WHERE id = ?
    `).run(planSlug, now, bakeryId);
        res.json({ success: true, message: 'Plan updated successfully', proratedCredit });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/subscriptions/payment-methods - Add payment method
router.post('/payment-methods', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { type, label, details } = req.body;
        const bakeryId = getBakeryId(req.user.id);
        if (!type || !['pix', 'credit_card', 'debit_card', 'boleto'].includes(type)) {
            return res.status(400).json({ error: 'Invalid payment method type' });
        }
        if (!label) {
            return res.status(400).json({ error: 'Label is required' });
        }
        const id = uuidv4();
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO baker_payment_methods (id, bakery_id, type, label, is_default, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, bakeryId, type, label, 0, JSON.stringify(details || {}), now);
        res.json({ id, bakery_id: bakeryId, type, label, is_default: 0, details, created_at: now });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/subscriptions/payment-methods - List payment methods
router.get('/payment-methods', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const bakeryId = getBakeryId(req.user.id);
        const methods = db.prepare(`
      SELECT id, bakery_id, type, label, is_default, created_at FROM baker_payment_methods
      WHERE bakery_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(bakeryId);
        res.json(methods);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DELETE /api/subscriptions/payment-methods/:id - Remove payment method
router.delete('/payment-methods/:id', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { id } = req.params;
        const bakeryId = getBakeryId(req.user.id);
        const method = db.prepare(`
      SELECT * FROM baker_payment_methods WHERE id = ? AND bakery_id = ?
    `).get(id, bakeryId);
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }
        if (method.is_default) {
            return res.status(400).json({ error: 'Cannot delete default payment method' });
        }
        db.prepare(`
      DELETE FROM baker_payment_methods WHERE id = ?
    `).run(id);
        res.json({ success: true, message: 'Payment method deleted' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/subscriptions/payment-methods/:id/default - Set as default
router.put('/payment-methods/:id/default', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { id } = req.params;
        const bakeryId = getBakeryId(req.user.id);
        const method = db.prepare(`
      SELECT * FROM baker_payment_methods WHERE id = ? AND bakery_id = ?
    `).get(id, bakeryId);
        if (!method) {
            return res.status(404).json({ error: 'Payment method not found' });
        }
        // Clear other defaults
        db.prepare(`
      UPDATE baker_payment_methods SET is_default = 0 WHERE bakery_id = ?
    `).run(bakeryId);
        // Set this as default
        db.prepare(`
      UPDATE baker_payment_methods SET is_default = 1 WHERE id = ?
    `).run(id);
        // Update subscription
        db.prepare(`
      UPDATE subscriptions SET payment_method_id = ? WHERE bakery_id = ?
    `).run(id, bakeryId);
        res.json({ success: true, message: 'Default payment method updated' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/subscriptions/billing-history - Paginated billing history
router.get('/billing-history', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const bakeryId = getBakeryId(req.user.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const total = db.prepare(`
      SELECT COUNT(*) as count FROM billing_history WHERE bakery_id = ?
    `).get(bakeryId);
        const history = db.prepare(`
      SELECT * FROM billing_history
      WHERE bakery_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(bakeryId, limit, offset);
        res.json({
            history,
            pagination: {
                page,
                limit,
                total: total.count,
                pages: Math.ceil(total.count / limit),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/subscriptions/cancel - Cancel subscription
router.post('/cancel', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { reason } = req.body;
        const bakeryId = getBakeryId(req.user.id);
        const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE bakery_id = ?
    `).get(bakeryId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const now = new Date().toISOString();
        db.prepare(`
      UPDATE subscriptions
      SET status = 'cancelled', cancelled_at = ?
      WHERE bakery_id = ?
    `).run(now, bakeryId);
        // Update bakery status to churned
        db.prepare(`
      UPDATE bakeries SET status = 'churned', tier = 'free', updated_at = ? WHERE id = ?
    `).run(now, bakeryId);
        res.json({ success: true, message: 'Subscription cancelled', reason });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/subscriptions/reactivate - Reactivate cancelled subscription
router.post('/reactivate', authMiddleware, requireAuth, requireBaker, (req, res) => {
    try {
        const { planSlug, billingCycle } = req.body;
        const bakeryId = getBakeryId(req.user.id);
        if (!planSlug || !['free', 'starter', 'pro', 'enterprise'].includes(planSlug)) {
            return res.status(400).json({ error: 'Invalid plan slug' });
        }
        if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
            return res.status(400).json({ error: 'Invalid billing cycle' });
        }
        const plan = db.prepare(`
      SELECT * FROM subscription_plans WHERE slug = ?
    `).get(planSlug);
        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }
        const now = new Date().toISOString();
        const price = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
        const nextBillingDate = new Date();
        if (billingCycle === 'annual') {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }
        else {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
        db.prepare(`
      UPDATE subscriptions
      SET status = 'active', tier = ?, monthly_price = ?, billing_cycle = ?,
          next_billing_date = ?, cancelled_at = NULL, failed_payment_count = 0
      WHERE bakery_id = ?
    `).run(planSlug, price, billingCycle, nextBillingDate.toISOString(), bakeryId);
        // Update bakery
        db.prepare(`
      UPDATE bakeries SET tier = ?, status = 'active', updated_at = ? WHERE id = ?
    `).run(planSlug, now, bakeryId);
        res.json({ success: true, message: 'Subscription reactivated' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============================================================================
// ADMIN ROUTES (authenticated as admin)
// ============================================================================
// GET /api/subscriptions/admin/overview - MRR, ARR, churn, LTV stats
router.get('/admin/overview', authMiddleware, requireAuth, requireAdmin, (req, res) => {
    try {
        // MRR calculation (active monthly subscriptions)
        const mrr = db.prepare(`
      SELECT COALESCE(SUM(monthly_price), 0) as mrr
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
    `).get();
        // ARR calculation (annual subscriptions + monthly * 12)
        const arr = db.prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN billing_cycle = 'annual' THEN monthly_price / 0.85
          ELSE monthly_price * 12
        END
      ), 0) as arr
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
    `).get();
        // Churn rate (cancelled this month / total active last month)
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        const lastMonthStart = new Date(firstOfMonth);
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        const cancelled = db.prepare(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'cancelled' AND cancelled_at >= ? AND cancelled_at < ?
    `).get(lastMonthStart.toISOString(), firstOfMonth.toISOString());
        const totalActive = db.prepare(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
    `).get();
        const churnRate = totalActive.count > 0 ? (cancelled.count / totalActive.count) * 100 : 0;
        // LTV estimate (average customer lifetime value)
        const ltv = db.prepare(`
      SELECT AVG(
        CASE
          WHEN monthly_price = 0 THEN 0
          WHEN monthly_price > 0 THEN (monthly_price * 12) / 0.05
          ELSE 0
        END
      ) as ltv
      FROM subscriptions
      WHERE monthly_price > 0
    `).get();
        // Active subscriptions by tier
        const byTier = db.prepare(`
      SELECT tier, COUNT(*) as count, COALESCE(SUM(monthly_price), 0) as revenue
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
      GROUP BY tier
    `).all();
        res.json({
            mrr: mrr.mrr,
            arr: arr.arr,
            churnRate: Math.round(churnRate * 100) / 100,
            ltv: Math.round(ltv.ltv * 100) / 100,
            activeSubscriptions: totalActive.count,
            cancelledThisMonth: cancelled.count,
            byTier,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/subscriptions/admin/billing - All billing history across bakers
router.get('/admin/billing', authMiddleware, requireAuth, requireAdmin, (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        let query = `
      SELECT bh.*, b.name as bakery_name, s.tier
      FROM billing_history bh
      JOIN bakeries b ON bh.bakery_id = b.id
      JOIN subscriptions s ON bh.subscription_id = s.id
    `;
        const params = [];
        if (status) {
            query += ` WHERE bh.status = ?`;
            params.push(status);
        }
        const total = db.prepare(query.replace('SELECT bh.*', 'SELECT COUNT(*) as count')).get(...params);
        query += ` ORDER BY bh.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        const history = db.prepare(query).all(...params);
        res.json({
            history,
            pagination: {
                page,
                limit,
                total: total.count,
                pages: Math.ceil(total.count / limit),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/subscriptions/admin/charge - Manually trigger billing
router.post('/admin/charge', authMiddleware, requireAuth, requireAdmin, (req, res) => {
    try {
        const { subscriptionId, amount } = req.body;
        if (!subscriptionId || !amount) {
            return res.status(400).json({ error: 'subscriptionId and amount are required' });
        }
        const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE id = ?
    `).get(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const invoiceNumber = generateInvoiceNumber();
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO billing_history (id, subscription_id, bakery_id, amount, currency, status, invoice_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), subscriptionId, subscription.bakery_id, amount, 'BRL', 'paid', invoiceNumber, now);
        res.json({ success: true, invoiceNumber, amount });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/subscriptions/admin/:id/extend-trial - Extend trial period
router.put('/admin/:id/extend-trial', authMiddleware, requireAuth, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { days } = req.body;
        if (!days || days <= 0) {
            return res.status(400).json({ error: 'days must be a positive number' });
        }
        const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE id = ?
    `).get(id);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const newTrialEnd = new Date(subscription.trial_ends_at || new Date());
        newTrialEnd.setDate(newTrialEnd.getDate() + days);
        db.prepare(`
      UPDATE subscriptions SET trial_ends_at = ?, next_billing_date = ? WHERE id = ?
    `).run(newTrialEnd.toISOString(), newTrialEnd.toISOString(), id);
        res.json({ success: true, newTrialEnd });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT /api/subscriptions/admin/:id/apply-discount - Apply discount
router.put('/admin/:id/apply-discount', authMiddleware, requireAuth, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { discountPercent } = req.body;
        if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) {
            return res.status(400).json({ error: 'discountPercent must be between 0 and 100' });
        }
        const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE id = ?
    `).get(id);
        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        const discountedPrice = subscription.monthly_price * (1 - discountPercent / 100);
        db.prepare(`
      UPDATE subscriptions SET monthly_price = ? WHERE id = ?
    `).run(discountedPrice, id);
        res.json({ success: true, originalPrice: subscription.monthly_price, discountedPrice });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
//# sourceMappingURL=subscriptions.js.map