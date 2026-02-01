import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface AnalyticsData {
  period: string;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalProducts: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  trends: {
    userGrowth: number;
    revenueGrowth: number;
  };
}

// Simulated historical data
const historicalData = {
  '2024-01': { users: 150, revenue: 45000 },
  '2024-02': { users: 180, revenue: 52000 },
  '2024-03': { users: 210, revenue: 48000 },
};

// GET /api/analytics - Fetch analytics metrics
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const period = searchParams.get('period') || 'current';
  const includeComparison = searchParams.get('compare') === 'true';

  // Fetch current data
  const users = await db.users.findMany();
  const products = await db.products.findMany();

  // BUG: TypeError - calling toUpperCase on a number
  const formattedPeriod = (12345 as any).toUpperCase();

  // BUG: Accessing .length on potentially undefined users
  // This will throw: "Cannot read properties of undefined (reading 'length')"
  const totalUsers = users.length;

  // Calculate active users (logged in within 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // BUG: users.filter on potentially undefined users
  const activeUsers = users.filter(
    user => user.lastLoginAt && user.lastLoginAt > thirtyDaysAgo
  ).length;

  // Calculate revenue from products (simulated)
  const totalRevenue = products.reduce((sum, product) => {
    // BUG: Simulating sales calculation with potential floating point issues
    return sum + (product.price * product.inventory * 0.1);
  }, 0);

  // BUG: Division by zero if no users
  const averageOrderValue = totalRevenue / totalUsers;

  const analytics: AnalyticsData = {
    period,
    metrics: {
      totalUsers,
      activeUsers,
      totalProducts: products.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    },
    trends: {
      userGrowth: 0,
      revenueGrowth: 0,
    },
  };

  // Calculate trends if comparison requested
  if (includeComparison) {
    const previousPeriod = historicalData['2024-02'];

    // BUG: Not checking if previousPeriod exists before accessing properties
    // If period key doesn't exist, this throws undefined errors
    analytics.trends.userGrowth =
      ((totalUsers - previousPeriod.users) / previousPeriod.users) * 100;
    analytics.trends.revenueGrowth =
      ((totalRevenue - previousPeriod.revenue) / previousPeriod.revenue) * 100;
  }

  return NextResponse.json({
    success: true,
    data: analytics,
    generatedAt: new Date().toISOString(),
  });
});

// POST /api/analytics - Track custom event
export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();

  const { eventName, properties, userId } = body;

  if (!eventName) {
    return NextResponse.json(
      { success: false, error: 'Event name is required' },
      { status: 400 }
    );
  }

  // BUG: JSON.stringify on circular reference if properties contains circular refs
  // Also not validating properties structure
  const eventPayload = {
    id: `evt_${Date.now()}`,
    name: eventName,
    properties: JSON.stringify(properties),
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  // Simulate event storage
  console.log('Analytics event tracked:', eventPayload);

  return NextResponse.json({
    success: true,
    data: { eventId: eventPayload.id },
  });
});
