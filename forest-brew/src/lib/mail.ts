import nodemailer from 'nodemailer'
import type { CartCustomization } from '@/types'

// Setup SMTP transporter with lazy evaluation
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  const isPlaceholder = (val: string | undefined) => {
    if (!val) return true
    const lowercase = val.toLowerCase()
    return (
      lowercase.includes('your_') ||
      lowercase.includes('placeholder') ||
      lowercase.includes('xxxxxx') ||
      lowercase === 'smtp.mailtrap.io'
    )
  }

  // 1. If professional SMTP configuration is present and not placeholder, use it
  if (
    smtpHost && smtpPort && smtpUser && smtpPass &&
    !isPlaceholder(smtpHost) &&
    !isPlaceholder(smtpUser) &&
    !isPlaceholder(smtpPass)
  ) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpPort === '465', // true for 465, false for 587/25
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
    return transporter
  }

  // 2. Otherwise fall back to Gmail credentials if available (legacy support)
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_PASS

  if (gmailUser && gmailPass && !isPlaceholder(gmailUser) && !isPlaceholder(gmailPass)) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    })
    return transporter
  }

  console.warn('⚠️ No SMTP or Gmail configuration was found in environment variables. Emails will not be sent.')
  return null
}

function getSenderEmail() {
  return process.env.SMTP_USER || process.env.GMAIL_USER || 'hello@forestbrew.in'
}

// Format price helper in typescript for emails (in paise)
function formatEmailPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`
}

function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return unsafe
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Send table booking confirmation email
 */
export async function sendBookingConfirmation(
  to: string,
  guestName: string,
  dateStr: string,
  guestCount: number,
  specialNotes?: string
) {
  const client = getTransporter()
  if (!client) return { success: false, mock: true }

  const formattedDate = new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Table Booked at Forest Brew</title>
      <style>
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background-color: #f4f7f4; margin: 0; padding: 0; color: #2d3748; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 8px solid #1b3f27; }
        .header { background-color: #1b3f27; color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; font-family: 'Georgia', serif; }
        .header p { margin: 5px 0 0 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 30px 24px; line-height: 1.6; }
        .welcome { font-size: 18px; font-weight: 700; color: #112a14; margin-top: 0; }
        .details-box { background-color: #f7faf7; border: 1px solid #e2ece2; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2ed; }
        .details-row:last-child { border-bottom: none; }
        .details-label { font-weight: 700; color: #5a735c; }
        .details-value { text-align: right; color: #112a14; font-weight: 600; }
        .notes { font-style: italic; color: #718096; background: #fff; padding: 10px; border-left: 3px solid #1b3f27; margin-top: 5px; border-radius: 0 4px 4px 0; }
        .footer { text-align: center; padding: 24px; font-size: 12px; color: #718096; border-top: 1px solid #edf2ed; background-color: #fafbfa; }
        .footer a { color: #1b3f27; text-decoration: none; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 Forest Brew</h1>
          <p>Where Every Sip Feels Like a Forest Morning</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${escapeHtml(guestName)},</p>
          <p>We are delighted to confirm that your table reservation has been received. Our team is preparing to welcome you into our lush forest sanctuary for an unforgettable experience.</p>
          
          <div class="details-box">
            <div class="details-row">
              <span class="details-label">Date & Time</span>
              <span class="details-value">${formattedDate}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Number of Guests</span>
              <span class="details-value">${guestCount} ${guestCount === 1 ? 'Person' : 'People'}</span>
            </div>
            ${specialNotes ? `
              <div style="margin-top: 12px;">
                <span class="details-label" style="display:block; margin-bottom:4px;">Special Request Notes:</span>
                <div class="notes">"${escapeHtml(specialNotes)}"</div>
              </div>
            ` : ''}
          </div>

          <p>If you need to change or cancel your booking, please feel free to reach out or update it in your account profile dashboard.</p>
          <p>See you soon!</p>
          <p>Warmly,<br/><strong>The Forest Brew Team</strong></p>
        </div>
        <div class="footer">
          <p>🌿 Forest Brew Cafe Shop & Roastery, Pune, India</p>
          <p>Need support? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}">Website</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await client.sendMail({
      from: `"Forest Brew 🌿" <${getSenderEmail()}>`,
      to,
      subject: '🌿 Table Booking Confirmed — Forest Brew',
      html: htmlContent,
    })
    console.log('Booking email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error)
    return { success: false, error }
  }
}

/**
 * Send table booking cancellation/rejection email with refund notice
 */
export async function sendBookingCancellation(
  to: string,
  guestName: string,
  dateStr: string,
  guestCount: number,
  reason: string,
  refundAmountPaise: number
) {
  const client = getTransporter()
  if (!client) return { success: false, mock: true }

  const formattedDate = new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reservation Update - Forest Brew</title>
      <style>
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background-color: #fcf8f7; margin: 0; padding: 0; color: #2d3748; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 8px solid #c53030; }
        .header { background-color: #c53030; color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; font-family: 'Georgia', serif; }
        .header p { margin: 5px 0 0 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 30px 24px; line-height: 1.6; }
        .welcome { font-size: 18px; font-weight: 700; color: #742a2a; margin-top: 0; }
        .details-box { background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #feebc8; }
        .details-row:last-child { border-bottom: none; }
        .details-label { font-weight: 700; color: #c05621; }
        .details-value { text-align: right; color: #742a2a; font-weight: 600; }
        .reason-box { background: #fff5f5; padding: 12px; border-left: 3px solid #e53e3e; margin-top: 10px; border-radius: 0 4px 4px 0; font-style: italic; color: #9b2c2c; }
        .footer { text-align: center; padding: 24px; font-size: 12px; color: #718096; border-top: 1px solid #edf2ed; background-color: #fafbfa; }
        .footer a { color: #c53030; text-decoration: none; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reservation Update</h1>
          <p>Forest Brew Cafe Shop & Roastery</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${escapeHtml(guestName)},</p>
          <p>We are writing to inform you that we are unable to accommodate your table reservation request with the following details:</p>
          
          <div class="details-box">
            <div class="details-row">
              <span class="details-label">Date & Time</span>
              <span class="details-value">${formattedDate}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Number of Guests</span>
              <span class="details-value">${guestCount} ${guestCount === 1 ? 'Person' : 'People'}</span>
            </div>
            <div style="margin-top: 12px;">
              <span class="details-label" style="display:block; margin-bottom:4px;">Reason for Cancellation:</span>
              <div class="reason-box">"${escapeHtml(reason)}"</div>
            </div>
          </div>

          <p><strong>Refund Details:</strong> The advance booking amount of <strong>${formatEmailPrice(refundAmountPaise)}</strong> has been fully refunded back to your Forest Brew wallet balance. You can check your updated balance and transaction history in your profile page.</p>
          <p>We apologize for any inconvenience caused and hope to welcome you another time under the canopy.</p>
          <p>Warmly,<br/><strong>The Forest Brew Team</strong></p>
        </div>
        <div class="footer">
          <p>🌿 Forest Brew Cafe Shop & Roastery, Pune, India</p>
          <p>Need support? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}">Website</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await client.sendMail({
      from: `"Forest Brew 🌿" <${getSenderEmail()}>`,
      to,
      subject: '⚠️ Table Booking Update — Forest Brew',
      html: htmlContent,
    })
    console.log('Cancellation email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send booking cancellation email:', error)
    return { success: false, error }
  }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(
  to: string,
  customerName: string,
  orderId: string,
  totalAmount: number,
  items: Array<{
    quantity: number
    unitPrice: number
    customizations?: CartCustomization
    product: {
      name: string
    }
  }>,
  orderType: string,
  deliveryAddress?: string | null,
  tableNumber?: string | null
) {
  const client = getTransporter()
  if (!client) return { success: false, mock: true }

  const formattedItemsHtml = items
    .map(item => {
      const custParts: string[] = []
      const c = item.customizations
      if (c) {
        if (c.size) custParts.push(`Size: ${String(c.size).toUpperCase()}`)
        if (c.temperature) custParts.push(`Temp: ${String(c.temperature).toUpperCase()}`)
        if (c.milk) custParts.push(`Milk: ${String(c.milk).toUpperCase()}`)
        if (c.syrups && Array.isArray(c.syrups) && c.syrups.length > 0) {
          custParts.push(`Syrups: ${c.syrups.map(s => escapeHtml(s)).join(', ')}`)
        } else if (c.syrups && typeof c.syrups === 'string') {
          custParts.push(`Syrup: ${escapeHtml(c.syrups)}`)
        }
      }
      const customizationStr = custParts.length > 0 
        ? `<div style="font-size: 11px; color: #718096; margin-top: 2px;">${custParts.join(' · ')}</div>` 
        : ''

      return `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #edf2ed; font-size: 14px;">
            <div style="font-weight: 700; color: #1b3f27;">${escapeHtml(item.product.name)}</div>
            ${customizationStr}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #edf2ed; text-align: center; font-size: 14px; color: #4a5568;">
            ${item.quantity}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #edf2ed; text-align: right; font-weight: 600; font-size: 14px; color: #112a14;">
            ${formatEmailPrice(item.unitPrice * item.quantity)}
          </td>
        </tr>
      `
    })
    .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Forest Brew Receipt</title>
      <style>
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background-color: #f4f7f4; margin: 0; padding: 0; color: #2d3748; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 8px solid #1b3f27; }
        .header { background-color: #1b3f27; color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; font-family: 'Georgia', serif; }
        .header p { margin: 5px 0 0 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 30px 24px; line-height: 1.6; }
        .welcome { font-size: 18px; font-weight: 700; color: #112a14; margin-top: 0; }
        .order-meta { display: flex; justify-content: space-between; font-size: 13px; color: #718096; margin-bottom: 20px; border-bottom: 2px solid #edf2ed; padding-bottom: 12px; }
        .item-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .item-table th { text-align: left; padding: 8px; border-bottom: 2px solid #edf2ed; color: #5a735c; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .total-box { margin-top: 20px; padding: 16px; background-color: #f7faf7; border: 1px solid #e2ece2; border-radius: 8px; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .total-row.grand { border-top: 1px dashed #c2dac2; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: 800; color: #1b3f27; }
        .delivery-note { background: #fffdf5; border-left: 3px solid #d69e2e; padding: 12px; border-radius: 0 4px 4px 0; font-size: 13px; margin: 20px 0; }
        .footer { text-align: center; padding: 24px; font-size: 12px; color: #718096; border-top: 1px solid #edf2ed; background-color: #fafbfa; }
        .footer a { color: #1b3f27; text-decoration: none; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>☕ Forest Brew Receipt</h1>
          <p>Thank you for letting us brew your day</p>
        </div>
        <div class="content">
          <p class="welcome">Hi ${escapeHtml(customerName || 'Coffee Lover')},</p>
          <p>We are brewing your favorites! Your order has been successfully placed and received by our baristas.</p>
 
          <div class="order-meta">
            <span><strong>Order ID:</strong> #${orderId.slice(-8).toUpperCase()}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
          </div>
 
          <table class="item-table">
            <thead>
              <tr>
                <th style="width: 60%;">Item</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 25%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${formattedItemsHtml}
            </tbody>
          </table>
 
          <div class="total-box">
            <div class="total-row">
              <span style="color: #718096;">Fulfill Type</span>
              <span style="font-weight: 600; color: #112a14;">${orderType === 'DINE_IN' ? '🪑 Dine-in' : '🚗 Delivery'}</span>
            </div>
            ${orderType === 'DINE_IN' && tableNumber ? `
              <div class="total-row">
                <span style="color: #718096;">Table Selection</span>
                <span style="font-weight: 600; color: #112a14;">Table ${escapeHtml(tableNumber)}</span>
              </div>
            ` : ''}
            <div class="total-row grand">
              <span>Amount Paid</span>
              <span>${formatEmailPrice(totalAmount)}</span>
            </div>
          </div>
 
          ${orderType === 'DELIVERY' && deliveryAddress ? `
            <div class="delivery-note">
              <strong>Delivery Address:</strong><br/>
              ${escapeHtml(deliveryAddress)}
            </div>
          ` : ''}

          <p>You can track the progress of your brew live on our web portal under your Profile Order History.</p>
          <p>Enjoy your drink!</p>
          <p>Warmly,<br/><strong>The Forest Brew Team</strong></p>
        </div>
        <div class="footer">
          <p>🌿 Forest Brew Cafe Shop & Roastery, Pune, India</p>
          <p>Have questions about your order? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}">Website</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await client.sendMail({
      from: `"Forest Brew 🌿" <${getSenderEmail()}>`,
      to,
      subject: `☕ Order #${orderId.slice(-6).toUpperCase()} Received — Forest Brew`,
      html: htmlContent,
    })
    console.log('Order email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return { success: false, error }
  }
}

// ── OTP Email ─────────────────────────────────────────────────

export async function sendOTPEmail(email: string, otp: string, name?: string) {
  const t = getTransporter()
  if (!t) return { success: false, error: 'Email not configured' }

  const htmlContent = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Password Reset OTP – Forest Brew</title></head>
    <body style="margin:0;padding:0;background:#071208;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#071208;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#0f2a14,#071208);border:1px solid rgba(123,196,127,0.2);border-radius:20px;overflow:hidden;max-width:100%;">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#1b3f27,#0d2013);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(123,196,127,0.15);">
              <div style="font-size:2.4rem;margin-bottom:8px;">🔐</div>
              <h1 style="margin:0;font-size:1.5rem;color:#fff;font-weight:700;">Password Reset</h1>
              <p style="margin:6px 0 0;color:#7bc47f;font-size:0.85rem;letter-spacing:0.05em;">FOREST BREW SECURITY</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:36px 40px;">
              <p style="color:#c8d5c9;font-size:0.95rem;line-height:1.6;margin:0 0 24px;">
                Hi ${escapeHtml(name || 'there')}, we received a request to reset your Forest Brew account password.
              </p>
              <p style="color:#c8d5c9;font-size:0.9rem;margin:0 0 20px;">Your one-time verification code is:</p>
              <!-- OTP Box -->
              <div style="text-align:center;margin:24px 0;">
                <div style="display:inline-block;background:linear-gradient(135deg,#1b3f27,#112a14);border:2px solid rgba(123,196,127,0.4);border-radius:16px;padding:24px 40px;">
                  <div style="font-size:2.8rem;font-weight:900;letter-spacing:0.4em;color:#7bc47f;font-family:monospace;">${otp}</div>
                </div>
              </div>
              <div style="background:rgba(232,168,78,0.08);border:1px solid rgba(232,168,78,0.25);border-radius:10px;padding:14px 18px;margin:24px 0;">
                <p style="margin:0;color:#e8a84e;font-size:0.82rem;">
                  ⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                </p>
              </div>
              <p style="color:#6b8c70;font-size:0.82rem;line-height:1.5;margin:20px 0 0;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure.
              </p>
            </td></tr>
            <!-- Footer -->
            <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="color:#4a6b4e;font-size:0.75rem;margin:0;">🌿 Forest Brew · Secure Account Management</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
  `

  try {
    const info = await t.sendMail({
      from: `"Forest Brew Security" <${getSenderEmail()}>`,
      to: email,
      subject: 'Forest Brew - Password Reset Code',
      html: htmlContent,
    })
    console.log('OTP email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send OTP email:', error)
    return { success: false, error }
  }
}

/**
 * Send table booking thank you email (upon visit completion)
 */
export async function sendBookingThankYou(
  to: string,
  guestName: string,
  dateStr: string,
  totalAmountPaise: number
) {
  const client = getTransporter()
  if (!client) return { success: false, mock: true }

  const formattedDate = new Date(dateStr).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank you for visiting Forest Brew!</title>
      <style>
        body { font-family: 'Nunito', 'Segoe UI', Arial, sans-serif; background-color: #f4f7f4; margin: 0; padding: 0; color: #2d3748; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 8px solid #1b3f27; }
        .header { background-color: #1b3f27; color: #ffffff; text-align: center; padding: 30px 20px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; font-family: 'Georgia', serif; }
        .header p { margin: 5px 0 0 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 30px 24px; line-height: 1.6; }
        .welcome { font-size: 18px; font-weight: 700; color: #112a14; margin-top: 0; }
        .details-box { background-color: #f7faf7; border: 1px solid #e2ece2; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2ed; }
        .details-row:last-child { border-bottom: none; }
        .details-label { font-weight: 700; color: #5a735c; }
        .details-value { text-align: right; color: #112a14; font-weight: 600; }
        .footer { text-align: center; padding: 24px; font-size: 12px; color: #718096; border-top: 1px solid #edf2ed; background-color: #fafbfa; }
        .footer a { color: #1b3f27; text-decoration: none; font-weight: 700; }
        .btn { display: inline-block; background-color: #1b3f27; color: #ffffff; padding: 12px 24px; border-radius: 30px; text-decoration: none; font-weight: bold; text-align: center; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 Forest Brew</h1>
          <p>Thank You For Visiting Us</p>
        </div>
        <div class="content">
          <p class="welcome">Hello ${escapeHtml(guestName)},</p>
          <p>We wanted to express our sincere gratitude for visiting Forest Brew. It was our absolute pleasure to host you in our cafe space!</p>
          
          <div class="details-box">
            <div class="details-row">
              <span class="details-label">Visit Date</span>
              <span class="details-value">${formattedDate}</span>
            </div>
            <div class="details-row">
              <span class="details-label">Total Amount Paid</span>
              <span class="details-value">${formatEmailPrice(totalAmountPaise)} (₹300.00 Advance + ₹450.00 Remaining)</span>
            </div>
          </div>

          <p>We are constantly striving to make our forest sanctuary and brewing experience as magical as possible. We would love to hear your feedback on your visit!</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile?tab=bookings" class="btn" style="color: #ffffff;">Share Your Feedback</a>
          </div>

          <p>Please visit us again soon for another fresh brew and a peaceful escape.</p>
          <p>Warmest regards,<br/><strong>The Forest Brew Team</strong></p>
        </div>
        <div class="footer">
          <p>🌿 Forest Brew Cafe Shop & Roastery, Pune, India</p>
          <p>Need support? Reply to this email or visit our <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}">Website</a></p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const info = await client.sendMail({
      from: `"Forest Brew 🌿" <${getSenderEmail()}>`,
      to,
      subject: '🌿 Thank you for visiting Forest Brew! — Share your feedback',
      html: htmlContent,
    })
    console.log('Thank you email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send thank you email:', error)
    return { success: false, error }
  }
}
