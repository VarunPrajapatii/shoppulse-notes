# 🧪 Shipping Flow Testing Guide

> **Last Updated:** January 14, 2026  
> **Purpose:** Step-by-step testing guide for the complete shipping implementation  
> **Prerequisites:** Shiprocket Test Account, Redis Docker Container, Local Development Server

---

## 📋 Table of Contents

1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Environment Configuration](#2-environment-configuration)
3. [Test Scenarios Overview](#3-test-scenarios-overview)
4. [Phase 1: Basic Setup Testing](#phase-1-basic-setup-testing)
5. [Phase 2: Shipment Creation Testing](#phase-2-shipment-creation-testing)
6. [Phase 3: Pickup Queue Testing](#phase-3-pickup-queue-testing)
7. [Phase 4: Cron Job Testing](#phase-4-cron-job-testing)
8. [Phase 5: Settings UI Testing](#phase-5-settings-ui-testing)
9. [Phase 6: End-to-End Flow Testing](#phase-6-end-to-end-flow-testing)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)
11. [Test Data Checklist](#test-data-checklist)

---

## 1. Pre-Testing Setup

### Required Services

| Service | Purpose | How to Start |
|---------|---------|--------------|
| **PostgreSQL** | Main database | Already running (check your DB connection) |
| **Redis** | Pickup queue | `docker-compose -f docker-compose.redis.yml up -d` |
| **Next.js Dev Server** | Application | `npm run dev` |

### Required Accounts

1. **Shiprocket Test Account**
   - Sign up at: https://app.shiprocket.in/register
   - Use TEST mode credentials (not production!)
   - Get API credentials: Settings → API → Credentials

2. **Test Data**
   - At least 1 store in your database
   - At least 3-5 test orders with complete addresses
   - Orders should have Indian pincodes (400001, 110001, 560001, etc.)

---

## 2. Environment Configuration

### Required .env Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis (for pickup queue)
REDIS_URL="redis://localhost:6379"

# Cron Security
CRON_SECRET="your-random-secret-for-cron-jobs"

# Shiprocket (get from Shiprocket dashboard)
# Note: These are stored in database per-store, not in .env
```

### Verify Redis is Running

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
docker exec -it <container_name> redis-cli ping
# Should return: PONG
```

---

## 3. Test Scenarios Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TESTING FLOW MAP                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SETUP                    SHIPPING                      PICKUP              │
│  ┌──────────────┐        ┌──────────────┐            ┌──────────────┐      │
│  │ 1. Connect   │ ──────▶│ 3. Ship      │───────────▶│ 5. Queue     │      │
│  │    Shiprocket│        │    Orders    │            │    Status    │      │
│  └──────────────┘        └──────────────┘            └──────────────┘      │
│         │                       │                           │               │
│         ▼                       ▼                           ▼               │
│  ┌──────────────┐        ┌──────────────┐            ┌──────────────┐      │
│  │ 2. Add Pickup│        │ 4. View      │            │ 6. Test Cron │      │
│  │    Location  │        │    Shipments │            │    Jobs      │      │
│  └──────────────┘        └──────────────┘            └──────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Basic Setup Testing

### Test 1.1: Connect Shiprocket

**Steps:**
1. Navigate to: `http://localhost:3000/{storeId}/settings/shipping`
2. Click "Connect Shiprocket" or "Configure"
3. Enter your Shiprocket email and password
4. Click "Connect"

**Expected Result:**
- ✅ Green success toast: "Shiprocket connected successfully!"
- ✅ Connection status shows "Connected"
- ✅ Company name and email displayed
- ✅ Token expiry shown

**Verify in Database:**
```sql
SELECT * FROM store_integrations 
WHERE store_id = 'your-store-id' 
AND provider = 'SHIPROCKET';
```

---

### Test 1.2: Add Pickup Location

**Steps:**
1. On Shipping Settings page, scroll to "Pickup Locations"
2. Click "Add Pickup Location"
3. Fill in test address:
   - Name: "Test Warehouse"
   - Phone: 9876543210
   - Address: Any valid Indian address
   - Pincode: 400001 (Mumbai)
   - City: Mumbai
   - State: Maharashtra
4. Click "Save"

**Expected Result:**
- ✅ Location synced to Shiprocket
- ✅ Shows in pickup locations list
- ✅ Has Shiprocket pickup_location_id

**Verify in Database:**
```sql
SELECT * FROM addresses 
WHERE store_id = 'your-store-id' 
AND is_pickup_location = true;
```

---

### Test 1.3: Pickup Settings

**Steps:**
1. On Shipping Settings page, scroll to "Pickup Settings"
2. Configure:
   - Auto-Ship: OFF (for manual testing first)
   - Pickup Frequency: Every 4 hours
   - Operating Window: 9 AM - 6 PM
   - Skip Weekend Pickups: ON
   - Cutoff Hour: 4 PM
3. Click "Save Settings"

**Expected Result:**
- ✅ Settings saved successfully
- ✅ Toast notification confirms save

**Verify in Database:**
```sql
SELECT * FROM store_shipping_settings 
WHERE store_id = 'your-store-id';
```

---

## Phase 2: Shipment Creation Testing

### Test 2.1: Single Order Ship (One-Click Ship)

**Steps:**
1. Create a test order (or use existing unpaid order)
2. Navigate to: `/{storeId}/orders/{orderId}`
3. Click "Ship Order" button
4. In Ship Dialog:
   - Select pickup location
   - Select package preset (or enter dimensions)
   - Choose courier from rates list
   - Click "Create Shipment"

**Expected Result:**
- ✅ Shipment created successfully
- ✅ AWB number assigned
- ✅ Label URL generated
- ✅ Shipment status: BOOKED or MANIFESTED

**What to Check:**
- API call to `/api/{storeId}/order/{orderId}/create-shipment`
- Response includes AWB and label URL
- Order status updated

---

### Test 2.2: Batch Ship Multiple Orders

**Steps:**
1. Navigate to: `/{storeId}/orders`
2. Select 2-3 orders using checkboxes
3. Click "Batch Ship" button
4. In Batch Ship Dialog:
   - Verify orders shown
   - Select pickup location
   - Select package preset
   - Select courier preference (Cheapest/Fastest)
   - Click "Ship All"

**Expected Result:**
- ✅ All orders shipped
- ✅ Each gets unique AWB
- ✅ Progress bar shows completion
- ✅ Success summary displayed

---

### Test 2.3: View Shipments List

**Steps:**
1. Navigate to: `/{storeId}/shipments`
2. Verify shipments appear in list
3. Test filters:
   - Status filter
   - Date range
   - Search by AWB/Order

**Expected Result:**
- ✅ Created shipments visible
- ✅ Status badges correct
- ✅ Can click to view details
- ✅ Download label button works

---

## Phase 3: Pickup Queue Testing

### Test 3.1: Manual Queue Status Check

**Steps:**
1. Call API directly (use Postman/curl):
```bash
curl -X GET "http://localhost:3000/api/{storeId}/shipments/queue-status" \
  -H "Authorization: Bearer <your-token>"
```

**Expected Result:**
```json
{
  "success": true,
  "totalInQueue": 0,
  "dbCounts": {
    "pickupQueued": 0,
    "pickupScheduled": 0,
    "pickupFailed": 0
  },
  "upcomingSlots": [],
  "health": {
    "redisHealthy": true,
    "queueDbMismatch": false
  }
}
```

---

### Test 3.2: Add Shipment to Queue (via Code)

> This happens automatically when shipment is created with PICKUP handover method.
> For manual testing, you can call the queue function directly:

**In Node.js console or test file:**
```typescript
import { pickupQueue } from '@/lib/queue/pickup-queue';

// Add a test shipment
await pickupQueue.addToPickupQueue(
  'test-shipment-id',
  'your-store-id',
  'delhivery',
  'test-pickup-address-id'
);

// Check queue summary
const summary = await pickupQueue.getQueueSummary('your-store-id');
console.log(summary);
```

---

### Test 3.3: Verify Redis Data

**Using Redis CLI:**
```bash
docker exec -it <redis-container> redis-cli

# List all pickup queue keys
KEYS pickup:*

# Check items in a specific queue
SMEMBERS pickup:store123:delhivery:2026-01-14T10:00:00

# Check metadata
GET pickup:meta:shipment123
```

---

## Phase 4: Cron Job Testing

### Test 4.1: Master Pickup Scheduler (Manual Trigger)

**Steps:**
```bash
curl -X POST "http://localhost:3000/api/cron/pickup-scheduler" \
  -H "x-cron-secret: your-cron-secret-from-env"
```

**Expected Result:**
```json
{
  "success": true,
  "stats": {
    "totalQueuesProcessed": 1,
    "totalShipmentsProcessed": 3,
    "successfulBatches": 1,
    "failedBatches": 0,
    "errors": []
  }
}
```

**What Gets Created:**
- PickupBatch record in database
- Shipments updated to PICKUP_SCHEDULED
- Queue cleared from Redis

---

### Test 4.2: Health Check Cron (Manual Trigger)

**Steps:**
```bash
curl -X POST "http://localhost:3000/api/cron/pickup-health" \
  -H "x-cron-secret: your-cron-secret-from-env"
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "timestamp": "2026-01-14T10:00:00.000Z",
    "redisHealthy": true,
    "checks": {
      "orphanedShipments": { "found": 0, "markedFailed": 0 },
      "staleBatches": { "found": 0, "actions": [] },
      "queueIntegrity": { "healthy": true, "issues": [] }
    },
    "alerts": []
  }
}
```

---

### Test 4.3: Retry Failed Shipments

**First, create a failed shipment (set status manually in DB for testing):**
```sql
UPDATE shipments 
SET status = 'PICKUP_FAILED' 
WHERE id = 'test-shipment-id';
```

**Then test retry:**
```bash
# GET - List failed shipments
curl "http://localhost:3000/api/{storeId}/shipments/retry-pickup"

# POST - Retry all failed
curl -X POST "http://localhost:3000/api/{storeId}/shipments/retry-pickup"

# POST - Retry specific shipments
curl -X POST "http://localhost:3000/api/{storeId}/shipments/retry-pickup" \
  -H "Content-Type: application/json" \
  -d '{"shipmentIds": ["shipment-1", "shipment-2"]}'
```

---

## Phase 5: Settings UI Testing

### Test 5.1: Pickup Settings Section

**Steps:**
1. Go to: `/{storeId}/settings/shipping`
2. Locate "Pickup Settings" section
3. Test each setting:
   - Toggle Auto-Ship ON/OFF
   - Change Pickup Frequency dropdown
   - Adjust Operating Window sliders
   - Toggle Weekend Skip
   - Change Cutoff Hour
4. Click "Save Settings"
5. Refresh page and verify settings persist

**Expected Result:**
- ✅ All settings save correctly
- ✅ Values persist after refresh
- ✅ Validation prevents invalid values (e.g., start > end)

---

### Test 5.2: Shiprocket Connection Status

**Steps:**
1. Verify connected status shows:
   - Company name
   - Email
   - Token expiry date
   - Last used timestamp
2. Click "Disconnect" (if available)
3. Re-connect with credentials

---

## Phase 6: End-to-End Flow Testing

### Complete Happy Path Test

**Scenario:** Customer places order → Admin ships → Pickup scheduled → Courier picks up

**Steps:**

1. **Create Test Order**
   - Either through storefront or directly in database
   - Include valid shipping address (Indian pincode)

2. **Ship the Order**
   - Go to Orders page
   - Click "Ship Order" on the test order
   - Complete shipping dialog

3. **Verify Shipment Created**
   - Check Shipments page
   - Verify AWB assigned
   - Download and view label

4. **Check Queue Status**
   - Call queue-status API
   - Verify shipment is queued

5. **Trigger Pickup Cron**
   - Manually trigger pickup-scheduler
   - Verify batch created

6. **Check Pickups Page**
   - Go to Pickups page
   - Verify pickup batch card appears
   - Download manifest

7. **Simulate Webhook (Optional)**
   - If you have webhook testing setup
   - Send pickup confirmation webhook
   - Verify status updates

---

## Troubleshooting Common Issues

### Issue: "Shiprocket connection failed"

**Possible Causes:**
- Invalid credentials
- Shiprocket account not verified
- API rate limit exceeded

**Solution:**
1. Verify credentials at shiprocket.in
2. Check if account email is verified
3. Wait 5 minutes and retry

---

### Issue: "Pickup location not syncing"

**Possible Causes:**
- Invalid pincode
- Shiprocket API error
- Missing required fields

**Solution:**
1. Check pincode is valid Indian pincode
2. Look at API error in browser network tab
3. Verify all required fields filled

---

### Issue: "Redis not connecting"

**Possible Causes:**
- Redis container not running
- Wrong REDIS_URL
- Firewall blocking port 6379

**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it <container> redis-cli ping

# Check REDIS_URL in .env
echo $REDIS_URL
```

---

### Issue: "Cron returns 401 Unauthorized"

**Possible Causes:**
- Missing or wrong CRON_SECRET header
- Header name typo

**Solution:**
- Header must be exactly: `x-cron-secret`
- Value must match `CRON_SECRET` in .env
- Check for extra spaces

---

### Issue: "Shipments not appearing in queue"

**Possible Causes:**
- Handover method is DROPOFF (not PICKUP)
- addToPickupQueue not called
- Redis write failed

**Solution:**
1. Check shipment's handover_method field
2. Verify pickup address is set
3. Check Redis for the queue key

---

## Test Data Checklist

### Before Testing, Ensure You Have:

- [ ] 1 Store created
- [ ] Shiprocket credentials ready (test mode)
- [ ] 5+ Test orders with:
  - [ ] Valid Indian addresses
  - [ ] Various pincodes (metro + tier-2)
  - [ ] Mix of COD and Prepaid
- [ ] Redis running via Docker
- [ ] CRON_SECRET in .env
- [ ] REDIS_URL in .env

### Sample Test Orders (Create these):

| Order # | Customer | Pincode | City | Payment |
|---------|----------|---------|------|---------|
| ORD-001 | Rahul Kumar | 400001 | Mumbai | Prepaid |
| ORD-002 | Priya Singh | 110001 | Delhi | COD ₹1,299 |
| ORD-003 | Amit Shah | 560001 | Bangalore | Prepaid |
| ORD-004 | Neha Gupta | 500001 | Hyderabad | COD ₹599 |
| ORD-005 | Raj Patel | 380001 | Ahmedabad | Prepaid |

---

## Quick Test Commands Reference

```bash
# Start all services
docker-compose -f docker-compose.redis.yml up -d
npm run dev

# Check Redis
docker exec -it shoppulse-redis redis-cli ping

# Test cron jobs
curl -X POST http://localhost:3000/api/cron/pickup-scheduler \
  -H "x-cron-secret: your-secret"

curl -X POST http://localhost:3000/api/cron/pickup-health \
  -H "x-cron-secret: your-secret"

# Check queue status
curl http://localhost:3000/api/{storeId}/shipments/queue-status

# Get shipping settings
curl http://localhost:3000/api/{storeId}/shipping/settings

# Generate Prisma client (if schema changed)
npx prisma generate

# Push schema changes (if needed)
npx prisma db push
```

---

## Next Steps After Testing

Once all tests pass:

1. **Production Deployment Checklist:**
   - [ ] Switch Shiprocket to production credentials
   - [ ] Set up production Redis (or Upstash)
   - [ ] Configure cron jobs in your hosting platform
   - [ ] Set up webhook URL in Shiprocket dashboard

2. **Monitor Initial Usage:**
   - Watch for failed pickups
   - Monitor queue health
   - Check cron job execution logs

3. **Documentation:**
   - Update user documentation
   - Create seller help guides
   - Document support procedures

---

**Happy Testing! 🎉**
