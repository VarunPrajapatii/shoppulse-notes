# ShopPulse - Features Quick Reference

## 🏗️ Core Architecture
- Two Next.js applications (Admin Dashboard + Store Template)
- Next.js 15 with App Router
- PostgreSQL database with Prisma ORM
- Clerk authentication
- Razorpay payment integration
- Cloudinary image storage

## 🔐 Authentication & Authorization
- Clerk email/password authentication
- Social login support
- Post-authentication handler (`/api/auth/post-auth`)
- Three-layer access control (middleware → layout → component)
- Store ownership verification
- Subscription-based access control
- `withStoreAccessCheck` wrapper (strict enforcement)
- `withGracefulStoreCheck` wrapper (graceful degradation)

## 👤 User Management
- Clerk-managed user accounts
- One trial per email enforcement
- User suspension capability
- Last login tracking
- Grace period flags (payment & usage)
- Onboarding completion tracking

## 🎓 Onboarding System
- 6-7 page interactive guide
- Store setup wizard
- Single atomic transaction for completion:
  - Store creation
  - Trial subscription activation
  - 6 usage records initialization
  - User completion flag
- Idempotency protection
- Trial enforcement

## 💳 Subscription System
- 7-day free trial period
- 3 subscription plans (Monthly, Half-Yearly, Yearly)
- Razorpay automatic recurring billing
- 6 subscription statuses:
  - ACTIVE
  - COMPLETING
  - EXPIRED
  - PAST_DUE
  - CANCELED
  - PAUSED

### Subscription Features
- Immediate upgrades with prorated billing
- Scheduled downgrades (applied at period end)
- Downgrade cancellation
- Subscription cancellation (immediate or period-end)
- Auto-renewal toggle
- Payment method tracking
- Billing cycle tracking

### Plan Management
- Dynamic plan limits (products, orders, storage, categories, billboards)
- Feature flags per plan
- Razorpay plan ID mapping
- Plan visibility controls
- Pricing with before/after discount

### Webhook Sync Tracking
- `WebhookSyncStatus` tracking (SYNCED, PENDING, SYNC_FAILED, MANUAL_CHECK)
- API update timestamp tracking
- Webhook receipt timestamp tracking
- Sync failure detection
- Admin alerts on sync issues

## 💰 Payment System
- Razorpay integration for subscriptions
- Razorpay integration for store orders
- Payment type tracking:
  - SUBSCRIPTION_CHARGE
  - UPGRADE_CHARGE
  - ADDON_CHARGE
  - SETUP_FEE
- Payment method capture (card, UPI, netbanking)
- Card details storage (last 4 digits, network)
- Payment failure tracking
- Invoice generation
- Receipt URLs
- Payment history page
- Signature verification

## 📊 Usage Tracking System
- Real-time usage tracking
- Pre-creation limit checks
- Post-creation increment

### Cumulative Metrics (Never Reset)
- Products count
- Categories count
- Billboards count
- Storage GB

### Period-Based Metrics (Reset Each Billing Cycle)
- Orders count
- API calls count

### Usage Tables
- `UsageCumulative` - Lifetime metrics
- `UsageOrders` - Period-based order tracking
- `UsageApiCalls` - High-frequency API tracking (Redis-ready)
- `UsageHistory` - Historical archive

### Limit Enforcement
- Pre-check before resource creation
- 403 errors with detailed messages
- Upgrade prompts on limit reached
- User-friendly error messages

### Threshold Notifications
- SAFE level (< 80%)
- WARNING level (80-95%)
- CRITICAL level (> 95%)
- REACHED level (at limit)
- Email notifications at thresholds

## ⚠️ Grace Period System
### Payment Grace Period
- Triggered on payment failure
- Banner notification in dashboard
- Store remains fully accessible
- Configurable duration (3-5 days)
- Payment method update prompts
- Auto-expiry after grace period

### Usage Grace Period
- Triggered on limit overage
- 5-day warning period
- Email reminders (Day 1, 3, 5)
- Enforcement on Day 6:
  - Archive excess products
  - Delete excess categories
  - Delete excess billboards
- Grace period tracking in metadata
- Overage calculation and storage

## 🗄️ Product Management
- CRUD operations for products
- Multiple product images (Cloudinary)
- Title points and bullet points
- Product descriptions
- Price management
- Stock quantity tracking
- Low stock threshold alerts
- Featured products flag
- Archive/unarchive products
- Related products system
- Product variants (sizes)
- Product filtering (archived, featured, in-stock)

### Archived Products System
- Soft deletion (3-month retention)
- `ArchivedProduct` table with snapshot
- Archive reasons:
  - manual (user deleted)
  - grace_period_enforcement (cron deleted)
  - plan_downgrade (auto-deleted)
- Expiry tracking (`expiresAt`)
- Cloudinary image cleanup
- Permanent deletion after 3 months
- Cron job for cleanup

### Product Relations
- Related products feature
- `ProductRelation` table
- Main product → Related products
- Bidirectional relations

### Upcoming Products
- Separate table for pre-launch items
- Preview images
- Price display
- Category association

## 📦 Category Management
- CRUD operations
- Billboard associations
- Category-specific billboards
- Hierarchy support

## 🖼️ Billboard Management
- Hero banner management
- Image upload (Cloudinary)
- Store main billboard selection
- Category billboard relations
- `StoreMainBillboard` table
- `CategoryBillboardRelation` table

## 📐 Size Management
- Product variant sizes
- CRUD operations
- Size name and value

## 🛒 Order Management
- Order creation (checkout API)
- 8 order statuses:
  - PENDING
  - PAYMENT_INITIATED
  - PAID
  - PROCESSING
  - SHIPPED
  - DELIVERED
  - CANCELLED
  - REFUNDED
- Order status workflow
- Customer information capture
- Order item tracking
- Line total calculation
- Tax and shipping costs
- Razorpay order integration
- Payment verification
- Order limit enforcement
- Product snapshot (preserved if product deleted)

## 🔌 Integration System
- Encrypted credential storage
- One provider per type per store
- 7 integration types:
  - PAYMENT_GATEWAY (Razorpay, Stripe)
  - SMS_PROVIDER (Twilio, Fast2SMS, MSG91)
  - EMAIL_SERVICE (SendGrid, EmailJS)
  - STORAGE_SERVICE (Cloudinary, AWS S3)
  - ANALYTICS (Google Analytics)
  - SHIPPING (Shiprocket, Delhivery)
  - NOTIFICATION (FCM, OneSignal)

### Integration Features
- Credential encryption at rest
- Config storage for non-sensitive settings
- Integration switching (delete old, add new)
- Provider-specific configuration
- Secure API key management

### Encryption Service
- Industry-standard encryption
- Environment-based encryption key
- Decrypt only when needed
- No plaintext credentials in DB

## ⏰ Cron Jobs
### 1. Expire Trials & Detect Payment Failure
- Expires 7-day trials
- Detects payment failures
- Updates subscription status
- Sends failure notifications
- Runs every 6 hours

### 2. Expire Period-Ended Subscriptions
- Expires subscriptions at period end
- Handles canceled subscriptions
- Updates user access
- Records in history
- Runs daily

### 3. Expire Completed Subscriptions
- Handles COMPLETING status
- Moves to EXPIRED after period
- Archives usage history
- Runs daily

### 4. Enforce Grace Periods ⚡
- Checks expired grace periods
- Archives excess products
- Deletes excess categories/billboards
- Updates usage counters
- Invalidates store cache
- Sends enforcement notifications
- Runs every 6 hours

### 5. Cleanup Archived Products
- Permanently deletes expired archives (3+ months)
- Deletes Cloudinary images
- Logs deletion count
- Runs weekly

### Cron Security
- API key verification (`X-Cron-Secret`)
- 401 on invalid secret
- Structured response format

## 🚨 Admin Alert System
- Multi-channel alerting (Email, Slack, Sentry, Console)
- 4 alert types:
  - WEBHOOK_FAILURE
  - DATA_INCONSISTENCY
  - PAYMENT_FAILURE
  - SYSTEM_ERROR
- 4 severity levels (critical, high, medium, low)
- Parallel delivery (non-blocking)
- Graceful failure handling
- Full error context
- Stack traces
- Result tracking per channel

## 🌐 API Routes
### Webhook Routes (Public)
- `/api/webhook/clerk` - User sync webhooks
- `/api/webhook/razorpay/subscription` - Subscription events
- `/api/webhook/razorpay/store` - Order payment events

### Subscription Routes (Protected)
- `/api/subscription/create`
- `/api/subscription/current`
- `/api/subscription/upgrade/execute`
- `/api/subscription/downgrade/schedule`
- `/api/subscription/downgrade/cancel`
- `/api/subscription/cancel`

### Store Resource Routes (Protected + Limit Checked)
- `/api/[storeId]/products`
- `/api/[storeId]/categories`
- `/api/[storeId]/billboards`
- `/api/[storeId]/sizes`
- `/api/[storeId]/orders`
- `/api/[storeId]/upcoming-products`

### Checkout Route (Public with Limits)
- `/api/[storeId]/checkout` - Order creation with CORS

### Integration Routes (Protected)
- `/api/[storeId]/integrations`
- `/api/[storeId]/integrations/[type]`

### Onboarding Routes
- `/api/onboarding/complete`

### Auth Routes
- `/api/auth/post-auth`

## 🎨 Dashboard Features
### Home Dashboard
- Revenue graph (recharts)
- Sales count widget
- Stock count widget
- Recent orders list
- Trial countdown timer (client-side)

### Product Pages
- DataTable with pagination
- Filters (archived, featured, in-stock)
- Bulk actions
- Image uploads
- Related products picker
- Stock management
- Title points & bullet points

### Category Pages
- DataTable with billboard associations
- Create/Edit forms
- Billboard relation management

### Billboard Pages
- Hero banner management
- Image upload
- Main billboard selection
- Category billboard relations

### Order Pages
- Order list with status filters
- Order details view
- Status update workflow
- Customer information
- Order items breakdown

### Settings Page
- Store name update
- API key display
- Store deletion (danger zone)

### Subscription Pages
- My Plan page (current plan, usage stats, cancel)
- Plans page (upgrade/downgrade, feature comparison)
- Payment History page (all payments, invoices)

## 🏠 Landing Pages
- Home page (`/`)
- Features page (`/features`)
- Pricing page (`/pricing`)
- About page (`/about`)
- Auto-scroll to plan cards

## 🎨 UI Components
### Custom Components
- Dashboard shell with sidebar
- Modals (store, product, category, etc.)
- Data tables with sorting/filtering
- Image upload with preview
- Trial indicator/timer
- Grace period banners
- Upgrade/Downgrade dialogs
- Plan cards with animations

### UI Libraries
- Radix UI primitives
- Tailwind CSS
- shadcn/ui components
- Framer Motion animations
- rough-notation text highlights
- Recharts graphs

### Theme System
- Light/Dark mode (next-themes)
- Custom color variables
- Responsive design

## 🗃️ Database Models
### Core Models
- User (30+ fields)
- Store
- Subscription
- SubscriptionPlan
- Payment
- SubscriptionHistory

### Product Models
- Product
- ArchivedProduct
- ProductRelation
- UpcomingProduct
- Image
- Size

### Content Models
- Category
- Billboard
- StoreMainBillboard
- CategoryBillboardRelation

### Order Models
- Order
- OrderItem

### Usage Models
- UsageCumulative
- UsageOrders
- UsageApiCalls
- UsageHistory

### Integration Models
- StoreIntegration

## 🔒 Security Features
### Authentication
- Clerk-managed sessions
- Secure cookie handling
- HTTPS enforcement
- Session expiry

### API Security
- Protected routes (Clerk middleware)
- Store ownership verification
- Subscription status checks
- Rate limiting (planned)

### Data Security
- Credential encryption at rest
- Environment-based secrets
- No hardcoded keys
- Secure key storage

### Webhook Security
- Signature verification (Razorpay, Clerk)
- Replay attack prevention
- Webhook secret validation
- Timestamp checking

### CORS Configuration
- Explicit origin whitelist
- Method restrictions
- Credential handling
- Preflight requests

### Input Validation
- Request body validation
- Type safety (TypeScript)
- Prisma schema validation
- Zod schema validation (forms)

## 📈 Analytics & Monitoring
- Revenue tracking
- Sales count
- Stock levels
- Order statistics
- Payment history
- Usage metrics per resource
- Subscription history audit trail

## 🎯 Store Frontend Template
- NPX distribution: `npx create-shoppulse-store-template`
- Pre-built e-commerce storefront
- Product browsing
- Shopping cart
- Checkout flow
- Order tracking
- API integration with admin dashboard
- Razorpay payment integration
- Responsive design
- Customizable theme

## 🚀 Deployment Features
- Vercel-optimized
- PostgreSQL database
- Cloudinary CDN
- Environment variable management
- Build scripts
- Prisma migrations
- Database seeding

## 📊 Subscription History Tracking
- All subscription changes audited
- Action types:
  - CREATED
  - UPGRADED
  - DOWNGRADED
  - RENEWED
  - CANCELED
  - EXPIRED
  - REACTIVATED
  - PAUSED
  - RESUMED
- From/To status tracking
- From/To plan tracking
- Reason field
- Metadata storage
- Financial tracking (upgrade charges)

## 💾 Data Management
- Atomic transactions (onboarding, payments)
- Rollback on failure
- Data integrity constraints
- Unique constraints enforcement
- Foreign key cascades
- Soft deletes (products)
- Hard deletes (after retention)

## 🔄 Cache Management
- Store cache invalidation
- Redis integration (planned)
- Order count caching (planned)
- Session caching

## 📧 Notification System (Planned)
- Trial expiry reminders
- Payment failure alerts
- Usage threshold warnings
- Grace period notifications
- Limit reached alerts
- Subscription renewal confirmations
- Order status updates

## 🎛️ Admin Features
- User suspension
- Manual subscription pause/resume
- Alert system for critical events
- Webhook failure monitoring
- Payment reconciliation

## 📱 Responsive Design
- Mobile-friendly dashboard
- Touch-optimized UI
- Responsive tables
- Mobile navigation
- Adaptive layouts

## 🔍 Search & Filter
- Product search
- Order search
- Status filters
- Date range filters
- Category filters

## 🌍 Internationalization Ready
- Currency display (INR)
- Date formatting (date-fns)
- Number formatting
- Multi-currency support (planned)

## 📦 NPM Packages
### Frontend
- next
- react
- typescript
- tailwindcss
- framer-motion
- rough-notation
- recharts
- react-hook-form
- @hookform/resolvers
- zod
- @radix-ui/* (multiple packages)
- lucide-react
- next-themes
- next-cloudinary

### Backend
- @prisma/client
- prisma
- @clerk/nextjs
- razorpay
- axios
- cloudinary
- date-fns

## 🛠️ Development Tools
- ESLint
- TypeScript compiler
- Prisma CLI
- ts-node (for scripts)

## 📝 Scripts & Utilities
- Database seeding
- Migration scripts
- Cleanup scripts (duplicate stores)
- User migration scripts
- Test DB connection script

## 🎯 Performance Optimizations
### Database
- Indexed fields
- Unique constraints
- Efficient queries (relations in single query)
- Connection pooling

### Frontend
- Client-side timer (no re-fetching)
- Lazy loading
- Image optimization (Cloudinary)
- Code splitting

### Background Jobs
- Non-blocking alert delivery
- Parallel processing
- Graceful failure

## 🔐 Access Control Levels
1. **Public** - Landing pages, checkout
2. **Authenticated** - Dashboard access
3. **Store Owner** - Store-specific routes
4. **Active Subscription** - Full feature access
5. **Grace Period** - Limited access with warnings
6. **Expired** - Read-only or blocked

## 📋 Metadata Tracking
- Subscription metadata (upgrade attempts, failures)
- Payment metadata
- Order notes
- Archive reasons
- Suspension reasons
- Cancellation reasons

## 🎨 Design System
- Consistent color scheme
- Typography hierarchy
- Spacing system (Tailwind)
- Component variants
- Icon system (Lucide)
- Animation patterns

## 🔄 State Management
- React Context
- Custom hooks
- Server state (database)
- Client state (forms, UI)
- URL state (filters, pagination)

## 🚦 Error Handling
- Comprehensive try-catch blocks
- Detailed error messages
- User-friendly error displays
- Admin alerts on critical errors
- Error logging
- Stack trace capture
- Graceful fallbacks

## 📊 Business Logic
- Plan comparison
- Proration calculation (Razorpay)
- Period-based billing
- Trial eligibility
- Limit calculation
- Overage calculation
- Grace period calculation

## 🧪 Data Validation
- Server-side validation
- Client-side validation (forms)
- TypeScript type checking
- Prisma schema validation
- Zod schema validation
- Unique constraint checks

## 🔧 Configuration Management
- Environment variables
- Feature flags (plan-based)
- Integration configs
- Cron schedules
- Grace period durations
- Archive retention periods

## 📖 Documentation
- Inline code comments
- Implementation guides (notes/)
- Flow diagrams
- Architecture documentation
- API documentation (via code)

---

**Total Features:** 300+ individual features across 25+ major categories
