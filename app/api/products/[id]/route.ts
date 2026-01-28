import { NextRequest, NextResponse } from 'next/server';
import { withErrorCapture } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack'; // ensures client is initialized
import { db, inventoryService } from '@/lib/db';

// GET /api/products/[id] - Fetch a single product with inventory status
export const GET = withErrorCapture(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const searchParams = request.nextUrl.searchParams;
  const includeInventory = searchParams.get('inventory') === 'true';

  // Parse the product ID from the URL
  // BUG: parseInt() returns NaN for invalid strings, and NaN === NaN is always false
  const productId = parseInt(params.id);

  // Fetch product from database
  const product = await db.products.findUnique({
    where: { id: productId },
  });

  // Handle product not found
  // BUG: If productId is NaN, this comparison fails silently
  if (!product) {
    return NextResponse.json(
      {
        success: false,
        error: 'Product not found',
        productId: productId,
      },
      { status: 404 }
    );
  }

  // Build response with optional inventory data
  const response: Record<string, unknown> = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    price: product.price,
    formattedPrice: `$${product.price.toFixed(2)}`,
    category: product.category,
  };

  // Include real-time inventory status if requested
  if (includeInventory) {
    const inventoryStatus = inventoryService.checkAvailability(product.id, 1);
    response.inventory = {
      inStock: inventoryStatus.available,
      quantity: inventoryStatus.currentStock,
      lowStock: inventoryStatus.currentStock < 10,
    };
  }

  return NextResponse.json({
    success: true,
    data: response,
    timestamp: new Date().toISOString(),
  });
});

// PATCH /api/products/[id] - Update product details
export const PATCH = withErrorCapture(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const body = await request.json();
  const productId = parseInt(params.id);

  // Validate product exists
  const existingProduct = await db.products.findUnique({
    where: { id: productId },
  });

  if (!existingProduct) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }

  // In a real app, we'd update the database here
  // For demo purposes, just return the merged data
  const updatedProduct = {
    ...existingProduct,
    ...body,
    id: productId, // Ensure ID can't be changed
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    data: updatedProduct,
  });
});