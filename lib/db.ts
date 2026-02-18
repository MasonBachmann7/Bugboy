// Simulated database client — mimics a Prisma-like ORM
// In production, this would connect to PostgreSQL or similar

export interface UserProfile {
  avatarUrl: string;
  department: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  profile: UserProfile;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  inventory: number;
  category: Category;
  createdAt: Date;
}

export interface OrderCustomer {
  name: string;
  email: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  createdAt: Date;
}

export interface NotificationLog {
  id: string;
  userId: string;
  message: string;
  channel: string;
  deliveredAt: Date;
  messageId: string;
  createdAt: Date;
}

export interface PageView {
  pageId: string;
  count: number;
  lastViewedAt: Date;
}

// --- Seed Data ---

const usersTable: User[] = [
  {
    id: 'usr_1a2b3c',
    email: 'sarah.chen@company.com',
    name: 'Sarah Chen',
    role: 'admin',
    profile: {
      avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
      department: 'Engineering',
    },
    createdAt: new Date('2023-01-15'),
    lastLoginAt: new Date('2024-01-20'),
  },
  {
    id: 'usr_4d5e6f',
    email: 'marcus.johnson@company.com',
    name: 'Marcus Johnson',
    role: 'user',
    profile: {
      avatarUrl: 'https://i.pravatar.cc/150?u=marcus',
      department: 'Marketing',
    },
    createdAt: new Date('2023-03-22'),
    lastLoginAt: new Date('2024-01-19'),
  },
  {
    id: 'usr_7g8h9i',
    email: 'alex.rivera@company.com',
    name: 'Alex Rivera',
    role: 'user',
    profile: null as unknown as UserProfile, // SSO user — profile not yet synced
    createdAt: new Date('2023-06-10'),
    lastLoginAt: null,
  },
];

const productsTable: Product[] = [
  {
    id: 'prod_001',
    sku: 'WDG-PRO-001',
    name: 'Pro Widget',
    description: 'Professional-grade widget for enterprise use',
    price: 299.99,
    inventory: 150,
    category: { id: 'cat_widgets', name: 'Widgets' },
    createdAt: new Date('2023-02-01'),
  },
  {
    id: 'prod_002',
    sku: 'WDG-STD-002',
    name: 'Standard Widget',
    description: 'Reliable widget for everyday use',
    price: 149.99,
    inventory: 500,
    category: { id: 'cat_widgets', name: 'Widgets' },
    createdAt: new Date('2023-03-15'),
  },
  {
    id: 'prod_003',
    sku: 'ACC-CBL-001',
    name: 'Premium Cable Kit',
    description: 'High-speed cable kit with gold connectors',
    price: 49.99,
    inventory: 1000,
    category: { id: 'cat_accessories', name: 'Accessories' },
    createdAt: new Date('2023-04-10'),
  },
  {
    id: 'prod_004',
    sku: 'MISC-PROTO-001',
    name: 'Prototype Sensor Array',
    description: 'Experimental multi-spectrum sensor for R&D',
    price: 899.99,
    inventory: 12,
    category: null as unknown as Category, // New product, pending categorization
    createdAt: new Date('2024-01-05'),
  },
];

const ordersTable: Order[] = [
  {
    id: 'ord_1001',
    customer: { name: 'Sarah Chen', email: 'sarah.chen@company.com' },
    items: [
      { productId: 'prod_001', name: 'Pro Widget', quantity: 2, price: 299.99 },
      { productId: 'prod_003', name: 'Premium Cable Kit', quantity: 1, price: 49.99 },
    ],
    total: 649.97,
    status: 'completed',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'ord_1002',
    customer: { name: 'Marcus Johnson', email: 'marcus.johnson@company.com' },
    items: [
      { productId: 'prod_002', name: 'Standard Widget', quantity: 5, price: 149.99 },
    ],
    total: 749.95,
    status: 'processing',
    createdAt: new Date('2024-01-18'),
  },
  {
    id: 'ord_1003',
    customer: { name: 'Alex Rivera', email: 'alex.rivera@company.com' },
    items: [
      { productId: 'prod_004', name: 'Prototype Sensor Array', quantity: 1, price: 899.99 },
    ],
    total: 899.99,
    status: 'pending',
    createdAt: new Date('2024-01-20'),
  },
];

const notificationLogsTable: NotificationLog[] = [];

const pageViewsStore: Map<string, PageView> = new Map([
  ['/', { pageId: '/', count: 1420, lastViewedAt: new Date('2024-01-20') }],
  ['/products', { pageId: '/products', count: 873, lastViewedAt: new Date('2024-01-20') }],
  ['/dashboard', { pageId: '/dashboard', count: 2104, lastViewedAt: new Date('2024-01-20') }],
]);

// --- Database Client ---

export const db = {
  users: {
    findMany: async (options?: { where?: Partial<User> }) => {
      await simulateLatency();
      if (options?.where) {
        return usersTable.filter(user =>
          Object.entries(options.where!).every(([key, value]) =>
            user[key as keyof User] === value
          )
        );
      }
      return [...usersTable];
    },

    findUnique: async (options: { where: { id: string } }) => {
      await simulateLatency();
      return usersTable.find(user => user.id === options.where.id) ?? null;
    },
  },

  products: {
    findMany: async (options?: {
      take?: number;
      skip?: number;
      cursor?: { id: string };
      orderBy?: Record<string, 'asc' | 'desc'>;
      include?: Record<string, boolean>;
      where?: Partial<Product>;
    }) => {
      await simulateLatency();

      let results = [...productsTable];

      // Sort
      if (options?.orderBy) {
        const [field, direction] = Object.entries(options.orderBy)[0];
        results.sort((a, b) => {
          const aVal = a[field as keyof Product];
          const bVal = b[field as keyof Product];
          if (aVal instanceof Date && bVal instanceof Date) {
            return direction === 'desc'
              ? bVal.getTime() - aVal.getTime()
              : aVal.getTime() - bVal.getTime();
          }
          return 0;
        });
      }

      // Cursor — find the starting position
      if (options?.cursor) {
        const cursorIndex = results.findIndex(p => p.id === options.cursor!.id);
        if (cursorIndex !== -1) {
          results = results.slice(cursorIndex);
        }
      }

      // Skip
      if (options?.skip) {
        results = results.slice(options.skip);
      }

      // Take
      if (options?.take) {
        results = results.slice(0, options.take);
      }

      return results;
    },
  },

  orders: {
    findMany: async (options?: {
      where?: Partial<Order>;
      include?: Record<string, boolean>;
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
    }) => {
      await simulateLatency();

      let results = [...ordersTable];

      if (options?.where) {
        results = results.filter(order =>
          Object.entries(options.where!).every(([key, value]) =>
            order[key as keyof Order] === value
          )
        );
      }

      if (options?.orderBy) {
        const [field, direction] = Object.entries(options.orderBy)[0];
        results.sort((a, b) => {
          const aVal = a[field as keyof Order];
          const bVal = b[field as keyof Order];
          if (aVal instanceof Date && bVal instanceof Date) {
            return direction === 'desc'
              ? bVal.getTime() - aVal.getTime()
              : aVal.getTime() - bVal.getTime();
          }
          return 0;
        });
      }

      if (options?.take) {
        results = results.slice(0, options.take);
      }

      return results;
    },
  },

  notificationLogs: {
    create: async (options: { data: Omit<NotificationLog, 'id' | 'createdAt'> }) => {
      await simulateLatency();

      if (!options.data.deliveredAt || !options.data.messageId) {
        throw new Error('notificationLogs.create: deliveredAt and messageId are required fields');
      }

      const log: NotificationLog = {
        id: `log_${Date.now()}`,
        ...options.data,
        createdAt: new Date(),
      };
      notificationLogsTable.push(log);
      return log;
    },
  },

  pageViews: {
    findUnique: async (options: { where: { pageId: string } }): Promise<PageView | null> => {
      await simulateLatency();
      // Simulate a stale read under concurrency — returns null even though data may exist
      // This mimics read-replica lag or cache invalidation delay
      return null;
    },

    create: async (options: { data: PageView }) => {
      await simulateLatency();
      if (pageViewsStore.has(options.data.pageId)) {
        throw new Error(
          `Unique constraint failed on the fields: (\`pageId\`). A record with pageId "${options.data.pageId}" already exists.`
        );
      }
      pageViewsStore.set(options.data.pageId, options.data);
      return options.data;
    },

    update: async (options: { where: { pageId: string }; data: Partial<PageView> }) => {
      await simulateLatency();
      const existing = pageViewsStore.get(options.where.pageId);
      if (!existing) {
        throw new Error(`Record not found: pageViews with pageId "${options.where.pageId}"`);
      }
      const updated = { ...existing, ...options.data };
      pageViewsStore.set(options.where.pageId, updated);
      return updated;
    },

    upsert: async (options: {
      where: { pageId: string };
      update: Partial<PageView> & { count?: { increment: number } };
      create: PageView;
    }) => {
      await simulateLatency();
      const existing = pageViewsStore.get(options.where.pageId);
      if (existing) {
        const countIncrement = (options.update.count as any)?.increment;
        const updated = {
          ...existing,
          ...options.update,
          count: countIncrement ? existing.count + countIncrement : existing.count,
          lastViewedAt: options.update.lastViewedAt ?? existing.lastViewedAt,
        };
        pageViewsStore.set(options.where.pageId, updated);
        return updated;
      }
      pageViewsStore.set(options.create.pageId, options.create);
      return options.create;
    },
  },
};

// --- External Services ---

export function sendNotification(email: string, message: string, channel: string): any {
  return simulateLatency(300).then(() => ({
    delivery: {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
    },
  }));
}

// --- Helpers ---

function simulateLatency(ms: number = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 30));
}
