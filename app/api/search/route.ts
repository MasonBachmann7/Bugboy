import { NextRequest, NextResponse } from 'next/server';
import { withBugStack } from '@bugstack/error-capture-sdk';
import '@/lib/bugstack';
import { db } from '@/lib/db';

interface SearchResult {
  type: 'user' | 'product';
  id: string | number;
  title: string;
  description: string;
  score: number;
}

// GET /api/search - Full-text search across users and products
export const GET = withBugStack(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'user', 'product', or null for all
    const limitParam = searchParams.get('limit') || '10';
    const limit = Math.max(1, Math.min(100, parseInt(limitParam) || 10)); // Validate limit

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Search query is required and cannot be empty' },
        { status: 400 }
      );
    }

    const results: SearchResult[] = [];
    const searchTerms = query.toLowerCase().trim().split(' ').filter(term => term.length > 0);

    if (searchTerms.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search query must contain valid search terms' },
        { status: 400 }
      );
    }

    // Search users
    if (!type || type === 'user') {
      try {
        const users = await db.users.findMany();
        
        if (users && Array.isArray(users)) {
          users.forEach(user => {
            // Ensure user has required properties
            if (!user || !user.name || !user.email) {
              return; // Skip invalid user records
            }

            const nameMatch = searchTerms.some(term =>
              user.name.toLowerCase().includes(term)
            );
            const emailMatch = searchTerms.some(term =>
              user.email.toLowerCase().includes(term)
            );

            if (nameMatch || emailMatch) {
              const matchCount = searchTerms.filter(term =>
                user.name.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term)
              ).length;

              // Ensure we don't divide by zero
              const score = searchTerms.length > 0 ? matchCount / searchTerms.length : 0;

              results.push({
                type: 'user',
                id: user.id,
                title: user.name,
                description: `${user.role || 'User'} - ${user.email}`,
                score,
              });
            }
          });
        }
      } catch (userSearchError) {
        console.error('Error searching users:', userSearchError);
        // Continue with product search even if user search fails
      }
    }

    // Search products
    if (!type || type === 'product') {
      try {
        const products = await db.products.findMany();
        
        if (products && Array.isArray(products)) {
          for (const product of products) {
            // Ensure product has required properties
            if (!product || !product.name || !product.description) {
              continue; // Skip invalid product records
            }

            const nameMatch = searchTerms.some(term =>
              product.name.toLowerCase().includes(term)
            );
            const descMatch = searchTerms.some(term =>
              product.description.toLowerCase().includes(term)
            );

            if (nameMatch || descMatch) {
              results.push({
                type: 'product',
                id: product.id,
                title: product.name,
                description: `$${product.price || 0} - ${product.category || 'Uncategorized'}`,
                score: nameMatch ? 1.0 : 0.5,
              });
            }
          }
        }
      } catch (productSearchError) {
        console.error('Error searching products:', productSearchError);
        // Continue even if product search fails
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit safely
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        query,
        results: limitedResults,
        total: results.length,
        returned: limitedResults.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error occurred while processing search request' 
      },
      { status: 500 }
    );
  }
});