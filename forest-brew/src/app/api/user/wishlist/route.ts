// ============================================================
//  /api/user/wishlist — User Wishlist API
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { verifyCsrf } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            notes: true,
            basePrice: true,
            imageUrl: true,
            badge: true,
            origin: true,
            category: true,
            isAvailable: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Map to return just the products list
    return NextResponse.json(wishlist.map(w => w.product))
  } catch (err: any) {
    console.error('Fetch wishlist error:', err)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const wishlistItem = await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      },
      create: {
        userId: session.user.id,
        productId
      },
      update: {} // do nothing if already exists
    })

    return NextResponse.json({ success: true, wishlistItem }, { status: 201 })
  } catch (err: any) {
    console.error('Add to wishlist error:', err)
    return NextResponse.json({ error: 'Failed to add item to wishlist' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // CSRF Check
    if (!verifyCsrf(req)) {
      return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 })
    }

    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.user.id,
        productId
      }
    })

    return NextResponse.json({ success: true, message: 'Item removed from wishlist' })
  } catch (err: any) {
    console.error('Delete from wishlist error:', err)
    return NextResponse.json({ error: 'Failed to remove item from wishlist' }, { status: 500 })
  }
}
