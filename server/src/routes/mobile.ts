import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, getBakeryForUser } from '../db/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireBaker, requireAuth } from '../middleware/rbac.js';

const router = Router();
router.use(authMiddleware);
router.use(requireAuth);
router.use(requireBaker);

const db = getDB();

// Helper: Get bakery_id for authenticated user
function getBakeryId(userId: string): string {
  const bakery = getBakeryForUser(userId);
  if (!bakery) {
    throw new Error('Bakery not found');
  }
  return bakery.id;
}

// GET /mobile/dashboard
router.get('/dashboard', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    // Today's orders
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      WHERE o.bakery_id = ? AND DATE(o.delivery_date) = ?
    `).get(bakeryId, today) as any;

    // Pending orders
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE bakery_id = ? AND status IN ('pending', 'confirmed')
    `).get(bakeryId) as any;

    res.json({
      todaysOrders: todaysOrders.count,
      todaysRevenue: todaysOrders.revenue || 0,
      pendingOrders: pendingOrders.count,
    });
  } catch (err: any) {
    console.error('Mobile dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /mobile/orders
router.get('/orders', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `).all(bakeryId) as any[];

    res.json({ orders });
  } catch (err: any) {
    console.error('Mobile orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /mobile/orders/quick
router.post('/orders/quick', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { customerName, productId, quantity, deliveryDate } = req.body;

    if (!customerName || !productId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND bakery_id = ?').get(
      productId,
      bakeryId
    ) as any;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const now = new Date().toISOString();
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;

    const transaction = db.transaction(() => {
      // Find or create customer
      let customer = db.prepare(
        'SELECT id FROM customers WHERE bakery_id = ? AND name = ? LIMIT 1'
      ).get(bakeryId, customerName) as any;

      let customerId: string;

      if (customer) {
        customerId = customer.id;
      } else {
        customerId = uuidv4();
        db.prepare(`
          INSERT INTO customers (id, bakery_id, name, created_at)
          VALUES (?, ?, ?, ?)
        `).run(customerId, bakeryId, customerName, now);
      }

      // Create order
      const total = product.price * quantity;

      db.prepare(`
        INSERT INTO orders (id, bakery_id, customer_id, order_number, status, total, delivery_date, delivery_type, payment_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        bakeryId,
        customerId,
        orderNumber,
        'pending',
        total,
        deliveryDate || null,
        'pickup',
        'unpaid',
        now,
        now
      );

      // Create order item
      db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), orderId, productId, quantity, product.price);

      // Update customer stats
      db.prepare(`
        UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?
      `).run(total, customerId);
    });

    transaction();

    const order = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId);

    res.status(201).json(order);
  } catch (err: any) {
    console.error('Quick order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /mobile/products
router.get('/products', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const products = db.prepare(`
      SELECT id, name, price, category, image_url
      FROM products
      WHERE bakery_id = ? AND is_active = 1
      ORDER BY name
    `).all(bakeryId) as any[];

    res.json({ products });
  } catch (err: any) {
    console.error('Mobile products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /mobile/notifications
router.get('/notifications', (req: AuthRequest, res: any) => {
  try {
    const notifications = db.prepare(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(req.user!.id) as any[];

    res.json({ notifications });
  } catch (err: any) {
    console.error('Mobile notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
