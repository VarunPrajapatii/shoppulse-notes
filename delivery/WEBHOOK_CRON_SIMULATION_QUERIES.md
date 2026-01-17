# 🔧 Webhook & Cron Simulation - Database Queries Reference

> **Purpose:** Use these queries to manually simulate webhook/cron effects when testing locally  
> **Last Updated:** January 14, 2026  
> **Database:** PostgreSQL via Docker (shoppulse-postgres)

---

## � BEGINNER GUIDE: How to Use This Document

### Step 1: Open Your Terminal
- In VS Code: Press `` Ctrl + ` `` (backtick key)
- Or open Windows Terminal / Command Prompt

### Step 2: Run a Query
Copy the query from this document and paste it into this command:

```bash
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "PASTE YOUR QUERY HERE"
```

### Step 3: Replace Placeholders
Before running, replace these placeholders with your actual values:
- `YOUR_STORE_ID` → Get from: `SELECT id FROM "Store";`
- `YOUR_ORDER_ID` → Get from: `SELECT id FROM "Order";`
- `SHP-XXXXXX` → Get from: `SELECT "shipmentNumber" FROM "Shipment";`

### Example Workflow:

```bash
# 1. First, find your store ID
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT id, name FROM \"Store\";"

# Output shows:
#                   id                  |  name  
# --------------------------------------+--------
#  89542aa4-1647-4d1f-a14b-8ca3f1b0ad06 | test30

# 2. Now use that ID in your query
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT * FROM \"Subscription\" WHERE \"storeId\" = '89542aa4-1647-4d1f-a14b-8ca3f1b0ad06';"
```

---

## 📋 Quick Command Reference

```bash
# Connect to database (interactive mode - type \q to exit)
docker exec -it shoppulse-postgres psql -U varun -d shoppulse_admin

# Run a query directly (non-interactive)
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "YOUR QUERY HERE"

# View all tables
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "\dt"
```

---

## 🎯 Table of Contents

1. [Clerk Webhook Simulations](#1-clerk-webhook-simulations)
2. [Razorpay Subscription Webhook Simulations](#2-razorpay-subscription-webhook-simulations)
3. [Razorpay Store Payment Webhook Simulations](#3-razorpay-store-payment-webhook-simulations)
4. [Shiprocket Webhook Simulations](#4-shiprocket-webhook-simulations)
5. [Cron Job Simulations](#5-cron-job-simulations)
6. [Pickup Pipeline Simulations](#6-pickup-pipeline-simulations)
7. [Utility Queries](#7-utility-queries)

---

## 1. Clerk Webhook Simulations

### Event: `user.created`
> In development mode, this is handled conditionally. User is created automatically when you sign up.

**Check if user exists:**
```sql
SELECT id, "clerkId", email, name, "createdAt" FROM "User";
```

**Manual user creation (if needed):**
```sql
INSERT INTO "User" (id, "clerkId", email, name, "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'user_YOUR_CLERK_USER_ID',
    'your-email@example.com',
    'Your Name',
    NOW(),
    NOW()
);
```

### Event: `user.updated`
```sql
UPDATE "User" 
SET name = 'New Name', 
    email = 'newemail@example.com',
    "updatedAt" = NOW()
WHERE "clerkId" = 'user_YOUR_CLERK_USER_ID';
```

### Event: `user.deleted`
```sql
-- This cascades to delete store, subscription, etc.
DELETE FROM "User" WHERE "clerkId" = 'user_YOUR_CLERK_USER_ID';
```

---

## 2. Razorpay Subscription Webhook Simulations

### First, get your Store and Subscription IDs:
```sql
SELECT 
    s.id as store_id, 
    s.name as store_name,
    sub.id as subscription_id,
    sub.status,
    sub."razorpaySubscriptionId",
    sub."endDate"
FROM "Store" s
JOIN "Subscription" sub ON sub."storeId" = s.id;
```

---

### Event: `subscription.authenticated` (First Payment Success)

When user completes first payment for a subscription plan:

```sql
-- Step 1: Update subscription to ACTIVE
UPDATE "Subscription" 
SET 
    status = 'ACTIVE',
    "startDate" = NOW(),
    "endDate" = NOW() + INTERVAL '30 days',
    "razorpaySubscriptionId" = 'sub_TEST_' || substr(md5(random()::text), 1, 12),
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';

-- Step 2: Create Payment record
INSERT INTO "Payment" (
    id, 
    "subscriptionId", 
    "razorpayPaymentId", 
    "razorpayOrderId", 
    amount, 
    status, 
    "createdAt", 
    "updatedAt"
)
SELECT 
    gen_random_uuid(),
    id,
    'pay_TEST_' || substr(md5(random()::text), 1, 12),
    'order_TEST_' || substr(md5(random()::text), 1, 12),
    49900, -- Amount in paise (₹499.00)
    'CAPTURED',
    NOW(),
    NOW()
FROM "Subscription" 
WHERE "storeId" = 'YOUR_STORE_ID';

-- Step 3: Create Subscription History record
INSERT INTO "SubscriptionHistory" (
    id,
    "subscriptionId",
    action,
    "fromStatus",
    "toStatus",
    "fromPlanId",
    "toPlanId",
    notes,
    "createdAt"
)
SELECT 
    gen_random_uuid(),
    id,
    'PAYMENT_SUCCESS',
    'TRIALING',
    'ACTIVE',
    "planId",
    "planId",
    'Payment authenticated via Razorpay',
    NOW()
FROM "Subscription" 
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Event: `subscription.charged` (Recurring Payment Success)

For monthly renewal payments:

```sql
-- Step 1: Extend subscription by 30 days
UPDATE "Subscription" 
SET 
    "endDate" = "endDate" + INTERVAL '30 days',
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';

-- Step 2: Create Payment record for renewal
INSERT INTO "Payment" (id, "subscriptionId", "razorpayPaymentId", amount, status, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    id,
    'pay_RENEW_' || substr(md5(random()::text), 1, 12),
    49900,
    'CAPTURED',
    NOW(),
    NOW()
FROM "Subscription" 
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Event: `subscription.halted` (Payment Failed After Retries)

```sql
-- Update subscription to PAST_DUE
UPDATE "Subscription" 
SET 
    status = 'PAST_DUE',
    "failedPaymentAttempts" = COALESCE("failedPaymentAttempts", 0) + 1,
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';

-- Create history record
INSERT INTO "SubscriptionHistory" (id, "subscriptionId", action, "fromStatus", "toStatus", notes, "createdAt")
SELECT 
    gen_random_uuid(),
    id,
    'PAYMENT_FAILED',
    status,
    'PAST_DUE',
    'Payment failed after max retry attempts',
    NOW()
FROM "Subscription" 
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Event: `subscription.cancelled` (User Cancelled)

```sql
-- Update subscription to CANCELLED
UPDATE "Subscription" 
SET 
    status = 'CANCELLED',
    "cancelledAt" = NOW(),
    "cancelAtPeriodEnd" = true,
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Event: `subscription.paused`

```sql
UPDATE "Subscription" 
SET 
    status = 'PAUSED',
    "pausedAt" = NOW(),
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Event: `subscription.resumed`

```sql
UPDATE "Subscription" 
SET 
    status = 'ACTIVE',
    "pausedAt" = NULL,
    "updatedAt" = NOW()
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

## 3. Razorpay Store Payment Webhook Simulations

### For COD Orders → Prepaid Conversion (if applicable)

```sql
-- Mark order as paid
UPDATE "Order" 
SET 
    "isPaid" = true,
    "paidAt" = NOW(),
    "razorpayPaymentId" = 'pay_STORE_' || substr(md5(random()::text), 1, 12),
    "orderStatus" = 'CONFIRMED',
    "updatedAt" = NOW()
WHERE id = 'YOUR_ORDER_ID';
```

---

## 4. Shiprocket Webhook Simulations

### First, get your Shipment details:
```sql
SELECT 
    id, 
    "shipmentNumber", 
    "awbCode", 
    status, 
    "orderId",
    "courierName"
FROM "Shipment" 
WHERE "storeId" = 'YOUR_STORE_ID'
ORDER BY "createdAt" DESC;
```

---

### Event: Pickup Scheduled (status_id: 1)

```sql
UPDATE "Shipment" 
SET 
    status = 'PICKUP_SCHEDULED',
    "pickupScheduledDate" = NOW() + INTERVAL '4 hours',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';
```

---

### Event: Picked Up (status_id: 3)

```sql
UPDATE "Shipment" 
SET 
    status = 'PICKED_UP',
    "isPickedUp" = true,
    "pickedUpAt" = NOW(),
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Also update Order status
UPDATE "Order" 
SET "orderStatus" = 'SHIPPED', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');

-- Create ShipmentEvent record
INSERT INTO "ShipmentEvent" (id, "shipmentId", status, location, description, "timestamp", "createdAt")
SELECT 
    gen_random_uuid(),
    id,
    'PICKED_UP',
    'Pickup Location',
    'Shipment picked up by courier',
    NOW(),
    NOW()
FROM "Shipment" 
WHERE "shipmentNumber" = 'SHP-XXXXXX';
```

---

### Event: In Transit (status_id: 5, 18)

```sql
UPDATE "Shipment" 
SET 
    status = 'IN_TRANSIT',
    "currentLocation" = 'Mumbai Sorting Hub',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Update Order status
UPDATE "Order" 
SET "orderStatus" = 'IN_TRANSIT', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');

-- Create tracking event
INSERT INTO "ShipmentEvent" (id, "shipmentId", status, location, description, "timestamp", "createdAt")
SELECT 
    gen_random_uuid(),
    id,
    'IN_TRANSIT',
    'Mumbai Sorting Hub',
    'Package in transit',
    NOW(),
    NOW()
FROM "Shipment" 
WHERE "shipmentNumber" = 'SHP-XXXXXX';
```

---

### Event: Out for Delivery (status_id: 9, 17)

```sql
UPDATE "Shipment" 
SET 
    status = 'OUT_FOR_DELIVERY',
    "currentLocation" = 'Local Delivery Hub',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Update Order status
UPDATE "Order" 
SET "orderStatus" = 'OUT_FOR_DELIVERY', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');
```

---

### Event: Delivered (status_id: 7) ✅

```sql
UPDATE "Shipment" 
SET 
    status = 'DELIVERED',
    "deliveredAt" = NOW(),
    "currentLocation" = 'Delivered',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Update Order status
UPDATE "Order" 
SET "orderStatus" = 'DELIVERED', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');

-- Create delivered event
INSERT INTO "ShipmentEvent" (id, "shipmentId", status, location, description, "timestamp", "createdAt")
SELECT 
    gen_random_uuid(),
    id,
    'DELIVERED',
    'Customer Address',
    'Package delivered successfully',
    NOW(),
    NOW()
FROM "Shipment" 
WHERE "shipmentNumber" = 'SHP-XXXXXX';
```

---

### Event: Delivery Failed (status_id: 8, 10, 19)

```sql
UPDATE "Shipment" 
SET 
    status = 'DELIVERY_FAILED',
    "currentLocation" = 'Delivery attempted',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';
```

---

### Event: RTO Initiated (status_id: 11, 20)

```sql
UPDATE "Shipment" 
SET 
    status = 'RTO_INITIATED',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Update Order status
UPDATE "Order" 
SET "orderStatus" = 'RETURN_REQUESTED', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');
```

---

### Event: RTO Delivered (status_id: 13)

```sql
UPDATE "Shipment" 
SET 
    status = 'RTO_DELIVERED',
    "updatedAt" = NOW()
WHERE "shipmentNumber" = 'SHP-XXXXXX';

-- Update Order status
UPDATE "Order" 
SET "orderStatus" = 'RETURNED', "updatedAt" = NOW()
WHERE id = (SELECT "orderId" FROM "Shipment" WHERE "shipmentNumber" = 'SHP-XXXXXX');
```

---

## 5. Cron Job Simulations

### Cron: expire-trials-detect-payment-failure
> Expires trial subscriptions and detects payment failures

```sql
-- Simulate trial expiry (subscription past trial end date)
UPDATE "Subscription" 
SET 
    status = 'EXPIRED',
    "updatedAt" = NOW()
WHERE status = 'TRIALING' 
  AND "endDate" < NOW();
```

---

### Cron: enforce-grace-periods
> Handles grace period for PAST_DUE subscriptions

```sql
-- Simulate grace period expiry (7 days past due)
UPDATE "Subscription" 
SET 
    status = 'EXPIRED',
    "updatedAt" = NOW()
WHERE status = 'PAST_DUE' 
  AND "endDate" < NOW() - INTERVAL '7 days';
```

---

### Cron: expire-period-ended-subscriptions
> Expires subscriptions that cancelled at period end

```sql
-- Simulate subscription period end
UPDATE "Subscription" 
SET 
    status = 'EXPIRED',
    "updatedAt" = NOW()
WHERE "cancelAtPeriodEnd" = true 
  AND "endDate" < NOW();
```

---

### Cron: expire-completed-subscriptions
> Handles subscriptions marked as COMPLETED by Razorpay

```sql
-- Mark as expired after completion
UPDATE "Subscription" 
SET 
    status = 'EXPIRED',
    "updatedAt" = NOW()
WHERE status = 'COMPLETED';
```

---

### Cron: refresh-shiprocket-tokens
> Refreshes Shiprocket API tokens before expiry

```sql
-- Check token expiry
SELECT 
    si.id,
    s.name as store_name,
    si."tokenExpiresAt"
FROM "StoreIntegration" si
JOIN "Store" s ON s.id = si."storeId"
WHERE si.provider = 'SHIPROCKET';

-- Token refresh is done via API call, not DB update
-- Manually update if needed:
UPDATE "StoreIntegration" 
SET 
    "tokenExpiresAt" = NOW() + INTERVAL '24 hours',
    "updatedAt" = NOW()
WHERE provider = 'SHIPROCKET' AND "storeId" = 'YOUR_STORE_ID';
```

---

### Cron: cleanup-archived-products
> Deletes archived products older than 30 days

```sql
-- Simulate cleanup
DELETE FROM "ArchivedProduct" 
WHERE "archivedAt" < NOW() - INTERVAL '30 days';
```

---

## 6. Pickup Pipeline Simulations

### Manual Trigger: Pickup Scheduler Cron
Instead of DB updates, call the API directly:

```bash
curl -X POST http://localhost:3000/api/cron/pickup-scheduler \
  -H "x-cron-secret: YOUR_CRON_SECRET_FROM_ENV"
```

---

### Manual Trigger: Pickup Health Check

```bash
curl -X POST http://localhost:3000/api/cron/pickup-health \
  -H "x-cron-secret: YOUR_CRON_SECRET_FROM_ENV"
```

---

### Simulate: PickupBatch Created

```sql
-- After cron processes queue, batch is created
INSERT INTO "PickupBatch" (
    id, 
    "batchNumber", 
    "storeId", 
    "pickupAddressId", 
    "scheduledDate",
    "timeSlotStart",
    "timeSlotEnd",
    "estimatedPackages",
    status,
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'PB-' || to_char(NOW(), 'YYYYMMDD') || '01',
    'YOUR_STORE_ID',
    'YOUR_PICKUP_ADDRESS_ID',
    NOW() + INTERVAL '2 hours',
    10, -- 10 AM
    12, -- 12 PM
    3,  -- Number of shipments
    'SCHEDULED',
    NOW(),
    NOW()
);
```

---

### Simulate: Pickup Batch Confirmed by Courier

```sql
UPDATE "PickupBatch" 
SET 
    status = 'CONFIRMED',
    "confirmedAt" = NOW(),
    "updatedAt" = NOW()
WHERE "batchNumber" = 'PB-XXXXXXXXXX';
```

---

### Simulate: Pickup Completed

```sql
UPDATE "PickupBatch" 
SET 
    status = 'PICKED_UP',
    "completedAt" = NOW(),
    "updatedAt" = NOW()
WHERE "batchNumber" = 'PB-XXXXXXXXXX';

-- Update all shipments in this batch
UPDATE "Shipment" 
SET 
    status = 'PICKED_UP',
    "isPickedUp" = true,
    "pickedUpAt" = NOW(),
    "updatedAt" = NOW()
WHERE "pickupBatchId" = (SELECT id FROM "PickupBatch" WHERE "batchNumber" = 'PB-XXXXXXXXXX');
```

---

### Simulate: Pickup Failed

```sql
UPDATE "PickupBatch" 
SET 
    status = 'FAILED',
    "failedAt" = NOW(),
    "failureReason" = 'Courier did not arrive - Weather conditions',
    "retryCount" = COALESCE("retryCount", 0) + 1,
    "updatedAt" = NOW()
WHERE "batchNumber" = 'PB-XXXXXXXXXX';

-- Update shipments to PICKUP_FAILED
UPDATE "Shipment" 
SET 
    status = 'PICKUP_FAILED',
    "updatedAt" = NOW()
WHERE "pickupBatchId" = (SELECT id FROM "PickupBatch" WHERE "batchNumber" = 'PB-XXXXXXXXXX');
```

---

## 7. Utility Queries

### View All Data in Tables

```sql
-- View stores
SELECT id, name, "createdAt" FROM "Store";

-- View orders
SELECT id, name, email, "orderStatus", "isPaid", "totalAmount" FROM "Order" ORDER BY "createdAt" DESC;

-- View shipments
SELECT "shipmentNumber", status, "awbCode", "courierName" FROM "Shipment" ORDER BY "createdAt" DESC;

-- View subscriptions
SELECT s.name, sub.status, sub."planId", sub."startDate", sub."endDate" 
FROM "Subscription" sub 
JOIN "Store" s ON s.id = sub."storeId";

-- View pickup batches
SELECT "batchNumber", status, "scheduledDate", "estimatedPackages" FROM "PickupBatch";

-- View payments
SELECT p.amount, p.status, p."razorpayPaymentId", p."createdAt" 
FROM "Payment" p 
ORDER BY "createdAt" DESC;
```

---

### Reset Test Data (Use Carefully!)

```sql
-- Delete all shipments
DELETE FROM "Shipment";

-- Delete all orders
DELETE FROM "Order";

-- Delete all pickup batches
DELETE FROM "PickupBatch";

-- Reset subscription to TRIALING
UPDATE "Subscription" 
SET status = 'TRIALING', 
    "startDate" = NOW(), 
    "endDate" = NOW() + INTERVAL '7 days'
WHERE "storeId" = 'YOUR_STORE_ID';
```

---

### Quick Status Check

```sql
-- Dashboard summary
SELECT 
    (SELECT COUNT(*) FROM "Store") as stores,
    (SELECT COUNT(*) FROM "Order") as orders,
    (SELECT COUNT(*) FROM "Shipment") as shipments,
    (SELECT COUNT(*) FROM "PickupBatch") as pickup_batches,
    (SELECT COUNT(*) FROM "Subscription" WHERE status = 'ACTIVE') as active_subs;
```

---

## 📝 How to Use This Guide

### For Beginners - Step by Step:

**1. When you need to simulate a webhook:**
   - Scroll to the relevant section in this file
   - Copy the SQL query
   - Open your terminal

**2. Get your IDs first (run these one time):**
```bash
# Get Store ID
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT id, name FROM \"Store\";"

# Get Order IDs
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT id, name, \"orderStatus\" FROM \"Order\";"

# Get Shipment Numbers
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT id, \"shipmentNumber\", status FROM \"Shipment\";"

# Get Subscription ID
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "SELECT id, \"storeId\", status FROM \"Subscription\";"
```

**3. Replace placeholders and run:**
   - In the copied query, replace `YOUR_STORE_ID` with the actual ID
   - Paste the full command in terminal and press Enter

**4. Verify the change:**
   - Run a SELECT query to see if it worked
   - Or refresh your browser to see UI changes

---

### 🎯 Quick Reference: What Webhook Does What

| Webhook | When It Fires | What It Does |
|---------|---------------|--------------|
| Clerk `user.created` | User signs up | Creates User in DB |
| Razorpay `subscription.authenticated` | First payment success | Activates subscription |
| Razorpay `subscription.charged` | Monthly renewal | Extends end date |
| Razorpay `subscription.halted` | Payment failed | Marks as PAST_DUE |
| Shiprocket (status 3) | Courier picks up | Sets PICKED_UP status |
| Shiprocket (status 5) | Package moving | Sets IN_TRANSIT |
| Shiprocket (status 7) | Package delivered | Sets DELIVERED |

---

### 🔥 Most Common Scenarios

**Scenario 1: After Razorpay Payment (to activate subscription)**
```bash
# Copy your store ID first, then run:
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "UPDATE \"Subscription\" SET status = 'ACTIVE', \"endDate\" = NOW() + INTERVAL '30 days', \"updatedAt\" = NOW() WHERE \"storeId\" = 'PASTE_STORE_ID_HERE';"
```

**Scenario 2: After shipping an order (to simulate pickup)**
```bash
# Get your shipment number first, then run:
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "UPDATE \"Shipment\" SET status = 'PICKED_UP', \"isPickedUp\" = true, \"pickedUpAt\" = NOW() WHERE \"shipmentNumber\" = 'SHP-YOUR-NUMBER';"
```

**Scenario 3: Simulate delivery**
```bash
docker exec shoppulse-postgres psql -U varun -d shoppulse_admin -c "UPDATE \"Shipment\" SET status = 'DELIVERED', \"deliveredAt\" = NOW() WHERE \"shipmentNumber\" = 'SHP-YOUR-NUMBER';"
```

---

**Happy Testing! 🚀**
