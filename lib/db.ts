// Simulated database client - mimics a real ORM like Prisma
// In production, this would connect to an actual database

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: number;
  inventory: number;
  category: string;
}

export interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: number; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Simulated user data
const usersTable: User[] = [
  {
    id: 'usr_1a2b3c',
    email: 'sarah.chen@company.com',
    name: 'Sarah Chen',
    role: 'admin',
    createdAt: new Date('2023-01-15'),
    lastLoginAt: new Date('2024-01-20'),
  },
  {
    id: 'usr_4d5e6f',
    email: 'marcus.johnson@company.com',
    name: 'Marcus Johnson',
    role: 'user',
    createdAt: new Date('2023-03-22'),
    lastLoginAt: new Date('2024-01-19'),
  },
  {
    id: 'usr_7g8h9i',
    email: 'alex.rivera@company.com',
    name: 'Alex Rivera',
    role: 'user',
    createdAt: new Date('2023-06-10'),
    lastLoginAt: null,
  },
];

// Simulated product catalog
const productsTable: Product[] = [
  {
    id: 1001,
    sku: 'WDG-PRO-001',
    name: 'Pro Widget',
    description: 'Professional-grade widget for enterprise use',
    price: 299.99,
    inventory: 150,
    category: 'widgets',
  },
  {
    id: 1002,
    sku: 'WDG-STD-002',
    name: 'Standard Widget',
    description: 'Reliable widget for everyday use',
    price: 149.99,
    inventory: 500,
    category: 'widgets',
  },
  {
    id: 1003,
    sku: 'ACC-CBL-001',
    name: 'Premium Cable Kit',
    description: 'High-speed cable kit with gold connectors',
    price: 49.99,
    inventory: 1000,
    category: 'accessories',
  },
];

// Database query simulation with realistic async behavior
export const db = {
  users: {
    findMany: async (options?: { where?: Partial<User>; include?: string[] }) => {
      await simulateLatency();

      // Simulate occasional database connection issues
      if (shouldSimulateError()) {
        return undefined; // Connection timeout - returns undefined instead of empty array
      }

      if (options?.where) {
        return usersTable.filter(user =>
          Object.entries(options.where!).every(([key, value]) =>
            user[key as keyof User] === value
          )
        );
      }

      return usersTable;
    },

    findUnique: async (options: { where: { id: string } }) => {
      await simulateLatency();
      return usersTable.find(user => user.id === options.where.id) || null;
    },
  },

  products: {
    findUnique: async (options: { where: { id: number } }) => {
      await simulateLatency();
      return productsTable.find(product => product.id === options.where.id) || null;
    },

    findMany: async (options?: { where?: Partial<Product> }) => {
      await simulateLatency();

      if (options?.where) {
        return productsTable.filter(product =>
          Object.entries(options.where!).every(([key, value]) =>
            product[key as keyof Product] === value
          )
        );
      }

      return productsTable;
    },
  },

  orders: {
    create: async (data: Omit<Order, 'id' | 'status'>) => {
      await simulateLatency();

      const order: Order = {
        ...data,
        id: `ord_${Date.now()}`,
        status: 'pending',
      };

      return order;
    },
  },
};

// Payment service simulation
export const paymentService = {
  processPayment: async (params: {
    amount: number;
    currency: string;
    customerId: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    await simulateLatency(800);

    // Simulate payment processing
    if (Math.random() > 0.1) {
      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: 'Payment declined by issuer',
    };
  },
};

// Inventory service simulation
export const inventoryService = {
  checkAvailability: (productId: number, quantity: number) => {
    const product = productsTable.find(p => p.id === productId);
    // Note: This is a sync function that returns a promise-like check
    return {
      available: product ? product.inventory >= quantity : false,
      currentStock: product?.inventory ?? 0,
    };
  },

  reserveStock: async (productId: number, quantity: number) => {
    await simulateLatency(200);
    // Simulate stock reservation
    return { reserved: true, reservationId: `res_${Date.now()}` };
  },
};

// Helper functions
function simulateLatency(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 50));
}

function shouldSimulateError(): boolean {
  // 20% chance of simulating a database issue for demo purposes
  return Math.random() < 0.2;
}
