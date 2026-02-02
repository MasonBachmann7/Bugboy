import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db, inventoryService } from '@/lib/db';

// GET /api/products/[id] - Fetch a single product with inventory status
export const GET = withBugStack(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInventory = searchParams.get('inventory') === 'true';

    // Parse the product ID from the URL
    const productId = parseInt(params.id);
    
    // Validate product ID is a valid number
    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID. Must be a positive integer.',
          providedId: params.id,
        },
        { status: 400 }
      );
    }

    // Remove the null cache lookup that was causing the error
    // In a real app, you would implement proper cache lookup here
    // const cache = getCacheInstance();
    // const cachedProduct = cache?.get(productId);

    // Fetch product from database
    const product = await db.products.findUnique({
      where: { id: productId },
    });

    // Handle product not found
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
      try {
        const inventoryStatus = inventoryService.checkAvailability(product.id, 1);
        response.inventory = {
          inStock: inventoryStatus.available,
          quantity: inventoryStatus.currentStock,
          lowStock: inventoryStatus.currentStock < 10,
        };
      } catch (inventoryError) {
        // If inventory service fails, continue without inventory data
        response.inventory = {
          error: 'Inventory data temporarily unavailable'
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while fetching product',
      },
      { status: 500 }
    );
  }
});

// PATCH /api/products/[id] - Update product details
export const PATCH = withBugStack(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json();
    const productId = parseInt(params.id);

    // Validate product ID is a valid number
    if (isNaN(productId) || productId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid product ID. Must be a positive integer.',
          providedId: params.id,
        },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while updating product',
      },
      { status: 500 }
    );
  }
});