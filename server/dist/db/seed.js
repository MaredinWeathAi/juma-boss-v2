import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDB, initDB } from './index.js';
const db = getDB();
export function seedDatabase() {
    initDB();
    // Clear existing data (disable FK checks to avoid ordering issues)
    db.exec(`PRAGMA foreign_keys = OFF;`);
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
    DELETE FROM billing_history;
    DELETE FROM baker_payment_methods;
    DELETE FROM subscriptions;
    DELETE FROM bakeries;
    DELETE FROM users;
    DELETE FROM features;
    DELETE FROM subscription_plans;
  `);
    // Also clean payments table
    try {
        db.exec(`DELETE FROM payments;`);
    }
    catch (_) { /* table might not exist yet */ }
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
    `).run(plan.id, plan.name, plan.slug, plan.monthlyPrice, plan.annualPrice, JSON.stringify(plan.features), plan.maxProducts, plan.maxCustomers, plan.maxOrdersPerMonth, 1, now);
    }
    // Baker accounts with their data — Brazilian names and bakeries
    const bakers = [
        // FREE tier bakers (4)
        {
            email: 'maria@jumaboss.com',
            name: 'Maria Santos',
            bakeryName: 'Doces da Maria',
            tier: 'free',
            products: 5,
            customers: 8,
            ordersPerMonth: 12,
        },
        {
            email: 'ana@jumaboss.com',
            name: 'Ana Costa',
            bakeryName: 'Delícias Caseiras',
            tier: 'free',
            products: 4,
            customers: 6,
            ordersPerMonth: 10,
        },
        {
            email: 'lucia@jumaboss.com',
            name: 'Lúcia Ferreira',
            bakeryName: 'Bolos da Lúcia',
            tier: 'free',
            products: 3,
            customers: 5,
            ordersPerMonth: 8,
        },
        {
            email: 'pedro@jumaboss.com',
            name: 'Pedro Almeida',
            bakeryName: 'Pão do Pedro',
            tier: 'free',
            products: 6,
            customers: 10,
            ordersPerMonth: 15,
        },
        // STARTER tier bakers (5)
        {
            email: 'carlos@jumaboss.com',
            name: 'Carlos Oliveira',
            bakeryName: 'Padaria do Carlos',
            tier: 'starter',
            products: 15,
            customers: 25,
            ordersPerMonth: 45,
        },
        {
            email: 'juliana@jumaboss.com',
            name: 'Juliana Ribeiro',
            bakeryName: 'Confeitaria Ribeiro',
            tier: 'starter',
            products: 12,
            customers: 20,
            ordersPerMonth: 35,
        },
        {
            email: 'rafael@jumaboss.com',
            name: 'Rafael Mendes',
            bakeryName: 'Forno Quente',
            tier: 'starter',
            products: 18,
            customers: 30,
            ordersPerMonth: 50,
        },
        {
            email: 'fernanda@jumaboss.com',
            name: 'Fernanda Lima',
            bakeryName: 'Doce Encanto',
            tier: 'starter',
            products: 10,
            customers: 18,
            ordersPerMonth: 30,
        },
        {
            email: 'thiago@jumaboss.com',
            name: 'Thiago Souza',
            bakeryName: 'Pão & Cia',
            tier: 'starter',
            products: 14,
            customers: 22,
            ordersPerMonth: 40,
        },
        // PRO tier bakers (4)
        {
            email: 'patricia@jumaboss.com',
            name: 'Patrícia Rodrigues',
            bakeryName: 'Confeitaria Artesanal PR',
            tier: 'pro',
            products: 25,
            customers: 60,
            ordersPerMonth: 90,
        },
        {
            email: 'marcelo@jumaboss.com',
            name: 'Marcelo Barbosa',
            bakeryName: 'Padaria Barbosa',
            tier: 'pro',
            products: 30,
            customers: 80,
            ordersPerMonth: 120,
        },
        {
            email: 'camila@jumaboss.com',
            name: 'Camila Araujo',
            bakeryName: 'Pâtisserie Camila',
            tier: 'pro',
            products: 22,
            customers: 55,
            ordersPerMonth: 75,
        },
        {
            email: 'roberto@jumaboss.com',
            name: 'Roberto Nascimento',
            bakeryName: 'Fornalha Padaria',
            tier: 'pro',
            products: 28,
            customers: 70,
            ordersPerMonth: 100,
        },
        // ENTERPRISE tier bakers (3)
        {
            email: 'regina@jumaboss.com',
            name: 'Regina Carvalho',
            bakeryName: 'Rede Carvalho Padarias',
            tier: 'enterprise',
            products: 40,
            customers: 150,
            ordersPerMonth: 200,
        },
        {
            email: 'gustavo@jumaboss.com',
            name: 'Gustavo Pereira',
            bakeryName: 'Grupo Pereira Bakery',
            tier: 'enterprise',
            products: 35,
            customers: 120,
            ordersPerMonth: 180,
        },
        {
            email: 'isabela@jumaboss.com',
            name: 'Isabela Martins',
            bakeryName: 'Império dos Pães',
            tier: 'enterprise',
            products: 45,
            customers: 200,
            ordersPerMonth: 250,
        },
    ];
    const tierPrices = { free: 0, starter: 15, pro: 29, enterprise: 49 };
    const bakerPassword = bcryptjs.hashSync('demo123', 10);
    for (let bakerIndex = 0; bakerIndex < bakers.length; bakerIndex++) {
        const baker = bakers[bakerIndex];
        const userId = uuidv4();
        const bakeryId = uuidv4();
        const subscriptionId = uuidv4();
        const paymentMethodId = uuidv4();
        // Create user
        const phoneArea = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '27'][bakerIndex % 10];
        const phoneNum = `+55${phoneArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`;
        db.prepare(`
      INSERT INTO users (id, email, password, name, role, phone, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, baker.email, bakerPassword, baker.name, 'baker', phoneNum, now, now);
        // Create bakery
        const slug = baker.bakeryName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        db.prepare(`
      INSERT INTO bakeries (id, owner_id, name, slug, phone, tier, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bakeryId, userId, baker.bakeryName, slug, phoneNum, baker.tier, 'active', now, now);
        // Create payment method for the baker
        const paymentDetails = {
            pix_key: `cpf-${Math.floor(Math.random() * 100000000)}`,
            type: 'pix',
        };
        db.prepare(`
      INSERT INTO baker_payment_methods (id, bakery_id, type, label, is_default, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(paymentMethodId, bakeryId, 'pix', 'PIX - CPF', 1, JSON.stringify(paymentDetails), now);
        // Calculate subscription dates — stagger start dates for realism
        const monthsAgo = Math.floor(Math.random() * 8) + 2; // started 2-10 months ago
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - monthsAgo);
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + Math.floor(Math.random() * 25) + 3);
        // Mix of active and trialing subscriptions
        let subStatus = 'active';
        if (baker.tier === 'free')
            subStatus = 'active';
        else if (bakerIndex % 5 === 0)
            subStatus = 'trialing'; // ~20% trialing
        else
            subStatus = 'active';
        // Create subscription with new fields
        db.prepare(`
      INSERT INTO subscriptions (id, bakery_id, tier, status, monthly_price, started_at, current_period_end, trial_ends_at, next_billing_date, billing_cycle, payment_method_id, failed_payment_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(subscriptionId, bakeryId, baker.tier, subStatus, tierPrices[baker.tier], startDate.toISOString(), nextBillingDate.toISOString(), subStatus === 'trialing' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null, nextBillingDate.toISOString(), 'monthly', baker.tier !== 'free' ? paymentMethodId : null, 0, startDate.toISOString());
        // Create billing history records for paid subscriptions (multiple months)
        if (baker.tier !== 'free') {
            const paymentMethodOptions = ['pix', 'credit_card', 'boleto'];
            const chosenMethod = paymentMethodOptions[bakerIndex % paymentMethodOptions.length];
            for (let m = monthsAgo; m >= 1; m--) {
                const periodStart = new Date();
                periodStart.setMonth(periodStart.getMonth() - m);
                periodStart.setDate(1);
                const periodEnd = new Date(periodStart);
                periodEnd.setMonth(periodEnd.getMonth() + 1);
                periodEnd.setDate(0);
                const invoiceNumber = `JB-${periodStart.getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
                // Occasionally mark a payment as failed (for financial reports)
                const isFailed = m === 2 && bakerIndex % 4 === 0;
                db.prepare(`
          INSERT INTO billing_history (id, subscription_id, bakery_id, amount, currency, billing_period_start, billing_period_end, payment_method, payment_reference, status, invoice_number, description, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), subscriptionId, bakeryId, tierPrices[baker.tier], 'BRL', periodStart.toISOString(), periodEnd.toISOString(), chosenMethod, chosenMethod === 'pix' ? `PIX-${Math.floor(Math.random() * 1000000)}` : `REF-${Math.floor(Math.random() * 1000000)}`, isFailed ? 'failed' : 'paid', invoiceNumber, isFailed ? 'Payment failed - insufficient funds' : null, new Date(periodStart).toISOString());
            }
        }
        // Create onboarding steps
        const steps = ['profile_setup', 'add_products', 'add_customers', 'create_first_order', 'team_setup'];
        for (let i = 0; i < steps.length; i++) {
            const completed = i < Math.ceil(steps.length * 0.6); // 60% complete
            db.prepare(`
        INSERT INTO onboarding_steps (id, bakery_id, step, completed, completed_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), bakeryId, steps[i], completed ? 1 : 0, completed ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null);
        }
        // Create products (Brazilian bakery items with R$ prices)
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
        for (let i = 0; i < baker.products; i++) {
            const productId = uuidv4();
            const product = productData[i % productData.length];
            const price = Math.round((Math.random() * (product.priceRange[1] - product.priceRange[0]) + product.priceRange[0]) * 100) / 100;
            db.prepare(`
        INSERT INTO products (id, bakery_id, name, description, category, price, cost, prep_time_minutes, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(productId, bakeryId, product.name, `${product.name} artesanal, feito com ingredientes selecionados`, product.category, price, Math.round(price * 0.35 * 100) / 100, Math.round(Math.random() * 120 + 15), 1, new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString());
        }
        // Create customers (Brazilian names)
        const customerNames = [
            'João Silva',
            'Maria Oliveira',
            'José Santos',
            'Ana Souza',
            'Francisco Lima',
            'Adriana Pereira',
            'Antônio Costa',
            'Juliana Rodrigues',
            'Paulo Almeida',
            'Fernanda Nascimento',
            'Marcos Araújo',
            'Beatriz Carvalho',
            'Lucas Gomes',
            'Patrícia Ribeiro',
            'Ricardo Martins',
            'Camila Barbosa',
            'Eduardo Rocha',
            'Letícia Dias',
            'Gabriel Moreira',
            'Larissa Vieira',
            'Renato Melo',
            'Daniela Teixeira',
            'Felipe Cardoso',
            'Vanessa Correia',
            'Bruno Cavalcanti',
            'Aline Monteiro',
            'Diego Pinto',
            'Priscila Duarte',
            'Rodrigo Nunes',
            'Tatiana Campos',
            'André Batista',
            'Natália Freitas',
            'Vinícius Ramos',
            'Cristiane Azevedo',
            'Leandro Lopes',
            'Mariana Castro',
            'Gustavo Fernandes',
            'Simone Gonçalves',
            'Henrique Moura',
            'Raquel Mendes',
        ];
        const createdCustomerIds = [];
        for (let i = 0; i < baker.customers; i++) {
            const customerId = uuidv4();
            createdCustomerIds.push(customerId);
            const customerName = customerNames[i % customerNames.length];
            const custArea = ['11', '21', '31', '41', '51'][Math.floor(Math.random() * 5)];
            db.prepare(`
        INSERT INTO customers (id, bakery_id, name, email, phone, is_wholesale, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(customerId, bakeryId, customerName, `${customerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s/g, '.')}@email.com`, `+55${custArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`, Math.random() > 0.8 ? 1 : 0, new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000).toISOString());
        }
        // Create orders spanning 12 months with realistic distribution
        const products = db.prepare('SELECT id, price FROM products WHERE bakery_id = ?').all(bakeryId);
        for (let month = 11; month >= 0; month--) {
            // More recent months have more orders (growth trend)
            const growthFactor = 0.5 + ((11 - month) / 11) * 0.8; // 0.5x oldest → 1.3x newest
            const ordersThisMonth = Math.ceil(baker.ordersPerMonth * growthFactor);
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
        // Create payments for orders
        const paidOrders = db.prepare(`
      SELECT id, total, customer_id, created_at FROM orders
      WHERE bakery_id = ? AND payment_status = 'paid'
    `).all(bakeryId);
        const paymentMethods = ['pix', 'cash', 'card'];
        for (const paidOrder of paidOrders) {
            const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            db.prepare(`
        INSERT INTO payments (id, bakery_id, order_id, customer_id, amount, method, status, reference, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), bakeryId, paidOrder.id, paidOrder.customer_id, paidOrder.total, method, 'completed', method === 'pix' ? `PIX-${Math.floor(Math.random() * 1000000)}` : null, paidOrder.created_at);
        }
        // Create ingredients (for starter+ tiers)
        if (baker.tier !== 'free') {
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
            for (const ingredient of ingredients) {
                db.prepare(`
          INSERT INTO ingredients (id, bakery_id, name, unit, cost_per_unit, stock, min_stock, category, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), bakeryId, ingredient.name, ingredient.unit, ingredient.cost, Math.random() * 100 + 50, 20, 'baking', now, now);
            }
        }
        // Create employees (for starter+ tiers)
        if (baker.tier !== 'free') {
            const employeeNames = ['Joana', 'Marcos', 'Cláudia', 'Danilo', 'Elisa', 'Fábio', 'Gabriela', 'Hugo'];
            const employeeCount = baker.tier === 'starter' ? 2 : Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < employeeCount; i++) {
                const empArea = ['11', '21', '31'][Math.floor(Math.random() * 3)];
                db.prepare(`
          INSERT INTO employees (id, bakery_id, name, email, phone, role, hourly_rate, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), bakeryId, employeeNames[i % employeeNames.length], `${employeeNames[i % employeeNames.length].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}${bakerIndex}@email.com`, `+55${empArea}9${Math.floor(Math.random() * 90000000 + 10000000)}`, ['baker', 'decorator', 'manager'][Math.floor(Math.random() * 3)], Math.round((Math.random() * 8 + 12) * 100) / 100, 1, now);
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