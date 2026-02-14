import { NextRequest, NextResponse } from 'next/server'
import { withBugStack } from '@bugstack/error-capture-sdk'
import '@/lib/bugstack'
import { db } from '@/lib/db'

interface SearchResult {
  type: 'user' | 'product'
  id: string | number
  title: string
  description: string
  score: number
}

// GET /api/search - Full-text search across users and products
export const GET = withBugStack(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const type = searchParams.get('type') // 'user', 'product', or null for all
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Search query is required' },
      { status: 400 }
    )
  }

  const results: SearchResult[] = []
  const searchTerms = query.toLowerCase().split(' ')

  try {
    // Search users
    if (!type || type === 'user') {
      const users = await db.users.findMany()

      if (users) {
        users.forEach(user => {
          const nameMatch = searchTerms.some(term =>
            user.name.toLowerCase().includes(term)
          )
          const emailMatch = searchTerms.some(term =>
            user.email.toLowerCase().includes(term)
          )

          if (nameMatch || emailMatch) {
            // BUG: Calculating score but dividing by zero when no terms match
            const matchCount = searchTerms.filter(term =>
              user.name.toLowerCase().includes(term) ||
              user.email.toLowerCase().includes(term)
            ).length

            results.push({
              type: 'user',
              id: user.id,
              title: user.name,
              description: `${user.role} - ${user.email}`,
              score: matchCount / searchTerms.length,
            })
          }
        })
      }
    }

    // Search products
    if (!type || type === 'product') {
      const products = await db.products.findMany()

      if (products) {
        for (const product of products) {
          const nameMatch = searchTerms.some(term =>
            product.name.toLowerCase().includes(term)
          )
          const descMatch = searchTerms.some(term =>
            product.description.toLowerCase().includes(term)
          )

          if (nameMatch || descMatch) {
            results.push({
              type: 'product',
              id: product.id,
              title: product.name,
              description: `$${product.price} - ${product.category}`,
              score: nameMatch ? 1.0 : 0.5,
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    )
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  // BUG: Using slice with potentially NaN limit (if limit param is invalid string)
  // NaN in slice causes unexpected behavior
  const limitedResults = results.slice(0, limit)

  return NextResponse.json({
    success: true,
    data: {
      query,
      results: limitedResults,
      total: results.length,
      returned: limitedResults.length,
    },
    timestamp: new Date().toISOString(),
  })
})