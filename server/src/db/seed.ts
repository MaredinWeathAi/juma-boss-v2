import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from './index.js';

export function seedDatabase(): void {
  initDB();
  const db = getDB();

  // Clear existing data (disable FK checks to avoid ordering issues)
  db.exec(`PRAGMA foreign_keys = OFF;`);
  db.exec(`
    DELETE FROM announcements;
    DELETE FROM audit_log;
    DELETE FROM onboarding_steps;
    DELETE FROM notifications;
    DELETE FROM employees;
    DELETE FROM recipe_items;
    DELETE FROM ingredients;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM customers;
    DELETE FROM products;
    DELETE FROM billing_history;
    DELETE FROM baker_payment_methods;
    DELETE FROM subscriptions;
    DELETE FROM bakeries;
    DELETE FROM users;
    DELETE FROM features;
    DELETE FROM subscription_plans;
  `);
  // Also clean payments table
  try { db.exec(`DELETE FROM payments;`); } catch (_) { /* table might not exist yet */ }
  db.exec(`PRAGMA foreign_keys = ON;`);

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

  // Subscription plans (Brazilian market with R$ prices)
  const subscriptionPlans = [
    {
      id: 'plan-free',
      name: 'Grátis',
      slug: 'free',
      monthlyPrice: 0,
      annualPrice: 0,
      maxProducts: 10,
      maxCustomers: 20,
      maxOrdersPerMonth: 50,
      features: ['Gestão de pedidos', 'Catálogo de produtos', 'Gestão de clientes', 'Suporte por email'],
    },
    {
      id: 'plan-starter',
      name: 'Iniciante',
      slug: 'starter',
      monthlyPrice: 15,
      annualPrice: 153,
      maxProducts: 50,
      maxCustomers: 100,
      maxOrdersPerMonth: 500,
      features: [
        'Tudo do plano Grátis',
        'Gestão de inventário',
        'Relatórios básicos',
        'Até 3 funcionários',
        'Dashboard de vendas',
        'Suporte prioritário',
      ],
    },
    {
      id: 'plan-pro',
      name: 'Profissional',
      slug: 'pro',
      monthlyPrice: 29,
      annualPrice: 296,
      maxProducts: 200,
      maxCustomers: 500,
      maxOrdersPerMonth: 2000,
      features: [
        'Tudo do plano Iniciante',
        'Planejamento de produção',
        'Gestão de vendas no atacado',
        'Funcionários ilimitados',
        'Análise avançada',
        'Integração com marketplace',
        'Suporte 24/7',
      ],
    },
    {
      id: 'plan-enterprise',
      name: 'Empresa',
      slug: 'enterprise',
      monthlyPrice: 49,
      annualPrice: 500,
      maxProducts: null,
      maxCustomers: null,
      maxOrdersPerMonth: null,
      features: [
        'Tudo do plano Profissional',
        'Acesso à API REST',
        'Múltiplas localizações',
        'Suporte dedicado 24/7',
        'White label',
        'Integração customizada',
        'Auditoria avançada',
      ],
    },
  ];

  for (const plan of subscriptionPlans) {
    db.prepare(`
      INSERT INTO subscription_plans (id, name, slug, monthly_price, annual_price, features, max_products, max_customers, max_orders_per_month, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id,
      plan.name,
      plan.slug,
      plan.monthlyPrice,
      plan.annualPrice,
      JSON.stringify(plan.features),
      plan.maxProducts,
      plan.maxCustomers,
      plan.maxOrdersPerMonth,
      1,
      now
    );
  }

  // ===== SCALING SETUP =====

  // Brazilian first names (male and female)
  const firstNamesMale = [
    'João', 'José', 'Carlos', 'Pedro', 'Antônio', 'Francisco', 'Paulo', 'Marcos', 'Lucas', 'Rafael',
    'Thiago', 'Anderson', 'Roberto', 'Felipe', 'Eduardo', 'Diego', 'Rodrigo', 'Gustavo', 'Henrique',
    'André', 'Leandro', 'Ricardo', 'Vinícius', 'Renato', 'Bruno', 'Fabio', 'Gabriel', 'Mateus',
    'Vinicius', 'Fábio', 'Emerson', 'Julio', 'Leandro', 'Murilo', 'Nuno', 'Otavio', 'Rui',
    'Samuel', 'Tarciso', 'Ulisses', 'Valter', 'Wagner', 'Xavier', 'Yuri', 'Zé',
  ];

  const firstNamesFemale = [
    'Maria', 'Ana', 'Lucia', 'Fernanda', 'Juliana', 'Patrícia', 'Camila', 'Isabela', 'Adriana', 'Beatriz',
    'Daniela', 'Elisa', 'Francisca', 'Gabriela', 'Helena', 'Irene', 'Joana', 'Katrina', 'Larissa',
    'Mariana', 'Natália', 'Olivia', 'Patricia', 'Quelida', 'Raquel', 'Simone', 'Tatiana', 'Ursula',
    'Vanessa', 'Wanda', 'Xenia', 'Yara', 'Zelia', 'Agatha', 'Bruna', 'Celeste', 'Debora',
  ];

  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Ferreira', 'Rodrigues', 'Martins', 'Gomes',
    'Alves', 'Carvalho', 'Ribeiro', 'Rocha', 'Tavares', 'Teixeira', 'Barros', 'Barbosa', 'Araújo',
    'Pereira', 'Neves', 'Leite', 'Lima', 'Lopes', 'Nascimento', 'Mendes', 'Monteiro', 'Moreira',
    'Melo', 'Dias', 'Correia', 'Cavalcanti', 'Campos', 'Castro', 'Freitas', 'Gonçalves', 'Azevedo',
    'Batista', 'Pinto', 'Duarte', 'Nunes', 'Ramos', 'Fernandes', 'Moura', 'Almeida', 'Peixoto',
    'Vieira', 'Machado', 'Cardoso', 'Ribera', 'Vargas', 'Viana', 'Veloso', 'Vasconcelos',
  ];

  // Bakery name patterns
  const bakeryPrefixes = [
    'Padaria', 'Confeitaria', 'Forno', 'Doces da', 'Bolos da', 'Pão', 'Fornalha', 'Rede',
    'Café & Pão', 'Delícias de', 'Arte em', 'Casa do', 'Sabor de', 'Tradicional', 'Artesanal',
    'Mini', 'Mega', 'Super', 'Premium', 'Gourmet', 'Especializada em',
  ];

  const bakerySuffixes = [
    'Padaria', 'Confeitaria', 'Bolos', 'Pães', 'Doces', 'Salgados', 'Pâtisserie', 'Bakery',
    '& Cia', 'Ltda', 'Express', 'Plus', 'Gourmet',
  ];

  // Customer names (40 as in original)
  const customerNames = [
    'João Silva', 'Maria Oliveira', 'José Santos', 'Ana Souza', 'Francisco Lima',
    'Adriana Pereira', 'Antônio Costa', 'Juliana Rodrigues', 'Paulo Almeida', 'Fernanda Nascimento',
    'Marcos Araújo', 'Beatriz Carvalho', 'Lucas Gomes', 'Patrícia Ribeiro', 'Ricardo Martins',
    'Camila Barbosa', 'Eduardo Rocha', 'Letícia Dias', 'Gabriel Moreira', 'Larissa Vieira',
    'Renato Melo', 'Daniela Teixeira', 'Felipe Cardoso', 'Vanessa Correia', 'Bruno Cavalcanti',
    'Aline Monteiro', 'Diego Pinto', 'Priscila Duarte', 'Rodrigo Nunes', 'Tatiana Campos',
    'André Batista', 'Natália Freitas', 'Vinícius Ramos', 'Cristiane Azevedo', 'Leandro Lopes',
    'Mariana Castro', 'Gustavo Fernandes', 'Simone Gonçalves', 'Henrique Moura', 'Raquel Mendes',
  ];

  // Product data (45 as in original)
  const productData = [
    { name: 'Pão Francês', category: 'pão', priceRange: [0.80, 1.50] },
    { name: 'Pão de Queijo', category: 'pão', priceRange: [3, 6] },
    { name: 'Bolo de Chocolate', category: 'bolo', priceRange: [25, 55] },
    { name: 'Bolo de Cenoura', category: 'bolo', priceRange: [20, 45] },
    { name: 'Brigadeiro', category: 'doce', priceRange: [2, 5] },
    { name: 'Coxinha', category: 'salgado', priceRange: [4, 8] },
    { name: 'Empada', category: 'salgado', priceRange: [5, 10] },
    { name: 'Croissant', category: 'folhado', priceRange: [6, 12] },
    { name: 'Sonho', category: 'doce', priceRange: [5, 10] },
    { name: 'Torta de Limão', category: 'torta', priceRange: [30, 65] },
    { name: 'Bolo de Fubá', category: 'bolo', priceRange: [15, 35] },
    { name: 'Rosca de Polvilho', category: 'biscoito', priceRange: [8, 18] },
    { name: 'Cupcake', category: 'doce', priceRange: [6, 12] },
    { name: 'Pão de Mel', category: 'doce', priceRange: [4, 8] },
    { name: 'Torta Salgada', category: 'torta', priceRange: [25, 50] },
    { name: 'Bolo Red Velvet', category: 'bolo', priceRange: [35, 70] },
    { name: 'Focaccia', category: 'pão', priceRange: [12, 25] },
    { name: 'Quiche Lorraine', category: 'torta', priceRange: [18, 35] },
    { name: 'Bolo de Milho', category: 'bolo', priceRange: [15, 30] },
    { name: 'Palmier', category: 'folhado', priceRange: [3, 7] },
    { name: 'Bolo Prestígio', category: 'bolo', priceRange: [30, 60] },
    { name: 'Pão Integral', category: 'pão', priceRange: [8, 16] },
    { name: 'Esfiha', category: 'salgado', priceRange: [4, 8] },
    { name: 'Carolina', category: 'doce', priceRange: [3, 6] },
    { name: 'Bolo de Aniversário', category: 'bolo', priceRange: [50, 120] },
    { name: 'Biscoito Amanteigado', category: 'biscoito', priceRange: [12, 25] },
    { name: 'Pão de Batata', category: 'pão', priceRange: [4, 8] },
    { name: 'Torta Holandesa', category: 'torta', priceRange: [35, 70] },
    { name: 'Broa de Milho', category: 'pão', priceRange: [3, 7] },
    { name: 'Pudim', category: 'doce', priceRange: [15, 30] },
    { name: 'Bolo Formigueiro', category: 'bolo', priceRange: [18, 35] },
    { name: 'Pastel de Nata', category: 'folhado', priceRange: [5, 10] },
    { name: 'Enroladinho de Salsicha', category: 'salgado', priceRange: [3, 7] },
    { name: 'Bolo Nega Maluca', category: 'bolo', priceRange: [25, 50] },
    { name: 'Cheese Bread Ball (100g)', category: 'pão', priceRange: [5, 10] },
    { name: 'Torta de Frango', category: 'torta', priceRange: [22, 45] },
    { name: 'Mini Quiche (6un)', category: 'salgado', priceRange: [18, 35] },
    { name: 'Bolo Vulcão', category: 'bolo', priceRange: [40, 80] },
    { name: 'Pão Australiano', category: 'pão', priceRange: [10, 20] },
    { name: 'Kit Festa (100 doces)', category: 'kit', priceRange: [150, 300] },
    { name: 'Brownie', category: 'doce', priceRange: [6, 12] },
    { name: 'Macaron (6un)', category: 'doce', priceRange: [25, 45] },
    { name: 'Bolo Naked Cake', category: 'bolo', priceRange: [60, 130] },
    { name: 'Cento de Salgados', category: 'kit', priceRange: [80, 160] },
    { name: 'Trufas (10un)', category: 'doce', priceRange: [20, 40] },
  ];

  // Ingredient definitions for recipes
  const ingredients = [
    { name: 'Farinha de Trigo', unit: 'kg', cost: 5.50 },
    { name: 'Açúcar Cristal', unit: 'kg', cost: 4.80 },
    { name: 'Manteiga', unit: 'kg', cost: 32.00 },
    { name: 'Ovos', unit: 'dúzia', cost: 12.00 },
    { name: 'Leite Integral', unit: 'litro', cost: 5.50 },
    { name: 'Essência de Baunilha', unit: 'ml', cost: 0.15 },
    { name: 'Fermento em Pó', unit: 'kg', cost: 18.00 },
    { name: 'Sal', unit: 'kg', cost: 3.00 },
    { name: 'Chocolate em Pó', unit: 'kg', cost: 25.00 },
    { name: 'Creme de Leite', unit: 'litro', cost: 8.00 },
    { name: 'Leite Condensado', unit: 'lata', cost: 6.50 },
    { name: 'Polvilho', unit: 'kg', cost: 9.00 },
  ];

  // Recipe templates by category
  const recipeTemplates: Record<string, { ingredientName: string; qty: number; batch: number }[]> = {
    'pão': [
      { ingredientName: 'Farinha de Trigo', qty: 0.5, batch: 10 },
      { ingredientName: 'Sal', qty: 0.02, batch: 10 },
      { ingredientName: 'Fermento em Pó', qty: 0.01, batch: 10 },
      { ingredientName: 'Manteiga', qty: 0.05, batch: 10 },
    ],
    'bolo': [
      { ingredientName: 'Farinha de Trigo', qty: 0.3, batch: 1 },
      { ingredientName: 'Açúcar Cristal', qty: 0.25, batch: 1 },
      { ingredientName: 'Ovos', qty: 0.5, batch: 1 },
      { ingredientName: 'Manteiga', qty: 0.15, batch: 1 },
      { ingredientName: 'Leite Integral', qty: 0.2, batch: 1 },
      { ingredientName: 'Essência de Baunilha', qty: 5, batch: 1 },
      { ingredientName: 'Fermento em Pó', qty: 0.015, batch: 1 },
    ],
    'doce': [
      { ingredientName: 'Leite Condensado', qty: 1, batch: 20 },
      { ingredientName: 'Chocolate em Pó', qty: 0.1, batch: 20 },
      { ingredientName: 'Manteiga', qty: 0.05, batch: 20 },
      { ingredientName: 'Creme de Leite', qty: 0.2, batch: 20 },
    ],
    'salgado': [
      { ingredientName: 'Farinha de Trigo', qty: 0.4, batch: 20 },
      { ingredientName: 'Ovos', qty: 0.3, batch: 20 },
      { ingredientName: 'Manteiga', qty: 0.1, batch: 20 },
      { ingredientName: 'Sal', qty: 0.02, batch: 20 },
      { ingredientName: 'Leite Integral', qty: 0.15, batch: 20 },
    ],
    'torta': [
      { ingredientName: 'Farinha de Trigo', qty: 0.35, batch: 1 },
      { ingredientName: 'Manteiga', qty: 0.2, batch: 1 },
      { ingredientName: 'Ovos', qty: 0.4, batch: 1 },
      { ingredientName: 'Creme de Leite', qty: 0.3, batch: 1 },
      { ingredientName: 'Açúcar Cristal', qty: 0.15, batch: 1 },
    ],
    'biscoito': [
      { ingredientName: 'Farinha de Trigo', qty: 0.4, batch: 30 },
      { ingredientName: 'Manteiga', qty: 0.2, batch: 30 },
      { ingredientName: 'Açúcar Cristal', qty: 0.15, batch: 30 },
      { ingredientName: 'Ovos', qty: 0.25, batch: 30 },
    ],
    'folhado': [
      { ingredientName: 'Farinha de Trigo', qty: 0.3, batch: 10 },
      { ingredientName: 'Manteiga', qty: 0.25, batch: 10 },
      { ingredientName: 'Sal', qty: 0.01, batch: 10 },
      { ingredientName: 'Ovos', qty: 0.2, batch: 10 },
    ],
  };

  // Pre-hash the password once for all bakers
  const bakerPassword = bcryptjs.hashSync('demo123', 10);

  // Distribution: 981 bakers
  // Free: 490 (50%)
  // Starter: 295 (30%)
  // Pro: 148 (15%)
  // Enterprise: 48 (5%)
  //
  // Named demo accounts (first baker in each tier gets a friendly email):
  //   maria@jumaboss.com     / demo123  — Free tier
  //   carlos@jumaboss.com    / demo123  — Starter tier
  //   patricia@jumaboss.com  / demo123  — Pro tier
  //   regina@jumaboss.com    / demo123  — Enterprise tier

  const namedDemoAccounts: Record<string, { email: string; name: string; bakeryName: string }> = {
    free:       { email: 'maria@jumaboss.com',    name: 'Maria Santos',        bakeryName: 'Doces da Maria' },
    starter:    { email: 'carlos@jumaboss.com',   name: 'Carlos Oliveira',     bakeryName: 'Padaria do Carlos' },
    pro:        { email: 'patricia@jumaboss.com', name: 'Patrícia Rodrigues',  bakeryName: 'Confeitaria Artesanal PR' },
    enterprise: { email: 'regina@jumaboss.com',   name: 'Regina Carvalho',     bakeryName: 'Rede Carvalho Padarias' },
  };

  const bakerTargets = [
    { tier: 'free', count: 490, minProducts: 3, maxProducts: 8, minCustomers: 3, maxCustomers: 10, minOrderMonths: 3, maxOrderMonths: 6, ordersPerMonthMin: 5, ordersPerMonthMax: 15 },
    { tier: 'starter', count: 295, minProducts: 10, maxProducts: 25, minCustomers: 15, maxCustomers: 40, minOrderMonths: 4, maxOrderMonths: 8, ordersPerMonthMin: 25, ordersPerMonthMax: 60 },
    { tier: 'pro', count: 148, minProducts: 20, maxProducts: 40, minCustomers: 40, maxCustomers: 100, minOrderMonths: 6, maxOrderMonths: 10, ordersPerMonthMin: 60, ordersPerMonthMax: 150 },
    { tier: 'enterprise', count: 48, minProducts: 30, maxProducts: 50, minCustomers: 80, maxCustomers: 250, minOrderMonths: 8, maxOrderMonths: 12, ordersPerMonthMin: 150, ordersPerMonthMax: 300 },
  ];

  const tierPrices: any = { free: 0, starter: 15, pro: 29, enterprise: 49 };

  // Prepare INSERT statements once (reuse)
  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, email, password, name, role, phone, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBakeryStmt = db.prepare(`
    INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPaymentMethodStmt = db.prepare(`
    INSERT INTO baker_payment_methods (id, bakery_id, type, label, is_default, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubscriptionStmt = db.prepare(`
    INSERT INTO subscriptions (id, bakery_id, tier, status, monthly_price, started_at, current_period_end, trial_ends_at, next_billing_date, billing_cycle, payment_method_id, failed_payment_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBillingHistoryStmt = db.prepare(`
    INSERT INTO billing_history (id, subscription_id, bakery_id, amount, currency, billing_period_start, billing_period_end, payment_method, payment_reference, status, invoice_number, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOnboardingStmt = db.prepare(`
    INSERT INTO onboarding_steps (id, bakery_id, step, completed, completed_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertProductStmt = db.prepare(`
    INSERT INTO products (id, bakery_id, name, description, category, price, cost, prep_time_minutes, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCustomerStmt = db.prepare(`
    INSERT INTO customers (id, bakery_id, name, email, phone, is_wholesale, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderStmt = db.prepare(`
    INSERT INTO orders (id, bakery_id, customer_id, order_number, status, total, delivery_date, delivery_type, payment_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItemStmt = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, quantity, unit_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateCustomerStmt = db.prepare(`
    UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?
  `);

  const insertPaymentStmt = db.prepare(`
    INSERT INTO payments (id, bakery_id, order_id, customer_id, amount, method, status, reference, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertIngredientStmt = db.prepare(`
    INSERT INTO ingredients (id, bakery_id, name, unit, cost_per_unit, stock, min_stock, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRecipeItemStmt = db.prepare(`
    INSERT INTO recipe_items (id, product_id, ingredient_id, quantity_per_batch, batch_size, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertEmployeeStmt = db.prepare(`
    INSERT INTO employees (id, bakery_id, name, email, phone, role, hourly_rate, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertNotificationStmt = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Global counter for progress logging
  let globalBakerCount = 0;

  // Process each tier
  for (const tierTarget of bakerTargets) {
    console.log(`\nStarting ${tierTarget.tier} tier: ${tierTarget.count} bakers`);

    // Use transaction for batch inserts
    db.exec('BEGIN TRANSACTION');

    for (let i = 0; i < tierTarget.count; i++) {
      globalBakerCount++;

      if (globalBakerCount % 100 === 0) {
        console.log(`Seeded ${globalBakerCount} bakers...`);
      }

      const bakerIndex = globalBakerCount - 1;
      const isFirstInTier = (i === 0);
      const demoAccount = isFirstInTier ? namedDemoAccounts[tierTarget.tier] : null;

      const isMale = Math.random() > 0.5;
      const firstName = isMale
        ? firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)]
        : firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const bakerName = demoAccount ? demoAccount.name : `${firstName} ${lastName}`;
      const bakerEmail = demoAccount ? demoAccount.email : `baker${bakerIndex}@jumaboss.com`;

      const userId = uuidv4();
      const bakeryId = uuidv4();
      const subscriptionId = uuidv4();
      const paymentMethodId = uuidv4();

      // Generate bakery name
      let bakeryName = '';
      if (demoAccount) {
        bakeryName = demoAccount.bakeryName;
      } else {
        const bakeryPrefix = bakeryPrefixes[Math.floor(Math.random() * bakeryPrefixes.length)];
        const bakerySuffix = bakerySuffixes[Math.floor(Math.random() * bakerySuffixes.length)];
        if (bakeryPrefix === 'Rede' || bakeryPrefix === 'Mega' || bakeryPrefix === 'Super') {
          bakeryName = `${bakeryPrefix} ${lastName} ${bakerySuffix}`;
        } else {
          bakeryName = `${bakeryPrefix} ${lastName}`;
        }
      }

      const slug = demoAccount
        ? demoAccount.bakeryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : `bakery-${bakerIndex}`;

      // Phone generation
      const phoneArea = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '27'][bakerIndex % 10];
      const phoneNum = `+55${phoneArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`;

      // Calculate subscription/creation dates — stagger start dates for realistic cohort data
      const monthsAgo = Math.floor(Math.random() * 10) + 2;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);
      // Add random day offset within the month for more natural distribution
      startDate.setDate(Math.floor(Math.random() * 28) + 1);
      const bakerCreatedAt = startDate.toISOString();

      // Create user (created_at = staggered start date, not now)
      insertUserStmt.run(userId, bakerEmail, bakerPassword, bakerName, 'baker', phoneNum, bakerCreatedAt, bakerCreatedAt);

      // Create bakery (created_at = staggered start date, not now)
      insertBakeryStmt.run(bakeryId, userId, bakeryName, slug, phoneNum, tierTarget.tier, 'active', bakerCreatedAt, bakerCreatedAt);

      // Create payment method
      const paymentDetails = {
        pix_key: `cpf-${Math.floor(Math.random() * 100000000)}`,
        type: 'pix',
      };
      insertPaymentMethodStmt.run(
        paymentMethodId,
        bakeryId,
        'pix',
        'PIX - CPF',
        1,
        JSON.stringify(paymentDetails),
        bakerCreatedAt
      );
      const nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + Math.floor(Math.random() * 25) + 3);

      const subStatus = bakerIndex % 5 === 0 && tierTarget.tier !== 'free' ? 'trialing' : 'active';

      // Create subscription
      insertSubscriptionStmt.run(
        subscriptionId,
        bakeryId,
        tierTarget.tier,
        subStatus,
        tierPrices[tierTarget.tier],
        startDate.toISOString(),
        nextBillingDate.toISOString(),
        subStatus === 'trialing' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        nextBillingDate.toISOString(),
        'monthly',
        tierTarget.tier !== 'free' ? paymentMethodId : null,
        0,
        startDate.toISOString()
      );

      // Billing history for paid subscriptions
      if (tierTarget.tier !== 'free') {
        const paymentMethodOptions = ['pix', 'credit_card', 'boleto'];
        const chosenMethod = paymentMethodOptions[bakerIndex % paymentMethodOptions.length] as 'pix' | 'credit_card' | 'boleto';

        for (let m = monthsAgo; m >= 1; m--) {
          const periodStart = new Date();
          periodStart.setMonth(periodStart.getMonth() - m);
          periodStart.setDate(1);
          const periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);

          const invoiceNumber = `JB-${periodStart.getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
          const isFailed = m === 2 && bakerIndex % 4 === 0;

          insertBillingHistoryStmt.run(
            uuidv4(),
            subscriptionId,
            bakeryId,
            tierPrices[tierTarget.tier],
            'BRL',
            periodStart.toISOString(),
            periodEnd.toISOString(),
            chosenMethod,
            chosenMethod === 'pix' ? `PIX-${Math.floor(Math.random() * 1000000)}` : `REF-${Math.floor(Math.random() * 1000000)}`,
            isFailed ? 'failed' : 'paid',
            invoiceNumber,
            isFailed ? 'Payment failed - insufficient funds' : null,
            new Date(periodStart).toISOString()
          );
        }
      }

      // Onboarding steps
      const steps = ['profile_setup', 'add_products', 'add_customers', 'create_first_order', 'team_setup'];
      for (let idx = 0; idx < steps.length; idx++) {
        const completed = idx < Math.ceil(steps.length * 0.6);
        insertOnboardingStmt.run(
          uuidv4(),
          bakeryId,
          steps[idx],
          completed ? 1 : 0,
          completed ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null
        );
      }

      // Generate products
      const productCount = Math.floor(Math.random() * (tierTarget.maxProducts - tierTarget.minProducts + 1)) + tierTarget.minProducts;
      const createdProducts: { id: string; name: string; category: string; price: number }[] = [];

      for (let p = 0; p < productCount; p++) {
        const productId = uuidv4();
        const product = productData[p % productData.length];
        const price = Math.round((Math.random() * (product.priceRange[1] - product.priceRange[0]) + product.priceRange[0]) * 100) / 100;

        insertProductStmt.run(
          productId,
          bakeryId,
          product.name,
          `${product.name} artesanal, feito com ingredientes selecionados`,
          product.category,
          price,
          Math.round(price * 0.35 * 100) / 100,
          Math.round(Math.random() * 120 + 15),
          1,
          new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
        );

        createdProducts.push({ id: productId, name: product.name, category: product.category, price });
      }

      // Generate customers
      const customerCount = Math.floor(Math.random() * (tierTarget.maxCustomers - tierTarget.minCustomers + 1)) + tierTarget.minCustomers;
      const createdCustomerIds: string[] = [];

      for (let c = 0; c < customerCount; c++) {
        const customerId = uuidv4();
        createdCustomerIds.push(customerId);
        const customerName = customerNames[c % customerNames.length];

        const custArea = ['11', '21', '31', '41', '51'][Math.floor(Math.random() * 5)];
        insertCustomerStmt.run(
          customerId,
          bakeryId,
          customerName,
          `${customerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '.')}@email.com`,
          `+55${custArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`,
          Math.random() > 0.8 ? 1 : 0,
          new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString()
        );
      }

      // Generate orders
      const ordersPerMonth = Math.floor(Math.random() * (tierTarget.ordersPerMonthMax - tierTarget.ordersPerMonthMin + 1)) + tierTarget.ordersPerMonthMin;
      const maxMonths = Math.floor(Math.random() * (tierTarget.maxOrderMonths - tierTarget.minOrderMonths + 1)) + tierTarget.minOrderMonths;

      for (let month = maxMonths - 1; month >= 0; month--) {
        const growthFactor = 0.5 + ((maxMonths - 1 - month) / maxMonths) * 0.8;
        const ordersThisMonth = Math.ceil(ordersPerMonth * growthFactor);

        for (let o = 0; o < ordersThisMonth; o++) {
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

          let total = 0;
          const itemCount = Math.floor(Math.random() * 3) + 1;
          const items = [];

          for (let j = 0; j < itemCount; j++) {
            const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            total += product.price * quantity;
            items.push({ productId: product.id, quantity, price: product.price });
          }

          insertOrderStmt.run(
            orderId,
            bakeryId,
            customerId,
            orderNumber,
            status,
            total,
            deliveryDate.toISOString(),
            Math.random() > 0.3 ? 'pickup' : 'delivery',
            paymentStatus,
            orderDate.toISOString(),
            orderDate.toISOString()
          );

          // Order items
          for (const item of items) {
            insertOrderItemStmt.run(uuidv4(), orderId, item.productId, item.quantity, item.price);
          }

          // Update customer stats
          updateCustomerStmt.run(total, customerId);

          // Payments for paid orders
          if (paymentStatus === 'paid') {
            const method = ['pix', 'cash', 'card'][Math.floor(Math.random() * 3)];
            insertPaymentStmt.run(
              uuidv4(),
              bakeryId,
              orderId,
              customerId,
              total,
              method,
              'completed',
              method === 'pix' ? `PIX-${Math.floor(Math.random() * 1000000)}` : null,
              orderDate.toISOString()
            );
          }
        }
      }

      // Ingredients (starter+ tiers)
      const createdIngredientIds: { id: string; name: string; unit: string; cost: number }[] = [];
      if (tierTarget.tier !== 'free') {
        for (const ingredient of ingredients) {
          const ingredientId = uuidv4();
          insertIngredientStmt.run(
            ingredientId,
            bakeryId,
            ingredient.name,
            ingredient.unit,
            ingredient.cost,
            Math.random() * 100 + 50,
            20,
            'baking',
            now,
            now
          );
          createdIngredientIds.push({ id: ingredientId, name: ingredient.name, unit: ingredient.unit, cost: ingredient.cost });
        }

        // Recipe items (~50% of products)
        const ingredientByName = new Map(createdIngredientIds.map(ing => [ing.name, ing]));
        for (const product of createdProducts) {
          if (Math.random() > 0.50) continue;

          const template = recipeTemplates[product.category];
          if (!template) continue;

          for (const recipeItem of template) {
            const ingredient = ingredientByName.get(recipeItem.ingredientName);
            if (!ingredient) continue;

            const qtyVariation = 0.8 + Math.random() * 0.4;
            const adjustedQty = Math.round(recipeItem.qty * qtyVariation * 1000) / 1000;

            insertRecipeItemStmt.run(
              uuidv4(),
              product.id,
              ingredient.id,
              adjustedQty,
              recipeItem.batch,
              now
            );
          }
        }
      }

      // Employees (starter+ tiers)
      if (tierTarget.tier !== 'free') {
        const employeeNames = ['Joana', 'Marcos', 'Cláudia', 'Danilo', 'Elisa', 'Fábio', 'Gabriela', 'Hugo'];
        const employeeCount =
          tierTarget.tier === 'starter'
            ? Math.floor(Math.random() * 3) + 1
            : tierTarget.tier === 'pro'
              ? Math.floor(Math.random() * 4) + 3
              : Math.floor(Math.random() * 8) + 5;

        for (let e = 0; e < employeeCount; e++) {
          const empArea = ['11', '21', '31'][Math.floor(Math.random() * 3)];
          insertEmployeeStmt.run(
            uuidv4(),
            bakeryId,
            employeeNames[e % employeeNames.length],
            `${employeeNames[e % employeeNames.length].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${bakerIndex}@email.com`,
            `+55${empArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`,
            ['baker', 'decorator', 'manager'][Math.floor(Math.random() * 3)],
            Math.round((Math.random() * 8 + 12) * 100) / 100,
            1,
            now
          );
        }
      }

      // Notifications
      insertNotificationStmt.run(
        uuidv4(),
        userId,
        'info',
        'Welcome to Juma Boss',
        'Get started by adding your first products and customers',
        1,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );

      if (tierTarget.tier === 'free') {
        insertNotificationStmt.run(
          uuidv4(),
          userId,
          'upgrade',
          'Unlock more features',
          'Upgrade to Starter to access inventory management and team features',
          0,
          now
        );
      }
    }

    db.exec('COMMIT TRANSACTION');
    console.log(`Completed ${tierTarget.tier} tier: ${tierTarget.count} bakers`);
  }

  // Create announcements
  const insertAnnouncementStmt = db.prepare(`
    INSERT INTO announcements (id, author_id, title, message, target_tiers, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAnnouncementStmt.run(
    uuidv4(),
    adminId,
    'Welcome to Juma Boss v2',
    'We are excited to announce the latest version of Juma Boss with improved performance and new features!',
    null,
    1,
    now
  );

  insertAnnouncementStmt.run(
    uuidv4(),
    adminId,
    'New Analytics Dashboard Available',
    'Check out our new advanced analytics dashboard for better insights into your business.',
    'pro,enterprise',
    1,
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  );

  console.log(`\nDatabase seeded successfully with 981 bakers!`);
  console.log(`Total bakers seeded: ${globalBakerCount}`);
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDB();
  seedDatabase();
}
