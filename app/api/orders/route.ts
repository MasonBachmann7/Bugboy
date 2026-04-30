import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const POST = withBugStack(async (request: NextRequest) => {
  const body = await request.json();
  const { productId, quantity, userId } = body;

  if (!productId || !quantity || !userId) {
    return NextResponse.json(
      { error: 'productId, quantity, and userId are required' },
      { status: 400 }
    );
  }

  const product = await db.products.findUnique({ where: { id: productId } });
  if (!product || product.stock < quantity) {
    return NextResponse.json({ error: 'insufficient_stock' }, { status: 400 });
  }

  await db.products.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } }
  });

  const order = await db.orders.create({
    data: { productId, quantity, userId }
  });

  return NextResponse.json({ orderId: order.id, productId, quantity });
});

export const GET = withBugStack(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const orders = await db.orders.findMany({
    where: status ? { status: status as any } : undefined,
    include: { items: true, customer: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const ordersWithTotal = orders.filter(order => order.total !== undefined && order.customer)
  const totalRevenue = ordersWithTotal.reduce((sum, order) => sum + order.total, 0)
  const topCustomer = ordersWithTotal.length > 0 ? ordersWithTotal.sort((a, b) => b.total - a.total)[0].customer.name : null

  const summary = {
    orders,
    totalRevenue,
    averageOrderValue: ordersWithTotal.length > 0 ? totalRevenue / ordersWithTotal.length : 0,
    topCustomer
  };

  return NextResponse.json(summary);
});