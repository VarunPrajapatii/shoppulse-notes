### Gap #12: Pickup Queue Add Failure — ✅ ALREADY DONE

**File:** shipping-service.ts (Lines 568-625)

**What happens:** After `createShipment()` successfully creates an order + AWB in Shiprocket, it tries adding to the pickup queue via `pickupQueue.add()`. If that returns `{ success: false }`:

1. **Logs** the error via `console.error()`
2. **Flags the order** with `needsManualReview: true` and reason `PICKUP_QUEUE_FAILED: Failed to schedule pickup — {error}. Retry from order details.`
3. **Stores structured metadata** on the order with `lastError: { category, message, failedAt, shipmentId }` for debugging
4. All wrapped in try/catch so metadata storage failure doesn't break the main flow

**Why the shipment still works:** The shipment itself was created successfully (has AWB, is BOOKED). Only the pickup scheduling part failed. The seller sees "Needs Review" and can retry pickup from the order detail page.

---

### Gap #13: Pickup Scheduling API Failure — ✅ ALREADY DONE (and thoroughly)

**File:** shipping-service.ts (Lines 1100-1315)

This is the most sophisticated of the three. When `createPickupBatch()` calls `shiprocketAPI.schedulePickup()` per courier group:

1. **Detects error type** — network error vs Shiprocket rejection:
   - Network: `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND`, `timeout`, `fetch failed`
   - Shiprocket: `ShiprocketAPIError` instance
2. **Auto-retries once for network errors** — waits 2 seconds, tries again. If retry succeeds, continues normally
3. **On final failure:**
   - Sets each shipment to `PICKUP_FAILED` status with structured metadata (`pickupFailure: { failedAt, reason, details, batchId, courier }`)
   - Creates `ShipmentEvent` audit trail per shipment with `statusCode: 'PICKUP_SCHEDULING_FAILED'`
   - Flags all parent orders with `needsManualReview: true, manualReviewReason: 'PICKUP_SCHEDULING_FAILED: {type} — {error}. Retry pickup from order details.'`
4. **Batch-level tracking:** Tracks `failedCourierShipmentIds` — if all failed, batch is `FAILED`; if partial, batch is `SCHEDULED` with a log of which shipments failed
5. **Outer catch** handles catastrophic errors outside the per-courier loop — marks batch as FAILED

---

### Gap #14: Courier Pickup Attempt Fails — ✅ ALREADY DONE

**File:** pickup-queue.ts (Lines 863-914)

The `markShipmentsAsFailed()` function:

1. **Fetches shipments** with their `orderId` and existing `metadata`
2. **Updates each shipment individually** (not bulk) to MERGE metadata, not overwrite — preserving any existing metadata while adding `pickupFailure: { failedAt, reason, source: 'QUEUE_HEALTH_CHECK' }`
3. **Flags parent orders** — collects all unique `orderId`s, filters nulls, then `order.updateMany` with `needsManualReview: true, manualReviewReason: 'PICKUP_FAILED: {reason}. Retry pickup from order details.'`
4. **Error resilient** — the order flagging is wrapped in its own try/catch so shipment updates aren't rolled back if order flagging fails

---
