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

// GET /baker/dashboard
router.get('/dashboard', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    // Stats
    const orderStats = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status IN ('pending', 'confirmed') THEN 1 END) as pending_orders,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE bakery_id = ?
    `).get(bakeryId) as any;

    // Revenue this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE bakery_id = ? AND created_at >= ?
    `).get(bakeryId, firstOfMonth.toISOString()) as any;

    // Revenue last month
    const lastMonthStart = new Date(firstOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(firstOfMonth);
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
    const lastMonthRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE bakery_id = ? AND created_at >= ? AND created_at < ?
    `).get(bakeryId, lastMonthStart.toISOString(), firstOfMonth.toISOString()) as any;

    const revenueChange =
      lastMonthRevenue.revenue > 0
        ? ((monthRevenue.revenue - lastMonthRevenue.revenue) / lastMonthRevenue.revenue) * 100
        : 0;

    // Customer count
    const customerStats = db.prepare('SELECT COUNT(*) as count FROM customers WHERE bakery_id = ?').get(
      bakeryId
    ) as any;

    // Product count
    const productStats = db.prepare('SELECT COUNT(*) as count FROM products WHERE bakery_id = ?').get(bakeryId) as any;

    // Low stock count
    const lowStock = db.prepare(
      'SELECT COUNT(*) as count FROM ingredients WHERE bakery_id = ? AND stock <= min_stock'
    ).get(bakeryId) as any;

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all(bakeryId) as any[];

    // Today's orders
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = db.prepare(`
      SELECT o.id, o.order_number, o.total, o.status, o.delivery_date, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ? AND DATE(o.delivery_date) = ?
      ORDER BY o.created_at DESC
    `).all(bakeryId, today) as any[];

    // Product performance (top 5 by revenue)
    const productPerformance = db.prepare(`
      SELECT p.id, p.name, COALESCE(SUM(oi.quantity * oi.unit_price), 0) as revenue, SUM(oi.quantity) as quantity
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      WHERE p.bakery_id = ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 5
    `).all(bakeryId) as any[];

    res.json({
      stats: {
        totalOrders: orderStats.total_orders,
        pendingOrders: orderStats.pending_orders,
        monthRevenue: monthRevenue.revenue,
        revenueChange: parseFloat(revenueChange.toFixed(2)),
        totalCustomers: customerStats.count,
        totalProducts: productStats.count,
        lowStockCount: lowStock.count,
      },
      recentOrders,
      todaysOrders,
      productPerformance,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/orders
router.get('/orders', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const status = (req.query.status as string) || '';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.bakery_id = ?
    `;

    const params: any[] = [bakeryId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orders = db.prepare(query).all(...params) as any[];

    let countQuery = 'SELECT COUNT(*) as count FROM orders WHERE bakery_id = ?';
    const countParams: any[] = [bakeryId];

    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    const totalCount = db.prepare(countQuery).get(...countParams) as any;

    // Get items for each order
    const enrichedOrders = orders.map((order: any) => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `).all(order.id);

      return {
        ...order,
        items,
      };
    });

    res.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/orders
router.post('/orders', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { customerId, items, deliveryDate, deliveryType, notes, paymentStatus } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: customerId, items' });
    }

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND bakery_id = ?').get(
      customerId,
      bakeryId
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}`;
    const now = new Date().toISOString();

    // Calculate total
    let total = 0;
    for (const item of items) {
      const product = db.prepare('SELECT price FROM products WHERE id = ? AND bakery_id = ?').get(
        item.productId,
        bakeryId
      ) as any;

      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      total += product.price * item.quantity;
    }

    const transaction = db.transaction(() => {
      // Create order
      db.prepare(`
        INSERT INTO orders (id, bakery_id, customer_id, order_number, status, total, notes, delivery_date, delivery_type, payment_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        bakeryId,
        customerId,
        orderNumber,
        'pending',
        total,
        notes || null,
        deliveryDate || null,
        deliveryType || 'pickup',
        paymentStatus || 'unpaid',
        now,
        now
      );

      // Create order items
      for (const item of items) {
        const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId) as any;

        db.prepare(`
          INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), orderId, item.productId, item.quantity, product.price, item.notes || null);
      }

      // Update customer stats
      db.prepare(`
        UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?
      `).run(total, customerId);
    });

    transaction();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare(`
      SELECT oi.*, p.name as product_name FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(orderId);

    res.status(201).json({ ...(order as any), items: orderItems });
  } catch (err: any) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/orders/:id
router.get('/orders/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const orderId = req.params.id as string;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND bakery_id = ?').get(orderId, bakeryId) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.description
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(orderId);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(order.customer_id);

    res.json({ ...order, items, customer });
  } catch (err: any) {
    console.error('Get order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/orders/:id
router.put('/orders/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const orderId = req.params.id as string;
    const { status, paymentStatus, notes, deliveryDate, deliveryType } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND bakery_id = ?').get(orderId, bakeryId) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const now = new Date().toISOString();
    let updateQuery = 'UPDATE orders SET updated_at = ?';
    const updateParams: any[] = [now];

    if (status) {
      updateQuery += ', status = ?';
      updateParams.push(status);
    }
    if (paymentStatus) {
      updateQuery += ', payment_status = ?';
      updateParams.push(paymentStatus);
    }
    if (notes !== undefined) {
      updateQuery += ', notes = ?';
      updateParams.push(notes || null);
    }
    if (deliveryDate) {
      updateQuery += ', delivery_date = ?';
      updateParams.push(deliveryDate);
    }
    if (deliveryType) {
      updateQuery += ', delivery_type = ?';
      updateParams.push(deliveryType);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(orderId);

    db.prepare(updateQuery).run(...updateParams);

    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /baker/orders/:id
router.delete('/orders/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const orderId = req.params.id as string;

    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND bakery_id = ?').get(orderId, bakeryId) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const transaction = db.transaction(() => {
      // Update customer stats
      db.prepare(`
        UPDATE customers SET total_orders = total_orders - 1, total_spent = total_spent - ? WHERE id = ?
      `).run(order.total, order.customer_id);

      // Delete order items and order
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    });

    transaction();

    res.json({ message: 'Order deleted' });
  } catch (err: any) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/products
router.get('/products', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;

    const products = db.prepare(`
      SELECT * FROM products
      WHERE bakery_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(bakeryId, limit, offset) as any[];

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE bakery_id = ?').get(bakeryId) as any;

    res.json({
      products,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get products error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/products
router.post('/products', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { name, description, category, price, cost, prepTimeMinutes } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price required' });
    }

    const productId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (id, bakery_id, name, description, category, price, cost, prep_time_minutes, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId,
      bakeryId,
      name,
      description || null,
      category || null,
      price,
      cost || null,
      prepTimeMinutes || null,
      1,
      now
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    res.status(201).json(product);
  } catch (err: any) {
    console.error('Create product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/products/:id
router.put('/products/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const productId = req.params.id as string;
    const { name, description, category, price, cost, prepTimeMinutes, isActive } = req.body;

    const product = db.prepare('SELECT id FROM products WHERE id = ? AND bakery_id = ?').get(
      productId,
      bakeryId
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let updateQuery = 'UPDATE products SET ';
    const params: any[] = [];

    if (name) {
      updateQuery += 'name = ?, ';
      params.push(name);
    }
    if (description !== undefined) {
      updateQuery += 'description = ?, ';
      params.push(description || null);
    }
    if (category !== undefined) {
      updateQuery += 'category = ?, ';
      params.push(category || null);
    }
    if (price !== undefined) {
      updateQuery += 'price = ?, ';
      params.push(price);
    }
    if (cost !== undefined) {
      updateQuery += 'cost = ?, ';
      params.push(cost || null);
    }
    if (prepTimeMinutes !== undefined) {
      updateQuery += 'prep_time_minutes = ?, ';
      params.push(prepTimeMinutes || null);
    }
    if (isActive !== undefined) {
      updateQuery += 'is_active = ?, ';
      params.push(isActive ? 1 : 0);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
    params.push(productId);

    db.prepare(updateQuery).run(...params);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /baker/products/:id
router.delete('/products/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const productId = req.params.id as string;

    const product = db.prepare('SELECT id FROM products WHERE id = ? AND bakery_id = ?').get(
      productId,
      bakeryId
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(productId);

    res.json({ message: 'Product deleted' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/customers
router.get('/customers', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;

    const customers = db.prepare(`
      SELECT * FROM customers
      WHERE bakery_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(bakeryId, limit, offset) as any[];

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE bakery_id = ?').get(bakeryId) as any;

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/customers
router.post('/customers', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { name, email, phone, address, notes, isWholesale, companyName } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const customerId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, bakery_id, name, email, phone, address, notes, is_wholesale, company_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      bakeryId,
      name,
      email || null,
      phone || null,
      address || null,
      notes || null,
      isWholesale ? 1 : 0,
      companyName || null,
      now
    );

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    res.status(201).json(customer);
  } catch (err: any) {
    console.error('Create customer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/customers/:id
router.put('/customers/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const customerId = req.params.id as string;
    const { name, email, phone, address, notes, isWholesale, companyName } = req.body;

    const customer = db.prepare('SELECT id FROM customers WHERE id = ? AND bakery_id = ?').get(
      customerId,
      bakeryId
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    let updateQuery = 'UPDATE customers SET ';
    const params: any[] = [];

    if (name) {
      updateQuery += 'name = ?, ';
      params.push(name);
    }
    if (email !== undefined) {
      updateQuery += 'email = ?, ';
      params.push(email || null);
    }
    if (phone !== undefined) {
      updateQuery += 'phone = ?, ';
      params.push(phone || null);
    }
    if (address !== undefined) {
      updateQuery += 'address = ?, ';
      params.push(address || null);
    }
    if (notes !== undefined) {
      updateQuery += 'notes = ?, ';
      params.push(notes || null);
    }
    if (isWholesale !== undefined) {
      updateQuery += 'is_wholesale = ?, ';
      params.push(isWholesale ? 1 : 0);
    }
    if (companyName !== undefined) {
      updateQuery += 'company_name = ?, ';
      params.push(companyName || null);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
    params.push(customerId);

    db.prepare(updateQuery).run(...params);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update customer error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/inventory
router.get('/inventory', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;

    const ingredients = db.prepare(`
      SELECT * FROM ingredients
      WHERE bakery_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(bakeryId, limit, offset) as any[];

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM ingredients WHERE bakery_id = ?').get(bakeryId) as any;

    res.json({
      ingredients,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get inventory error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/inventory
router.post('/inventory', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { name, unit, costPerUnit, stock, minStock, category } = req.body;

    if (!name || !unit || costPerUnit === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ingredientId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO ingredients (id, bakery_id, name, unit, cost_per_unit, stock, min_stock, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ingredientId,
      bakeryId,
      name,
      unit,
      costPerUnit,
      stock,
      minStock || null,
      category || null,
      now,
      now
    );

    const ingredient = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredientId);

    res.status(201).json(ingredient);
  } catch (err: any) {
    console.error('Create ingredient error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/inventory/:id
router.put('/inventory/:id', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const ingredientId = req.params.id as string;
    const { name, unit, costPerUnit, stock, minStock, category } = req.body;

    const ingredient = db.prepare('SELECT id FROM ingredients WHERE id = ? AND bakery_id = ?').get(
      ingredientId,
      bakeryId
    );

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    let updateQuery = 'UPDATE ingredients SET ';
    const params: any[] = [];

    if (name) {
      updateQuery += 'name = ?, ';
      params.push(name);
    }
    if (unit) {
      updateQuery += 'unit = ?, ';
      params.push(unit);
    }
    if (costPerUnit !== undefined) {
      updateQuery += 'cost_per_unit = ?, ';
      params.push(costPerUnit);
    }
    if (stock !== undefined) {
      updateQuery += 'stock = ?, ';
      params.push(stock);
    }
    if (minStock !== undefined) {
      updateQuery += 'min_stock = ?, ';
      params.push(minStock || null);
    }
    if (category !== undefined) {
      updateQuery += 'category = ?, ';
      params.push(category || null);
    }

    updateQuery += 'updated_at = ? WHERE id = ?';
    params.push(new Date().toISOString(), ingredientId);

    db.prepare(updateQuery).run(...params);

    const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get(ingredientId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update ingredient error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/employees
router.get('/employees', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const employees = db.prepare(
      'SELECT * FROM employees WHERE bakery_id = ? AND is_active = 1 ORDER BY created_at DESC'
    ).all(bakeryId) as any[];

    res.json({ employees });
  } catch (err: any) {
    console.error('Get employees error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/employees
router.post('/employees', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { name, email, phone, role, hourlyRate } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role required' });
    }

    const employeeId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO employees (id, bakery_id, name, email, phone, role, hourly_rate, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employeeId, bakeryId, name, email || null, phone || null, role, hourlyRate || null, 1, now);

    const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);

    res.status(201).json(employee);
  } catch (err: any) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/notifications
router.get('/notifications', (req: AuthRequest, res: any) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND is_read = 0
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.user!.id) as any[];

    res.json({ notifications });
  } catch (err: any) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/notifications/:id/read
router.put('/notifications/:id/read', (req: AuthRequest, res: any) => {
  try {
    const notificationId = req.params.id as string;

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(
      notificationId,
      req.user!.id
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);

    const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId);

    res.json(updated);
  } catch (err: any) {
    console.error('Update notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/onboarding
router.get('/onboarding', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const steps = db.prepare(`
      SELECT * FROM onboarding_steps
      WHERE bakery_id = ?
      ORDER BY step
    `).all(bakeryId) as any[];

    const completed = steps.filter((s: any) => s.completed).length;
    const total = steps.length;

    res.json({
      steps,
      progress: {
        completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error('Get onboarding error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/onboarding/:step
router.put('/onboarding/:step', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const step = req.params.step as string;

    const onboarding = db.prepare('SELECT * FROM onboarding_steps WHERE bakery_id = ? AND step = ?').get(
      bakeryId,
      step
    ) as any;

    if (!onboarding) {
      return res.status(404).json({ error: 'Onboarding step not found' });
    }

    const now = new Date().toISOString();

    db.prepare('UPDATE onboarding_steps SET completed = 1, completed_at = ? WHERE bakery_id = ? AND step = ?').run(
      now,
      bakeryId,
      step
    );

    const updated = db.prepare('SELECT * FROM onboarding_steps WHERE bakery_id = ? AND step = ?').get(bakeryId, step);

    res.json(updated);
  } catch (err: any) {
    console.error('Update onboarding error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/payments
router.get('/payments', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = (page - 1) * limit;
    const method = (req.query.method as string) || '';

    let query = `
      SELECT p.*, c.name as customer_name, o.order_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.bakery_id = ?
    `;
    const params: any[] = [bakeryId];

    if (method) {
      query += ` AND p.method = ?`;
      params.push(method);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const payments = db.prepare(query).all(...params) as any[];

    let countQuery = 'SELECT COUNT(*) as count FROM payments WHERE bakery_id = ?';
    const countParams: any[] = [bakeryId];
    if (method) {
      countQuery += ` AND method = ?`;
      countParams.push(method);
    }
    const totalCount = db.prepare(countQuery).get(...countParams) as any;

    // Payment summary
    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total_received,
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN method = 'pix' THEN amount ELSE 0 END), 0) as pix_total,
        COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN method = 'card' THEN amount ELSE 0 END), 0) as card_total,
        COUNT(CASE WHEN method = 'pix' THEN 1 END) as pix_count,
        COUNT(CASE WHEN method = 'cash' THEN 1 END) as cash_count,
        COUNT(CASE WHEN method = 'card' THEN 1 END) as card_count
      FROM payments
      WHERE bakery_id = ? AND status = 'completed'
    `).get(bakeryId) as any;

    // This month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const monthSummary = db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as month_total,
        COUNT(*) as month_count
      FROM payments
      WHERE bakery_id = ? AND status = 'completed' AND created_at >= ?
    `).get(bakeryId, firstOfMonth.toISOString()) as any;

    res.json({
      payments,
      summary: { ...summary, ...monthSummary },
      pagination: {
        page,
        limit,
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err: any) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/payments
router.post('/payments', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const { orderId, customerId, amount, method, reference, notes } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method required' });
    }

    const paymentId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payments (id, bakery_id, order_id, customer_id, amount, method, status, reference, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, bakeryId, orderId || null, customerId || null, amount, method, 'completed', reference || null, notes || null, now);

    // If linked to an order, update payment status
    if (orderId) {
      const order = db.prepare('SELECT total FROM orders WHERE id = ? AND bakery_id = ?').get(orderId, bakeryId) as any;
      if (order) {
        const totalPaid = db.prepare(
          'SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE order_id = ? AND status = ?'
        ).get(orderId, 'completed') as any;

        const newStatus = totalPaid.paid >= order.total ? 'paid' : 'partial';
        db.prepare('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, orderId);
      }
    }

    const payment = db.prepare(`
      SELECT p.*, c.name as customer_name, o.order_number
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?
    `).get(paymentId);

    res.status(201).json(payment);
  } catch (err: any) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/reports
router.get('/reports', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    // Revenue by month (last 12 months)
    const revenueByMonth = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE bakery_id = ? AND created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `).all(bakeryId) as any[];

    // Orders by status
    const ordersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE bakery_id = ?
      GROUP BY status
    `).all(bakeryId) as any[];

    // Top products by revenue
    const topProducts = db.prepare(`
      SELECT p.name, SUM(oi.quantity * oi.unit_price) as revenue, SUM(oi.quantity) as quantity_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.bakery_id = ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 10
    `).all(bakeryId) as any[];

    // Top customers by revenue
    const topCustomers = db.prepare(`
      SELECT c.name, c.total_orders, c.total_spent
      FROM customers c
      WHERE c.bakery_id = ?
      ORDER BY c.total_spent DESC
      LIMIT 10
    `).all(bakeryId) as any[];

    // Payment method breakdown
    const paymentMethods = db.prepare(`
      SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE bakery_id = ? AND status = 'completed'
      GROUP BY method
    `).all(bakeryId) as any[];

    // Revenue by day of week
    const revenueByDayOfWeek = db.prepare(`
      SELECT
        CAST(strftime('%w', created_at) AS INTEGER) as day_of_week,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as order_count
      FROM orders
      WHERE bakery_id = ? AND created_at >= date('now', '-3 months')
      GROUP BY strftime('%w', created_at)
      ORDER BY day_of_week
    `).all(bakeryId) as any[];

    res.json({
      revenueByMonth,
      ordersByStatus,
      topProducts,
      topCustomers,
      paymentMethods,
      revenueByDayOfWeek,
    });
  } catch (err: any) {
    console.error('Get reports error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/profile
router.get('/profile', (req: AuthRequest, res: any) => {
  try {
    const user = db.prepare('SELECT id, email, name, phone, avatar_url, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
    const bakery = getBakeryForUser(req.user!.id);
    const subscription = db.prepare('SELECT * FROM subscriptions WHERE bakery_id = ?').get(bakery.id) as any;

    res.json({ user, bakery, subscription });
  } catch (err: any) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /baker/profile
router.put('/profile', (req: AuthRequest, res: any) => {
  try {
    const { name, phone, bakeryName, description, address, city } = req.body;
    const now = new Date().toISOString();

    if (name || phone) {
      let q = 'UPDATE users SET ';
      const p: any[] = [];
      if (name) { q += 'name = ?, '; p.push(name); }
      if (phone !== undefined) { q += 'phone = ?, '; p.push(phone || null); }
      q = q.slice(0, -2) + ' WHERE id = ?';
      p.push(req.user!.id);
      db.prepare(q).run(...p);
    }

    const bakery = getBakeryForUser(req.user!.id);
    if (bakery && (bakeryName || description !== undefined || address !== undefined || city !== undefined)) {
      let q = 'UPDATE bakeries SET updated_at = ?, ';
      const p: any[] = [now];
      if (bakeryName) { q += 'name = ?, '; p.push(bakeryName); }
      if (description !== undefined) { q += 'description = ?, '; p.push(description || null); }
      if (address !== undefined) { q += 'address = ?, '; p.push(address || null); }
      if (city !== undefined) { q += 'city = ?, '; p.push(city || null); }
      q = q.slice(0, -2) + ' WHERE id = ?';
      p.push(bakery.id);
      db.prepare(q).run(...p);
    }

    const user = db.prepare('SELECT id, email, name, phone, avatar_url FROM users WHERE id = ?').get(req.user!.id);
    const updatedBakery = getBakeryForUser(req.user!.id);

    res.json({ user, bakery: updatedBakery });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/features
router.get('/features', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const bakery = db.prepare('SELECT tier FROM bakeries WHERE id = ?').get(bakeryId) as any;

    const tiers = ['free', 'starter', 'pro', 'enterprise'];
    const tierIndex = tiers.indexOf(bakery.tier);

    const allFeatures = db.prepare('SELECT * FROM features ORDER BY category, name').all() as any[];

    const enriched = allFeatures.map((feature: any) => ({
      ...feature,
      unlocked: tiers.indexOf(feature.tier_required) <= tierIndex,
    }));

    res.json({ features: enriched, currentTier: bakery.tier });
  } catch (err: any) {
    console.error('Get features error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/production - Production queue for today/tomorrow
router.get('/production', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const statuses = ['pending', 'confirmed', 'production', 'ready', 'delivered'];
    const result: Record<string, any[]> = {
      pending: [],
      production: [],
      ready: [],
      delivered: [],
    };

    for (const status of statuses) {
      const orders = db.prepare(`
        SELECT o.id, o.order_number, o.total, o.status, o.delivery_date, c.name as customer_name
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.bakery_id = ? AND o.status = ?
          AND (DATE(o.delivery_date) = ? OR DATE(o.delivery_date) = ?)
        ORDER BY o.delivery_date ASC, o.created_at ASC
      `).all(bakeryId, status, today, tomorrow) as any[];

      // Get items for each order
      const enriched = orders.map((order: any) => {
        const items = db.prepare(`
          SELECT oi.*, p.name as product_name
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `).all(order.id);

        const isUrgent = order.delivery_date && order.delivery_date.split('T')[0] === today;

        return {
          ...order,
          items,
          isUrgent,
        };
      });

      result[status] = enriched;
    }

    // Summary stats
    const allOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE bakery_id = ? AND (DATE(delivery_date) = ? OR DATE(delivery_date) = ?)
    `).get(bakeryId, today, tomorrow) as any;

    res.json({
      data: result,
      stats: {
        totalOrders: allOrders.count,
        pendingCount: result.pending.length,
        productionCount: result.production.length,
        readyCount: result.ready.length,
        deliveredCount: result.delivered.length,
      },
    });
  } catch (err: any) {
    console.error('Get production error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/recipes - All products with recipe costs
router.get('/recipes', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const products = db.prepare(`
      SELECT * FROM products WHERE bakery_id = ? ORDER BY name ASC
    `).all(bakeryId) as any[];

    const enriched = products.map((product: any) => {
      const recipeItems = db.prepare(`
        SELECT ri.*, i.name as ingredient_name, i.cost_per_unit, i.unit
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.product_id = ?
      `).all(product.id) as any[];

      let ingredientCost = 0;
      recipeItems.forEach((item: any) => {
        ingredientCost += (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
      });

      const margin = product.price > 0 ? ((product.price - ingredientCost) / product.price) * 100 : 0;
      const profit = product.price - ingredientCost;

      return {
        ...product,
        ingredientCost: parseFloat(ingredientCost.toFixed(2)),
        margin: parseFloat(margin.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        recipeItems,
      };
    });

    res.json({ products: enriched });
  } catch (err: any) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/recipes/:productId
router.get('/recipes/:productId', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const productId = req.params.productId as string;

    const product = db.prepare(`
      SELECT * FROM products WHERE id = ? AND bakery_id = ?
    `).get(productId, bakeryId) as any;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const recipeItems = db.prepare(`
      SELECT ri.*, i.name as ingredient_name, i.cost_per_unit, i.unit
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.product_id = ?
    `).all(productId) as any[];

    let ingredientCost = 0;
    recipeItems.forEach((item: any) => {
      ingredientCost += (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
    });

    const margin = product.price > 0 ? ((product.price - ingredientCost) / product.price) * 100 : 0;
    const profit = product.price - ingredientCost;

    res.json({
      ...product,
      ingredientCost: parseFloat(ingredientCost.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      recipeItems,
    });
  } catch (err: any) {
    console.error('Get recipe error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /baker/recipes/:productId/items
router.post('/recipes/:productId/items', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const productId = req.params.productId as string;
    const { ingredientId, quantityPerBatch, batchSize } = req.body;

    if (!ingredientId || quantityPerBatch === undefined) {
      return res.status(400).json({ error: 'ingredientId and quantityPerBatch required' });
    }

    const product = db.prepare('SELECT id FROM products WHERE id = ? AND bakery_id = ?').get(productId, bakeryId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const ingredient = db.prepare('SELECT id FROM ingredients WHERE id = ? AND bakery_id = ?').get(
      ingredientId,
      bakeryId
    );
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    const recipeItemId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO recipe_items (id, product_id, ingredient_id, quantity_per_batch, batch_size, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(recipeItemId, productId, ingredientId, quantityPerBatch, batchSize || 1, now);

    const item = db.prepare(`
      SELECT ri.*, i.name as ingredient_name, i.cost_per_unit, i.unit
      FROM recipe_items ri
      JOIN ingredients i ON ri.ingredient_id = i.id
      WHERE ri.id = ?
    `).get(recipeItemId);

    res.status(201).json(item);
  } catch (err: any) {
    console.error('Create recipe item error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /baker/recipes/:productId/items/:itemId
router.delete('/recipes/:productId/items/:itemId', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const productId = req.params.productId as string;
    const itemId = req.params.itemId as string;

    const product = db.prepare('SELECT id FROM products WHERE id = ? AND bakery_id = ?').get(productId, bakeryId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const item = db.prepare('SELECT * FROM recipe_items WHERE id = ? AND product_id = ?').get(itemId, productId);
    if (!item) {
      return res.status(404).json({ error: 'Recipe item not found' });
    }

    db.prepare('DELETE FROM recipe_items WHERE id = ?').run(itemId);

    res.json({ message: 'Recipe item deleted' });
  } catch (err: any) {
    console.error('Delete recipe item error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/recipe-costing - Costing summary for all products
router.get('/recipe-costing', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const products = db.prepare(`
      SELECT * FROM products WHERE bakery_id = ? ORDER BY name ASC
    `).all(bakeryId) as any[];

    const costingData = products.map((product: any) => {
      const recipeItems = db.prepare(`
        SELECT ri.*, i.cost_per_unit
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.product_id = ?
      `).all(product.id) as any[];

      let ingredientCost = 0;
      recipeItems.forEach((item: any) => {
        ingredientCost += (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
      });

      const margin = product.price > 0 ? ((product.price - ingredientCost) / product.price) * 100 : 0;
      const profit = product.price - ingredientCost;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        ingredientCost: parseFloat(ingredientCost.toFixed(2)),
        margin: parseFloat(margin.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
      };
    });

    const avgMargin = costingData.length > 0
      ? costingData.reduce((sum, p) => sum + p.margin, 0) / costingData.length
      : 0;

    const lowestMarginProducts = costingData.slice().sort((a, b) => a.margin - b.margin).slice(0, 5);
    const highestProfitProducts = costingData.slice().sort((a, b) => b.profit - a.profit).slice(0, 5);

    res.json({
      products: costingData,
      summary: {
        averageMargin: parseFloat(avgMargin.toFixed(2)),
        totalProducts: costingData.length,
        lowestMarginProducts,
        highestProfitProducts,
      },
    });
  } catch (err: any) {
    console.error('Get recipe costing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/reports/margins
router.get('/reports/margins', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);

    const products = db.prepare(`
      SELECT * FROM products WHERE bakery_id = ? ORDER BY name ASC
    `).all(bakeryId) as any[];

    const marginData = products.map((product: any) => {
      const recipeItems = db.prepare(`
        SELECT ri.*, i.cost_per_unit
        FROM recipe_items ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.product_id = ?
      `).all(product.id) as any[];

      let ingredientCost = 0;
      recipeItems.forEach((item: any) => {
        ingredientCost += (item.quantity_per_batch * item.cost_per_unit) / item.batch_size;
      });

      const margin = product.price > 0 ? ((product.price - ingredientCost) / product.price) * 100 : 0;

      return {
        name: product.name,
        margin: parseFloat(margin.toFixed(2)),
      };
    });

    res.json(marginData);
  } catch (err: any) {
    console.error('Get margins error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /baker/reports/velocity - Sales velocity per product
router.get('/reports/velocity', (req: AuthRequest, res: any) => {
  try {
    const bakeryId = getBakeryId(req.user!.id);
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();

    const products = db.prepare(`
      SELECT DISTINCT p.id, p.name
      FROM products p
      WHERE p.bakery_id = ?
      ORDER BY p.name ASC
    `).all(bakeryId) as any[];

    const velocityData = products.map((product: any) => {
      const sales = db.prepare(`
        SELECT CAST(strftime('%W', o.created_at) as INTEGER) as week, SUM(oi.quantity) as quantity
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.bakery_id = ? AND oi.product_id = ? AND o.created_at >= ?
        GROUP BY week
        ORDER BY week DESC
        LIMIT 4
      `).all(bakeryId, product.id, fourWeeksAgo) as any[];

      const weeks = sales.map(s => s.quantity || 0);
      let trend = 'flat';
      if (weeks.length >= 2) {
        if (weeks[0] > weeks[weeks.length - 1]) {
          trend = 'down';
        } else if (weeks[0] < weeks[weeks.length - 1]) {
          trend = 'up';
        }
      }

      return {
        name: product.name,
        trend,
        weekly: weeks,
      };
    });

    res.json(velocityData);
  } catch (err: any) {
    console.error('Get velocity error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
