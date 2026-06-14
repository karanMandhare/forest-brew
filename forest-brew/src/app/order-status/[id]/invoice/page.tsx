import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const formatCustomization = (customization: any) => {
  if (!customization) return ''

  const hasFood = customization.foodWarming !== undefined || customization.foodSize !== undefined || customization.foodAddons !== undefined
  const hasDrink = customization.milk !== undefined || customization.syrups !== undefined || customization.temperature !== undefined || customization.size !== undefined

  if (hasFood && hasDrink) {
    const foodParts: string[] = []
    if (customization.foodSize) {
      foodParts.push(`Size: ${customization.foodSize === 'large' ? 'LARGE' : 'REGULAR'}`)
    }
    if (customization.foodWarming) {
      foodParts.push(customization.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
    }
    if (customization.foodAddons && Array.isArray(customization.foodAddons) && customization.foodAddons.length > 0) {
      const addonLabels: Record<string, string> = {
        extra_cheese: 'Extra Cheese',
        gluten_free: 'Gluten-Free Bun',
      }
      const addons = customization.foodAddons.map((addon: string) => addonLabels[addon] || addon)
      foodParts.push(`Add-ons: ${addons.join(', ')}`)
    }

    const drinkParts: string[] = []
    if (customization.size) {
      drinkParts.push(`Size: ${String(customization.size).toUpperCase()}`)
    }
    if (customization.temperature) {
      drinkParts.push(`Temp: ${String(customization.temperature).toUpperCase()}`)
    }
    if (customization.milk) {
      drinkParts.push(`Milk: ${String(customization.milk).toUpperCase()}`)
    }
    if (customization.syrups && Array.isArray(customization.syrups)) {
      if (customization.syrups.length > 0) {
        drinkParts.push(`Syrups: ${customization.syrups.join(', ')}`)
      }
    } else if (customization.syrups && typeof customization.syrups === 'string') {
      drinkParts.push(`Syrup: ${customization.syrups}`)
    }

    return `Sandwich: [${foodParts.join(' · ')}] · Latte: [${drinkParts.join(' · ')}]`
  }

  const parts: string[] = []
  const isFood = hasFood

  if (isFood) {
    if (customization.foodSize) {
      parts.push(`Size: ${customization.foodSize === 'large' ? 'LARGE' : 'REGULAR'}`)
    }
    if (customization.foodWarming) {
      parts.push(customization.foodWarming === 'warmed' ? 'Warm & Toasted' : 'Served Cold')
    }
    if (customization.foodAddons && Array.isArray(customization.foodAddons) && customization.foodAddons.length > 0) {
      const addonLabels: Record<string, string> = {
        extra_cheese: 'Extra Cheese',
        gluten_free: 'Gluten-Free Bun',
      }
      const addons = customization.foodAddons.map((addon: string) => addonLabels[addon] || addon)
      parts.push(`Add-ons: ${addons.join(', ')}`)
    }
  } else {
    if (customization.size) {
      parts.push(`Size: ${String(customization.size).toUpperCase()}`)
    }
    if (customization.temperature) {
      parts.push(`Temp: ${String(customization.temperature).toUpperCase()}`)
    }
    if (customization.milk) {
      parts.push(`Milk: ${String(customization.milk).toUpperCase()}`)
    }
    if (customization.syrups && Array.isArray(customization.syrups)) {
      if (customization.syrups.length > 0) {
        parts.push(`Syrups: ${customization.syrups.join(', ')}`)
      }
    } else if (customization.syrups && typeof customization.syrups === 'string') {
      parts.push(`Syrup: ${customization.syrups}`)
    }
  }

  return parts.join(' · ')
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, slug: true }
          }
        }
      },
      user: {
        select: { name: true, email: true }
      }
    }
  })

  if (!order) {
    notFound()
  }

  // If order is pending, display the "Invoice Unavailable" screen
  if ((order.status as string) === 'PENDING') {
    return (
      <div 
        className="auth-page" 
        style={{ 
          padding: '120px 16px 60px 16px', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #112a14 0%, #071208 100%)',
          color: '#f7edde',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div 
          className="auth-card" 
          style={{ 
            maxWidth: 500, 
            width: '100%', 
            textAlign: 'center', 
            padding: '40px 30px', 
            background: 'rgba(20, 45, 23, 0.45)', 
            border: '1px solid rgba(168, 197, 160, 0.2)', 
            borderRadius: 20, 
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', 
            backdropFilter: 'blur(15px)' 
          }}
        >
          <span style={{ fontSize: '3.5rem', display: 'inline-block', marginBottom: 20 }}>⏳</span>
          <h1 style={{ fontFamily: 'serif', color: '#7bc47f', fontSize: '1.8rem', margin: '0 0 12px 0' }}>
            Invoice Unavailable
          </h1>
          <p style={{ color: '#a8c5a0', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            Your order invoice will be generated automatically once your payment is successfully verified. Please complete the QR payment on the tracker page.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link
              href={`/order-status/${order.id}`}
              style={{
                background: '#1b3f27',
                border: '1px solid #7bc47f',
                color: '#7bc47f',
                textDecoration: 'none',
                padding: '12px 24px',
                borderRadius: '50px',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              ← Go to Order Tracker
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Double check if order is paid (only allow invoice download if paid/not pending)
  const isPaid = (order.status as string) !== 'PENDING'

  return (
    <div className="invoice-container" style={{ maxWidth: 800, margin: '40px auto', padding: '40px', background: '#fff', color: '#1a1a1a', fontFamily: 'system-ui, -apple-system, sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderRadius: 12 }}>
      
      {/* Print / Navigation Actions (Hidden when printing) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, borderBottom: '1px solid #eee', paddingBottom: 20 }}>
        <Link href={`/order-status/${order.id}`} style={{ textDecoration: 'none', color: '#2e7d32', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>← Back to Tracker</span>
        </Link>
        <a 
          href="javascript:window.print()" 
          style={{ background: '#1b3f27', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🖨️ Print Invoice</span>
        </a>
      </div>

      {/* Invoice Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'serif', color: '#1b3f27', fontSize: '2.2rem', fontWeight: 700 }}>Forest Brew</h1>
          <p style={{ margin: '6px 0 0 0', color: '#666', fontSize: '0.9rem', lineHeight: 1.4 }}>
            Forest Brew Cafe India Ltd.<br />
            12 Canopy Lane, Koregaon Park<br />
            Pune, Maharashtra 411001<br />
            support@forestbrew.in
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '1.8rem', fontWeight: 600, letterSpacing: -0.5 }}>TAX INVOICE</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#555' }}>
            <strong>Invoice No:</strong> FB-{order.id.slice(-6).toUpperCase()}<br />
            <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
            <strong>Time:</strong> {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Customer Info & Order Metadata */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, borderTop: '2px solid #1b3f27', borderBottom: '2px solid #1b3f27', padding: '24px 0', marginBottom: 40 }}>
        <div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#666', letterSpacing: '0.05em' }}>Billed To</h3>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#111' }}>
            {order.customerName || order.user?.name || 'Guest Customer'}
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#444', lineHeight: 1.4 }}>
            {order.customerEmail || order.user?.email || 'N/A'}<br />
            {order.customerPhone && <>Phone: {order.customerPhone}</>}
          </p>
        </div>
        <div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: '#666', letterSpacing: '0.05em' }}>Fulfillment & Payment</h3>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#111' }}>
            Method: {order.orderType === 'DELIVERY' ? '🚗 Home Delivery' : '📍 Dine-In / Pickup'}
          </p>
          {order.orderType === 'DELIVERY' && order.deliveryAddress && (
            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#444', lineHeight: 1.4 }}>
              <strong>Address:</strong> {order.deliveryAddress}
            </p>
          )}
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#555' }}>
            <strong>Payment ID:</strong> <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{order.paymentId || 'MOCK_PAID_DEV'}</code><br />
            <strong>Order Status:</strong> {isPaid ? 'PAID' : 'PENDING'}
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 40 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#555', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <th style={{ padding: '12px 6px', width: '60%' }}>Item Description</th>
            <th style={{ padding: '12px 6px', textAlign: 'right', width: '15%' }}>Unit Price</th>
            <th style={{ padding: '12px 6px', textAlign: 'center', width: '10%' }}>Qty</th>
            <th style={{ padding: '12px 6px', textAlign: 'right', width: '15%' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', fontSize: '0.95rem' }}>
              <td style={{ padding: '16px 6px' }}>
                <div style={{ fontWeight: 600, color: '#1b3f27' }}>{item.product.name}</div>
                {item.customizations && Object.keys(item.customizations).length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                    {formatCustomization(item.customizations)}
                  </div>
                )}
              </td>
              <td style={{ padding: '16px 6px', textAlign: 'right', color: '#333' }}>
                {formatPrice(item.unitPrice)}
              </td>
              <td style={{ padding: '16px 6px', textAlign: 'center', color: '#333' }}>
                {item.quantity}
              </td>
              <td style={{ padding: '16px 6px', textAlign: 'right', fontWeight: 600, color: '#111' }}>
                {formatPrice(item.unitPrice * item.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 60 }}>
        <div style={{ width: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.92rem', color: '#555' }}>
            <span>Subtotal</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '0.92rem', color: '#555' }}>
            <span>GST (Included)</span>
            <span>{formatPrice(Math.round(order.totalAmount * 0.05))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0 0', borderTop: '2px solid #eee', fontSize: '1.2rem', fontWeight: 700, color: '#1b3f27' }}>
            <span>Total Paid</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Footer / Thank you */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 30, color: '#777', fontSize: '0.85rem' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>Thank you for choosing Forest Brew! Enjoy your fresh cup of organic coffee.</p>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem' }}>This is a computer-generated tax invoice and requires no physical signature.</p>
      </div>

      {/* Print Script Injection */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Auto print trigger when loaded
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      `}} />

      {/* In-page styling for printable styling overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: #white !important;
            color: #000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-container {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}} />
    </div>
  )
}
