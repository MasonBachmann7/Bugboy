import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db, paymentService, inventoryService } from '@/lib/db';

interface CheckoutItem {
  productId: number;
  quantity: number;
}

interface CheckoutRequest {
  customerId: string;
  items: CheckoutItem[];
  paymentMethod: 'card' | 'bank_transfer';
  shippingAddress: {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

// POST /api/checkout - Process a checkout order
export const POST = withBugStack(async (request: NextRequest) => {
  const body: CheckoutRequest = await request.json();

  // Validate required fields
  if (!body.customerId || !body.items || body.items.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid checkout request',
        details: 'Customer ID and at least one item are required',
      },
      { status: 400 }
    );
  }

  // Validate customer exists
  const customer = await db.users.findUnique({
    where: { id: body.customerId },
  });

  if (!customer) {
    return NextResponse.json(
      { success: false, error: 'Customer not found' },
      { status: 404 }
    );
  }

  // Validate and calculate order totals
  const orderItems: Array<{ productId: number; quantity: number; price: number }> = [];
  let subtotal = 0;

  for (const item of body.items) {
    const product = await db.products.findUnique({
      where: { id: item.productId },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: `Product ${item.productId} not found`,
        },
        { status: 404 }
      );
    }

    // Check inventory availability
    const availability = inventoryService.checkAvailability(
      item.productId,
      item.quantity
    );

    if (!availability.available) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient inventory',
          details: {
            productId: item.productId,
            requested: item.quantity,
            available: availability.currentStock,
          },
        },
        { status: 409 }
      );
    }

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
    });

    subtotal += product.price * item.quantity;
  }

  // Calculate final total with tax
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Reserve inventory for each item
  const reservations = body.items.map(item =>
    inventoryService.reserveStock(item.productId, item.quantity)
  );

  // Process payment
  // BUG: Missing await - paymentResult is a Promise, not the resolved value
  // This causes paymentResult.success to be undefined (checking property on Promise)
  const paymentResult = paymentService.processPayment({
    amount: total,
    currency: 'USD',
    customerId: body.customerId,
  });

  // Wait for reservations (but not payment - intentional async issue)
  await Promise.all(reservations);

  // Check payment result
  // BUG: This check always passes because we're checking Promise.success (undefined)
  // which is falsy, but !undefined is true... wait, that means this WOULD fail
  // Actually: !paymentResult.success where paymentResult is a Promise
  // Promise.success is undefined, !undefined = true, so this returns early incorrectly
  if (!paymentResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Payment failed',
        details: paymentResult.error,
      },
      { status: 402 }
    );
  }

  // Create order record
  const order = await db.orders.create({
    userId: body.customerId,
    items: orderItems,
    total: total,
  });

  return NextResponse.json({
    success: true,
    data: {
      orderId: order.id,
      status: order.status,
      items: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
      })),
      summary: {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
      },
      transactionId: paymentResult.transactionId,
    },
    timestamp: new Date().toISOString(),
  });
});
