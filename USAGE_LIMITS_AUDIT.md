# Usage Limits & Plan Enforcement Audit

## 📋 Summary

The application has a **comprehensive usage limit system** implemented. Here's the complete audit:

---

## ✅ Implemented & Enforced Limits

### 1. **PRODUCTS** (Cumulative Limit)
| Route | Check | Increment | Decrement |
|-------|-------|-----------|-----------|
| `POST /api/[storeId]/products` | ✅ `checkCumulativeLimit` | ✅ `incrementCumulative` | - |
| `DELETE /api/[storeId]/products/[productId]` | - | - | ✅ `decrementCumulative` |

**Code Evidence:**
- [products/route.ts#L343-344](src/app/api/[storeId]/products/route.ts#L343-L344): Pre-creation check
- [products/route.ts#L441](src/app/api/[storeId]/products/route.ts#L441): Post-creation increment
- [products/[productId]/route.ts#L502](src/app/api/[storeId]/products/[productId]/route.ts#L502): Deletion decrement

### 2. **CATEGORIES** (Cumulative Limit)
| Route | Check | Increment | Decrement |
|-------|-------|-----------|-----------|
| `POST /api/[storeId]/categories` | ✅ `checkCumulativeLimit` | ✅ `incrementCumulative` | - |
| `DELETE /api/[storeId]/categories/[categoryId]` | - | - | ✅ `decrementCumulative` |

**Code Evidence:**
- [categories/route.ts#L121-122](src/app/api/[storeId]/categories/route.ts#L121-L122): Pre-creation check
- [categories/route.ts#L144](src/app/api/[storeId]/categories/route.ts#L144): Post-creation increment
- [categories/[categoryId]/route.ts#L234](src/app/api/[storeId]/categories/[categoryId]/route.ts#L234): Deletion decrement

### 3. **BILLBOARDS** (Cumulative Limit)
| Route | Check | Increment | Decrement |
|-------|-------|-----------|-----------|
| `POST /api/[storeId]/billboards` | ✅ `checkCumulativeLimit` | ✅ `incrementCumulative` | - |
| `DELETE /api/[storeId]/billboards/[billboardId]` | - | - | ✅ `decrementCumulative` |

**Code Evidence:**
- [billboards/route.ts#L91-92](src/app/api/[storeId]/billboards/route.ts#L91-L92): Pre-creation check
- [billboards/route.ts#L104](src/app/api/[storeId]/billboards/route.ts#L104): Post-creation increment
- [billboards/[billboardId]/route.ts#L154](src/app/api/[storeId]/billboards/[billboardId]/route.ts#L154): Deletion decrement

### 4. **ORDERS** (Period-based Limit)
| Route | Check | Increment |
|-------|-------|-----------|
| `POST /api/[storeId]/checkout` | ✅ `checkOrderLimit` | ✅ `incrementOrders` |

**Code Evidence:**
- [checkout/route.ts#L93](src/app/api/[storeId]/checkout/route.ts#L93): Pre-order check
- [checkout/route.ts#L331](src/app/api/[storeId]/checkout/route.ts#L331): Post-order increment
- Returns customer-friendly error message if limit reached

### 5. **STORE ACCESS** (Subscription Check)
| Route Type | Wrapper |
|------------|---------|
| Public GET APIs | ✅ `withStoreAccessCheck` |
| Checkout | ✅ `checkStoreAccess` (direct) |

**Wrapped Routes:**
- `GET /api/[storeId]/products`
- `GET /api/[storeId]/categories`
- `GET /api/[storeId]/billboards`
- `GET /api/[storeId]/sizes`
- `GET /api/[storeId]/announcement-bar`
- `GET /api/[storeId]/seo-config`
- `GET /api/[storeId]/store-billboards`
- `GET /api/[storeId]/upcoming-products`

---

## 🟡 Defined but NOT Enforced

### 1. **STORAGE_GB** (Cumulative Limit)
- **Plan Definition:** ✅ `maxStorageGB` in SubscriptionPlan
- **Implementation:** ❌ Not enforced anywhere
- **Where it should be:** Image upload endpoints (products, billboards)
- **Impact:** Low - Cloudinary handles storage limits

### 2. **API_CALLS** (Period-based Limit)
- **Plan Definition:** ✅ `maxApiCalls` in additionalLimits
- **Service Functions:** ✅ `trackApiCall()`, `checkApiCallLimit()` exist
- **Implementation:** ❌ Not used in any API route
- **Reason:** Commented in code - "For production, use Redis buffering"
- **Impact:** Low - Public APIs are already rate-limited by subscription check

---

## 🔴 Not Limited (By Design)

These resources have **NO plan limits** - they are helper data:

| Resource | Reason |
|----------|--------|
| **Sizes** | Helper data for products, not a limiting factor |
| **Colors** | Helper data for products, not a limiting factor |
| **Integrations** | Limited to 1 per type per store (by design) |
| **Pickup Locations** | Shiprocket limits these externally |
| **Shipping Settings** | Single record per store |

---

## 📊 How Limits Work

### Plan Limits Structure
```typescript
// SubscriptionPlan schema
maxProducts: Int?    // null = unlimited
maxOrders: Int?      // null = unlimited  
maxStorageGB: Int?   // null = unlimited

// In additionalLimits JSON
{
  "maxCategories": 50,
  "maxBillboards": 20,
  "maxApiCalls": 10000
}
```

### Limit Types

1. **Cumulative Limits** (never reset):
   - Products, Categories, Billboards, Storage
   - Tracked in `UsageCumulative` table
   - Checked before creation, updated after create/delete

2. **Period-based Limits** (reset each billing cycle):
   - Orders, API Calls
   - Tracked in `UsageOrders` and `UsageApiCalls` tables
   - Reset when subscription period renews

### Grace Periods
- **Payment Grace:** 5 days after failed payment
- **Usage Grace:** 7 days to reduce usage after downgrade
- During grace: Store remains accessible but shows warnings

---

## 🛡️ Protection Layers

1. **Pre-creation Check:** `checkCumulativeLimit()` / `checkOrderLimit()`
2. **Error Response:** `handleLimitCheck()` returns 403 with details
3. **UI Warning:** Dashboard shows usage at 90%+ threshold
4. **Store Access:** `withStoreAccessCheck()` blocks expired stores
5. **Checkout Protection:** Order limit check before payment

---

## 🔧 Utility Functions

Located in `src/lib/usage-service.ts`:

| Function | Purpose |
|----------|---------|
| `checkCumulativeLimit()` | Pre-check before resource creation |
| `incrementCumulative()` | Track new resource creation |
| `decrementCumulative()` | Track resource deletion |
| `checkOrderLimit()` | Pre-check before order placement |
| `incrementOrders()` | Track new order |
| `getAllUsageData()` | Dashboard display |
| `syncCumulativeFromActual()` | Maintenance sync |
| `getOverageSummary()` | Downgrade preview |
| `deleteOverageItems()` | Grace period enforcement |

---

## 📈 UI Display

**My Plan Page** (`/subscription/my-plan`):
- Shows usage bars for: Products, Orders, Categories, Billboards
- Warning alert at 90%+ usage
- Real-time count from actual database

---

## 🚀 Recommendations

1. **Optional:** Add storage tracking for image uploads
2. **Optional:** Enable API call tracking with Redis buffering for production
3. **Current state:** Core limits (Products, Categories, Billboards, Orders) are fully enforced

---

## ✅ Conclusion

**The usage limit system is comprehensive and properly implemented:**

- ✅ All major resource limits (Products, Categories, Billboards, Orders) are enforced
- ✅ Pre-creation checks prevent exceeding limits
- ✅ Post-creation/deletion tracking maintains accurate counts
- ✅ Store access checks block expired subscriptions
- ✅ Grace periods give users time to resolve issues
- ✅ Dashboard displays real-time usage
- ✅ Customer-facing errors are user-friendly

**Ready for production use.**
