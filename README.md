# 🌲 Forest Brew — Full-Stack Café & Order Management Platform

Forest Brew is a full-stack, production-ready web application designed for a modern coffee shop. The platform features dynamic ordering, table reservations, real-time customer support, role-based workflows, and strict security hardening. It is built using the Next.js App Router, React, TailwindCSS, Prisma ORM, and Supabase PostgreSQL.

---

## 🚀 Key Features (Basic to Advanced)

### 🛒 Ordering & Payment Workflows
* **Customizable Shopping Cart**: Users can customize modifiers (milk type, syrup flavors, cup size, temperature) for beverages and foods.
* **Dual Payment Methods**: Supports mock wallet payments (with a balance system in paise/INR) and live **Razorpay Payment Gateway** integration (credit card, UPI, net banking).
* **Loyalty Points System**: Earn points dynamically on checkout (configurable points-per-rupee ratio) and redeem them for free drinks.

### 📅 Table Reservation System
* **Real-Time Booking**: Interactive table reservation screen. Checks table capacity and booking slots.
* **Confirmations & Receipts**: Generates booking states with optional advance payments.

### 💬 Support Chat & Live Notifications
* **Server-Sent Events (SSE)**: Real-time notification streams pushing status updates (e.g. "Brewing", "Out for Delivery") to the user.
* **Direct Agent Chat**: Real-time message exchange between users and support staff.

### 💫 Modern UI/UX Additions
* **Fuzzy Menu Search (`Ctrl + K`)**: Instant overlay fuzzy search filtering product categories, tasting notes, and descriptions.
* **Wishlist System**: Heart toggle on menu cards that updates a personalized wishlist dashboard in real-time.
* **Reviews & Ratings**: Average star ratings displayed on products with a strict 1-review-per-product submission form for authenticated customers.
* **Sleek Dark Mode**: Context-based persist-to-local-storage theme switch (sun/moon icon).

### 👥 Role-Based Workflows
The platform has three distinct access roles:
1. **User**: Storefront browse, checkout, reservations, wallet top-ups, wishlists, and reviews.
2. **Admin**: Analytics dashboards, inventory thresholds, worker management (attendance & payroll), order logs, and global database control.
3. **Delivery/Worker Agent**: Order preparation tracking, navigation details, and shift availability toggling.

---

## 🔒 Security Hardening & Audit

The codebase has been thoroughly audited and hardened to prevent vulnerabilities:
* **Anti-Credential Takeover**: Disabled automatic OAuth provider account-linking merges (`allowDangerousEmailAccountLinking: false`) in NextAuth.
* **JWT Security (No Password Leaks)**: Intercepted authorization pipeline to strip raw password hashes before token issuance, replacing them with a safe `hasPassword` indicator verified directly against database updates.
* **CSRF Origin Protection**: Custom request header validation matching browser-level `Origin` and `Referer` headers against `Host` and `X-Forwarded-Host` values to block cross-origin state-changing actions.
* **Token Rate Limiting**: In-memory rate limiting restricting authentication routes (login/register) and sensitive operations (like sending SMS/Email OTP codes) to block brute-force attempts.
* **Input Sanitization & Zod Validation**: Strict Zod schemas enforcing string constraints, phone formats, and data types on all POST/PUT routes.
* **Hashed Recovery OTPs**: OTP tokens are hashed using `bcrypt` prior to database storage, verifying reset requests securely.
* **Email HTML Escape**: Reusable escape utility protecting email notifications from cross-site HTML injection.

---

## 🛠️ Tech Stack

* **Frontend Framework**: Next.js 16.2.6 (Turbopack) & React 19
* **State Management**: Zustand
* **Styling**: Vanilla CSS & TailwindCSS (v4)
* **Database & ORM**: PostgreSQL (Supabase) & Prisma ORM
* **Authentication**: NextAuth.js (v5 Beta)
* **Payment API**: Razorpay SDK
* **Emails**: Nodemailer (Gmail SMTP)
* **Animations**: Framer Motion & GSAP (ScrollTrigger)

---

## 🗄️ Database Schema Overview

The Supabase PostgreSQL instance runs the following core models (defined in `prisma/schema.prisma`):

| Model Name | Purpose |
| :--- | :--- |
| `User` | Stores profile, hashed password, wallet balance, loyalty points, and system `Role` |
| `Product` | Café items, category, tasting notes, base price, and availability |
| `Modifier` | Custom additions (e.g. Oat Milk, Syrup) with price adjustments |
| `Order` | Order lifecycle (status tracking, amount, payment ID, delivery coordinates) |
| `OrderItem` | Specific items inside an order, storing custom JSON parameters |
| `Reservation` | Booking slot, date, guest count, confirmation state, and table mapping |
| `Review` | Product star ratings and comments (unique per `userId` + `productId`) |
| `WishlistItem` | Saves product references to a user's favorites list |
| `NewsletterSubscriber` | Email signups collected via the footer |
| `ContactMessage` | Inbound support requests routed from the Contact form |
| `OTPToken` | Bcrypt-hashed tokens for password recovery |
| `WorkerAttendance` | Shift tracking for delivery/cooking staff |
| `WorkerPayment` | Payroll and salary calculations in paise (INR) |

---

## ⚙️ Local Setup & Running Guide

### 1. Prerequisites
Ensure you have **Node.js (v18+)** installed.

### 2. Installation
Clone your repository and navigate to the subproject:
```bash
cd forest-brew
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the `forest-brew` directory using this template:
```env
# Database Connections
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# NextAuth Configuration
AUTH_SECRET="your-generate-32-character-secret"
AUTH_TRUST_HOST="true"

# Razorpay Keys
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."

# Email Settings (Nodemailer SMTP)
GMAIL_USER="your-email@gmail.com"
GMAIL_PASS="your-gmail-app-password"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Sync & Seed Database
Sync the Prisma schema directly to your Supabase PostgreSQL instance and seed the initial catalog (admins, demo users, modifiers, and products):
```bash
npx prisma db push
npm run db:seed
```

### 5. Running the App
Start the dev server (with network listening enabled for mobile testing):
```bash
npm run dev
```
* **Local access**: `http://localhost:3000`
* **Local Network (Wi-Fi) access**: `http://<PC_IP_ADDRESS>:3000` (e.g., `http://192.168.1.16:3000`)

---

## 📱 Mobile Network Testing (Cloudflare Tunnel)
To test all features on any mobile browser outside your Wi-Fi network:
1. Expose the port using a quick tunnel:
   ```bash
   npx --yes cloudflared tunnel --url http://localhost:3000
   ```
2. Copy the generated **`https://*.trycloudflare.com`** URL.
3. Update `NEXT_PUBLIC_APP_URL` in `.env.local` to match your tunnel URL.
4. Open the link on your iPhone/Android browser!

---

## 📦 Production Build
To build and compile the optimized production bundle:
```bash
npm run build
npm start
```
