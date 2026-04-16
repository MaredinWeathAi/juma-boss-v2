import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../juma-boss.db');
let db;
export function getDB() {
    if (!db) {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}
function columnExists(tableName, columnName) {
    try {
        db.prepare(`SELECT ${columnName} FROM ${tableName} LIMIT 0`).all();
        return true;
    }
    catch {
        return false;
    }
}
export function initDB() {
    db = getDB();
    // Check if subscriptions table exists and add missing columns
    try {
        const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions'").get();
        if (result) {
            // Table exists, check for and add missing columns
            if (!columnExists('subscriptions', 'billing_cycle')) {
                db.exec(`
          ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly';
        `);
            }
            if (!columnExists('subscriptions', 'annual_discount_applied')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN annual_discount_applied INT DEFAULT 0;`);
            }
            if (!columnExists('subscriptions', 'next_billing_date')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN next_billing_date TEXT;`);
            }
            if (!columnExists('subscriptions', 'trial_ends_at')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN trial_ends_at TEXT;`);
            }
            if (!columnExists('subscriptions', 'payment_method_id')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN payment_method_id TEXT;`);
            }
            if (!columnExists('subscriptions', 'failed_payment_count')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN failed_payment_count INT DEFAULT 0;`);
            }
            if (!columnExists('subscriptions', 'grace_period_end')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN grace_period_end TEXT;`);
            }
            if (!columnExists('subscriptions', 'updated_at')) {
                db.exec(`ALTER TABLE subscriptions ADD COLUMN updated_at TEXT;`);
            }
        }
    }
    catch {
        // Table doesn't exist, will be created below
    }
    // Check if billing_history table exists and add missing columns
    try {
        const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='billing_history'").get();
        if (result) {
            if (!columnExists('billing_history', 'description')) {
                db.exec(`ALTER TABLE billing_history ADD COLUMN description TEXT;`);
            }
        }
    }
    catch {
        // Table doesn't exist, will be created below
    }
    // Users table
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'baker')),
      phone TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);
    // Bakeries table
    db.exec(`
    CREATE TABLE IF NOT EXISTS bakeries (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      logo_url TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tier TEXT NOT NULL CHECK(tier IN ('free', 'starter', 'pro', 'enterprise')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'churned')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_bakeries_owner_id ON bakeries(owner_id);
    CREATE INDEX IF NOT EXISTS idx_bakeries_slug ON bakeries(slug);
    CREATE INDEX IF NOT EXISTS idx_bakeries_status ON bakeries(status);
    CREATE INDEX IF NOT EXISTS idx_bakeries_tier ON bakeries(tier);
  `);
    // Subscriptions table
    db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL UNIQUE,
      tier TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'past_due', 'cancelled', 'trialing')),
      monthly_price REAL NOT NULL,
      started_at TEXT NOT NULL,
      current_period_end TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
      annual_discount_applied INT DEFAULT 0,
      next_billing_date TEXT,
      trial_ends_at TEXT,
      payment_method_id TEXT,
      failed_payment_count INT DEFAULT 0,
      grace_period_end TEXT,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id),
      FOREIGN KEY (payment_method_id) REFERENCES baker_payment_methods(id)
    );
    CREATE INDEX IF NOT EXISTS idx_subscriptions_bakery_id ON subscriptions(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);
  `);
    // Subscription plans table
    db.exec(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      monthly_price REAL NOT NULL,
      annual_price REAL NOT NULL,
      features TEXT,
      max_products INT,
      max_customers INT,
      max_orders_per_month INT,
      is_active INT DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
    CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);
  `);
    // Billing history table
    db.exec(`
    CREATE TABLE IF NOT EXISTS billing_history (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      bakery_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'BRL',
      billing_period_start TEXT,
      billing_period_end TEXT,
      payment_method TEXT CHECK(payment_method IN ('pix', 'credit_card', 'debit_card', 'boleto')),
      payment_reference TEXT,
      status TEXT CHECK(status IN ('pending', 'paid', 'failed', 'refunded', 'discount')) DEFAULT 'pending',
      invoice_number TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id)
    );
    CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id ON billing_history(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_billing_history_bakery_id ON billing_history(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(status);
    CREATE INDEX IF NOT EXISTS idx_billing_history_created_at ON billing_history(created_at);
  `);
    // Baker payment methods table
    db.exec(`
    CREATE TABLE IF NOT EXISTS baker_payment_methods (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('pix', 'credit_card', 'debit_card', 'boleto')),
      label TEXT,
      is_default INT DEFAULT 0,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_baker_payment_methods_bakery_id ON baker_payment_methods(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_baker_payment_methods_is_default ON baker_payment_methods(is_default);
  `);
    // Features table
    db.exec(`
    CREATE TABLE IF NOT EXISTS features (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      tier_required TEXT NOT NULL CHECK(tier_required IN ('free', 'starter', 'pro', 'enterprise')),
      category TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_features_tier_required ON features(tier_required);
  `);
    // Products table
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      cost REAL,
      image_url TEXT,
      is_active INT NOT NULL DEFAULT 1,
      prep_time_minutes INT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_products_bakery_id ON products(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
  `);
    // Customers table
    db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      notes TEXT,
      is_wholesale INT NOT NULL DEFAULT 0,
      company_name TEXT,
      total_orders INT NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_customers_bakery_id ON customers(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_customers_is_wholesale ON customers(is_wholesale);
  `);
    // Orders table
    db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'production', 'ready', 'delivered', 'cancelled')),
      total REAL NOT NULL,
      notes TEXT,
      delivery_date TEXT,
      delivery_type TEXT CHECK(delivery_type IN ('pickup', 'delivery')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_bakery_id ON orders(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  `);
    // Order items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INT NOT NULL,
      unit_price REAL NOT NULL,
      notes TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
  `);
    // Ingredients/Inventory table
    db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      cost_per_unit REAL NOT NULL,
      stock REAL NOT NULL,
      min_stock REAL,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ingredients_bakery_id ON ingredients(bakery_id);
  `);
    // Employees table
    db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      hourly_rate REAL,
      is_active INT NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_employees_bakery_id ON employees(bakery_id);
  `);
    // Notifications table
    db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INT NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
  `);
    // Onboarding steps table
    db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_steps (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      step TEXT NOT NULL,
      completed INT NOT NULL DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE,
      UNIQUE(bakery_id, step)
    );
    CREATE INDEX IF NOT EXISTS idx_onboarding_steps_bakery_id ON onboarding_steps(bakery_id);
  `);
    // Payments table
    db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      bakery_id TEXT NOT NULL,
      order_id TEXT,
      customer_id TEXT,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('pix', 'cash', 'card', 'other')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (bakery_id) REFERENCES bakeries(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_bakery_id ON payments(bakery_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
    CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
  `);
    // Audit log table
    db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);
    // Announcements table
    db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      target_tiers TEXT,
      is_active INT NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
  `);
    // Recipe items table
    db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_items (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantity_per_batch REAL NOT NULL,
      batch_size INT NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_recipe_items_product_id ON recipe_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_items_ingredient_id ON recipe_items(ingredient_id);
  `);
}
export function getBakeryForUser(userId) {
    const db = getDB();
    return db.prepare('SELECT * FROM bakeries WHERE owner_id = ?').get(userId);
}
export default getDB;
//# sourceMappingURL=index.js.map