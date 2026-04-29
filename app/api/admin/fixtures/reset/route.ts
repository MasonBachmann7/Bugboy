import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const productId: string = body.productId ?? 'prod_005';
  const stock: number = typeof body.stock === 'number' ? body.stock : 5;

  db.products._resetStock(productId, stock);

  return NextResponse.json({ ok: true, productId, stock });
}
