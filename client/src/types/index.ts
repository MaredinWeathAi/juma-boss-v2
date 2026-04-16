/**
 * Core domain types for Juma Boss v2
 * Bakery management SaaS platform
 */

// User & Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'baker';
  phone?: string;
  createdAt: string;
  updatedAt: string;
  bakery?: Bakery;
}

// Bakery Management
export interface Bakery {
  id: string;
  name: string;
  slug: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  website?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  logo?: string;
  settings: BakerySettings;
  subscription: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface BakerySettings {
  currency: string;
  language: string;
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  autoReminders: boolean;
  deliveryTracking: boolean;
}

// Subscriptions
export interface Subscription {
  id: string;
  bakeryId: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due';
  stripeId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  features: SubscriptionFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  enabled: boolean;
  limit?: number;
  usage?: number;
}

// Products & Inventory
export interface Product {
  id: string;
  bakeryId: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  basePrice: number;
  cost: number;
  image?: string;
  allergens: string[];
  ingredients: string[];
  prepTime: number; // minutes
  shelf_life: number; // hours
  status: 'active' | 'inactive' | 'archived';
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

// Customers
export interface Customer {
  id: string;
  bakeryId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrder?: string;
  status: 'active' | 'inactive';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Orders
export interface Order {
  id: string;
  bakeryId: string;
  customerId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  orderDate: string;
  dueDate: string;
  deliveryDate?: string;
  deliveryAddress?: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: string;
  source: 'web' | 'app' | 'phone' | 'walkin';
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customizations?: string[];
}

// Employees
export interface Employee {
  id: string;
  bakeryId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'baker' | 'decorator' | 'manager' | 'delivery' | 'admin';
  status: 'active' | 'inactive' | 'on_leave';
  schedule?: WorkSchedule;
  hireDate: string;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
}

// Analytics
export interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  monthRevenue: number;
  activeCustomers: number;
  pendingOrders: number;
  completionRate: number;
  revenueChart: ChartData[];
  ordersChart: ChartData[];
  topProducts: TopProduct[];
  recentOrders: Order[];
}

export interface ChartData {
  date: string;
  value: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'year';
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: TopProduct[];
  customerAcquisition: number;
  returnCustomerRate: number;
  chartData: ChartData[];
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  bakeryId: string;
  type: 'order' | 'inventory' | 'payment' | 'system' | 'announcement';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

// Audit & Compliance
export interface AuditEntry {
  id: string;
  bakeryId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// Admin Communications
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'feature' | 'maintenance';
  tiers: ('free' | 'starter' | 'pro' | 'enterprise')[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Client Management (Admin View)
export interface Client {
  id: string;
  bakeryId: string;
  name: string;
  email: string;
  subscription: Subscription;
  mrr: number; // Monthly Recurring Revenue
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  health: 'healthy' | 'at_risk' | 'churning';
  notes?: string;
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  dataUsage: {
    orders: number;
    customers: number;
    products: number;
    employees: number;
  };
}

// Onboarding
export interface OnboardingStep {
  id: string;
  order: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface OnboardingProgress {
  bakeryId: string;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  startedAt: string;
  completedAt?: string;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
