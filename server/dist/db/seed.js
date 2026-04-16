import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from './index.js';
const db = getDB();
export function seedDatabase() {
    initDB();
    // Clear existing data
    db.exec(`
    DELETE FROM announcements;
    DELETE FROM audit_log;
    DELETE FROM onboarding_steps;
    DELETE FROM notifications;
    DELETE FROM employees;
    DELETE FROM ingredients;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM customers;
    DELETE FROM products;
    DELETE FROM subscriptions;
    DELETE FROM bakeries;
    DELETE FROM users;
    DELETE FROM features;
  `);
    const now = new Date().toISOString();
    // Create admin user
    const adminId = uuidv4();
    const adminPassword = bcryptjs.hashSync('admin123', 10);
    db.prepare(`
    INSERT INTO users (id, email, password, name, role, phone, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@jumaboss.com', adminPassword, 'Admin User', 'admin', '+1234567890', now, now);
    // Create feature definitions
    const features = [
        // Free tier
        {
            id: uuidv4(),
            name: 'Orders',
            slug: 'orders',
            description: 'Create and manage orders',
            tier_required: 'free',
            category: 'core',
        },
        {
            id: uuidv4(),
            name: 'Products',
            slug: 'products',
            description: 'Create and manage product catalog',
            tier_required: 'free',
            category: 'core',
        },
        {
            id: uuidv4(),
            name: 'Customers',
            slug: 'customers',
            description: 'Manage customer database',
            tier_required: 'free',
            category: 'core',
        },
        // Starter tier
        {
            id: uuidv4(),
            name: 'Inventory',
            slug: 'inventory',
            description: 'Track ingredients and inventory',
            tier_required: 'starter',
            category: 'operations',
        },
        {
            id: uuidv4(),
            name: 'Reports',
            slug: 'reports',
            description: 'Basic reporting and analytics',
            tier_required: 'starter',
            category: 'analytics',
        },
        {
            id: uuidv4(),
            name: 'Employees (up to 3)',
            slug: 'employees-basic',
            description: 'Manage up to 3 team members',
            tier_required: 'starter',
            category: 'team',
        },
        // Pro tier
        {
            id: uuidv4(),
            name: 'Production Planning',
            slug: 'production',
            description: 'Advanced production scheduling',
            tier_required: 'pro',
            category: 'operations',
        },
        {
            id: uuidv4(),
            name: 'Wholesale',
            slug: 'wholesale',
            description: 'Wholesale order management',
            tier_required: 'pro',
            category: 'sales',
        },
        {
            id: uuidv4(),
            name: 'Marketplace',
            slug: 'marketplace',
            description: 'List products in marketplace',
            tier_required: 'pro',
            category: 'sales',
        },
        {
            id: uuidv4(),
            name: 'Unlimited Employees',
            slug: 'employees-unlimited',
            description: 'Manage unlimited team members',
            tier_required: 'pro',
            category: 'team',
        },
        {
            id: uuidv4(),
            name: 'Advanced Analytics',
            slug: 'analytics-advanced',
            description: 'Advanced reporting and dashboards',
            tier_required: 'pro',
            category: 'analytics',
        },
        // Enterprise tier
        {
            id: uuidv4(),
            name: 'API Access',
            slug: 'api',
            description: 'REST API for integrations',
            tier_required: 'enterprise',
            category: 'integrations',
        },
        {
            id: uuidv4(),
            name: 'Multi-Location',
            slug: 'multi-location',
            description: 'Manage multiple bakery locations',
            tier_required: 'enterprise',
            category: 'operations',
        },
        {
            id: uuidv4(),
            name: 'Priority Support',
            slug: 'priority-support',
            description: '24/7 priority support',
            tier_required: 'enterprise',
            category: 'support',
        },
        {
            id: uuidv4(),
            name: 'White Label',
            slug: 'white-label',
            description: 'White label branding',
            tier_required: 'enterprise',
            category: 'branding',
        },
    ];
    for (const feature of features) {
        db.prepare(`
      INSERT INTO features (id, name, slug, description, tier_required, category, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(feature.id, feature.name, feature.slug, feature.description, feature.tier_required, feature.category, now);
    }
    // Baker accounts with their data
    const bakers = [
        {
            email: 'hobby1@jumaboss.com',
            name: 'Maria Santos',
            bakeryName: "Maria's Home Bakes",
            tier: 'free',
            products: 3,
            customers: 5,
            ordersPerMonth: 8,
        },
        {
            email: 'hobby2@jumaboss.com',
            name: 'Ana Costa',
            bakeryName: 'Sweet Traditions',
            tier: 'free',
            products: 4,
            customers: 6,
            ordersPerMonth: 10,
        },
        {
            email: 'starter@jumaboss.com',
            name: 'James Chen',
            bakeryName: 'Golden Crust Bakery',
            tier: 'starter',
            products: 12,
            customers: 20,
            ordersPerMonth: 40,
        },
        {
            email: 'starter2@jumaboss.com',
            name: 'Sofia Rivera',
            bakeryName: "Rivera's Artisan Bakes",
            tier: 'starter',
            products: 10,
            customers: 18,
            ordersPerMonth: 35,
        },
        {
            email: 'pro@jumaboss.com',
            name: 'Sarah Johnson',
            bakeryName: "Sarah's Sweet Creations",
            tier: 'pro',
            products: 20,
            customers: 50,
            ordersPerMonth: 80,
        },
        {
            email: 'enterprise@jumaboss.com',
            name: 'Robert Williams',
            bakeryName: 'Williams Bakery Empire',
            tier: 'enterprise',
            products: 35,
            customers: 120,
            ordersPerMonth: 150,
        },
    ];
    const tierPrices = { free: 0, starter: 29, pro: 79, enterprise: 199 };
    const bakerPassword = bcryptjs.hashSync('demo123', 10);
    for (const baker of bakers) {
        const userId = uuidv4();
        const bakeryId = uuidv4();
        const subscriptionId = uuidv4();
        // Create user
        db.prepare(`
      INSERT INTO users (id, email, password, name, role, phone, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, baker.email, bakerPassword, baker.name, 'baker', '+1-555-0000', now, now);
        // Create bakery
        const slug = baker.bakeryName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        db.prepare(`
      INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bakeryId, userId, baker.bakeryName, slug, '+1-555-0000', baker.tier, 'active', now, now);
        // Create subscription
        db.prepare(`
      INSERT INTO subscriptions (id, bakery_id, tier, status, monthly_price, started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(subscriptionId, bakeryId, baker.tier, 'active', tierPrices[baker.tier], now, now);
        // Create onboarding steps
        const steps = ['profile_setup', 'add_products', 'add_customers', 'create_first_order', 'team_setup'];
        for (let i = 0; i < steps.length; i++) {
            const completed = i < Math.ceil(steps.length * 0.6); // 60% complete
            db.prepare(`
        INSERT INTO onboarding_steps (id, bakery_id, step, completed, completed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), bakeryId, steps[i], completed ? 1 : 0, completed ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null);
        }
        // Create products
        const productNames = [
            'Chocolate Cake',
            'Croissants',
            'Sourdough Bread',
            'Cupcakes',
            'Brownies',
            'Donuts',
            'Cookies',
            'Banana Bread',
            'Cheesecake',
            'Muffins',
            'Bread Roll',
            'Tart',
            'Eclairs',
            'Macaron',
            'Biscotti',
            'Cinnamon Roll',
            'Focaccia',
            'Tiramisu',
            'Pain au Chocolat',
            'Fruit Tart',
            'Lemon Cake',
            'Carrot Cake',
            'Red Velvet Cake',
            'Vanilla Cake',
            'Strawberry Shortcake',
            'Pumpkin Pie',
            'Apple Pie',
            'Pecan Pie',
            'Key Lime Pie',
            'Cherry Tart',
            'Almond Croissant',
            'Cheese Danish',
            'Apple Danish',
            'Chocolate Eclair',
            'Pistachio Tart',
        ];
        for (let i = 0; i < baker.products; i++) {
            const productId = uuidv4();
            const productName = productNames[i % productNames.length];
            const price = Math.round((Math.random() * 25 + 5) * 100) / 100; // $5-30
            db.prepare(`
        INSERT INTO products (id, bakery_id, name, description, category, price, cost, prep_time_minutes, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(productId, bakeryId, productName, `Fresh and delicious ${productName.toLowerCase()}`, Math.random() > 0.5 ? 'cake' : 'pastry', price, price * 0.4, Math.round(Math.random() * 120 + 15), 1, new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString());
        }
        // Create customers
        const customerNames = [
            'John Smith',
            'Maria Garcia',
            'Ahmed Hassan',
            'Elena Volkov',
            'Yuki Tanaka',
            'Priya Patel',
            'Juan Carlos',
            'Sophie Dubois',
            'Lisa Chen',
            'Marcus Johnson',
            'Anna Mueller',
            'Diego Rodriguez',
            'Isabella Rossi',
            'Hiroshi Yamamoto',
            'Emma Brown',
            'Mateo Lopez',
            'Leah Cohen',
            'Ivan Petrov',
            'Fatima Alibi',
            'David Kim',
        ];
        const createdCustomerIds = [];
        for (let i = 0; i < baker.customers; i++) {
            const customerId = uuidv4();
            createdCustomerIds.push(customerId);
            const customerName = customerNames[i % customerNames.length];
            db.prepare(`
        INSERT INTO customers (id, bakery_id, name, email, phone, is_wholesale, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(customerId, bakeryId, customerName, `${customerName.toLowerCase().replace(/\s/g, '.')}@email.com`, `+1-555-${Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, '0')}`, Math.random() > 0.8 ? 1 : 0, new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString());
        }
        // Create orders spanning 12 months with realistic distribution
        const products = db.prepare('SELECT id, price FROM products WHERE bakery_id = ?').all(bakeryId);
        for (let month = 11; month >= 0; month--) {
            // More recent months have more orders
            const ordersThisMonth = Math.ceil(baker.ordersPerMonth * (1 + month * 0.1));
            for (let i = 0; i < ordersThisMonth; i++) {
                const orderId = uuidv4();
                const orderNumber = `ORD-${Date.now() - Math.random() * 10000}`;
                const customerId = createdCustomerIds[Math.floor(Math.random() * createdCustomerIds.length)];
                const orderDate = new Date();
                orderDate.setMonth(orderDate.getMonth() - month);
                orderDate.setDate(Math.floor(Math.random() * 28) + 1);
                const deliveryDate = new Date(orderDate);
                deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 7) + 1);
                const statuses = ['pending', 'confirmed', 'production', 'ready', 'delivered', 'cancelled'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                const paymentStatuses = ['unpaid', 'partial', 'paid', 'refunded'];
                const paymentStatus = status === 'delivered' ? 'paid' : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
                // Pick 1-3 products for the order
                let total = 0;
                const itemCount = Math.floor(Math.random() * 3) + 1;
                const items = [];
                for (let j = 0; j < itemCount; j++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const quantity = Math.floor(Math.random() * 5) + 1;
                    total += product.price * quantity;
                    items.push({ productId: product.id, quantity, price: product.price });
                }
                db.prepare(`
          INSERT INTO orders (id, bakery_id, customer_id, order_number, status, total, delivery_date, delivery_type, payment_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, bakeryId, customerId, orderNumber, status, total, deliveryDate.toISOString(), Math.random() > 0.3 ? 'pickup' : 'delivery', paymentStatus, orderDate.toISOString(), orderDate.toISOString());
                // Create order items
                for (const item of items) {
                    db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
            VALUES (?, ?, ?, ?, ?)
          `).run(uuidv4(), orderId, item.productId, item.quantity, item.price);
                }
                // Update customer stats
                db.prepare(`
          UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?
        `).run(total, customerId);
            }
        }
        // Create ingredients (for starter+ tiers)
        if (baker.tier !== 'free') {
            const ingredients = [
                { name: 'Flour', unit: 'kg', cost: 1.5 },
                { name: 'Sugar', unit: 'kg', cost: 2.0 },
                { name: 'Butter', unit: 'kg', cost: 8.0 },
                { name: 'Eggs', unit: 'dozen', cost: 4.5 },
                { name: 'Milk', unit: 'liter', cost: 1.2 },
                { name: 'Vanilla Extract', unit: 'ml', cost: 0.05 },
                { name: 'Baking Powder', unit: 'kg', cost: 3.0 },
                { name: 'Salt', unit: 'kg', cost: 0.5 },
            ];
            for (const ingredient of ingredients) {
                db.prepare(`
          INSERT INTO ingredients (id, bakery_id, name, unit, cost_per_unit, stock, min_stock, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), bakeryId, ingredient.name, ingredient.unit, ingredient.cost, Math.random() * 100 + 50, 20, 'baking', now, now);
            }
        }
        // Create employees (for starter+ tiers)
        if (baker.tier !== 'free') {
            const employeeNames = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank'];
            const employeeCount = baker.tier === 'starter' ? 2 : Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < employeeCount; i++) {
                db.prepare(`
          INSERT INTO employees (id, bakery_id, name, email, phone, role, hourly_rate, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), bakeryId, employeeNames[i % employeeNames.length], `employee${i}@email.com`, `+1-555-${Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, '0')}`, ['baker', 'decorator', 'manager'][Math.floor(Math.random() * 3)], Math.round((Math.random() * 8 + 12) * 100) / 100, 1, now);
            }
        }
        // Create notifications
        db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 'info', 'Welcome to Juma Boss', 'Get started by adding your first products and customers', 1, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        if (baker.tier === 'free') {
            db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, 'upgrade', 'Unlock more features', 'Upgrade to Starter to access inventory management and team features', 0, now);
        }
    }
    // Create announcements
    db.prepare(`
    INSERT INTO announcements (id, author_id, title, message, target_tiers, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), adminId, 'Welcome to Juma Boss v2', 'We are excited to announce the latest version of Juma Boss with improved performance and new features!', null, 1, now);
    db.prepare(`
    INSERT INTO announcements (id, author_id, title, message, target_tiers, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), adminId, 'New Analytics Dashboard Available', 'Check out our new advanced analytics dashboard for better insights into your business.', 'pro,enterprise', 1, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());
    console.log('Database seeded successfully!');
}
// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase();
}
//# sourceMappingURL=seed.js.map