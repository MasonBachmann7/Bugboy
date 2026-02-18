import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from 'bugstack-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

export const GET = withBugStack(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '20');

  const products = await db.products.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { category: true },
  });

  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    items: items.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category.name,
      inStock: p.inventory > 0,
    })),
    nextCursor,
    hasMore,
  });
});
