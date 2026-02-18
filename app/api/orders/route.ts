import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const GET = withBugStack(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const orders = await db.orders.findMany({
    where: status ? { status: status as any } : undefined,
    include: { items: true, customer: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const summary = {
    orders,
    totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
    averageOrderValue: orders.reduce((sum, order) => sum + order.total, 0) / orders.length,
    topCustomer: orders.sort((a, b) => b.total - a.total)[0].customer.name,
  };

  return NextResponse.json(summary);
});
