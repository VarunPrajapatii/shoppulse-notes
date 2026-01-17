# Part 4: Shipping Settings & Dashboard Flows

> **What This Document Covers:** Complete UI/UX flows for shipping configuration and order shipping operations. Each section shows the visual mockup and explains what each field, button, and action does.

## Settings Page Structure

```
Dashboard
└── Settings
    └── Shipping Settings
        ├── Connection (Connect Shiprocket / Enable Manual)
        ├── Default Package Dimensions
        ├── Pickup Locations
        ├── Auto-Ship Configuration
        └── Return Policy Settings
```

**Navigation:** Settings → Shipping Settings is the central hub for all delivery-related configurations.

---

## 1. Shiprocket Connection Settings

> **Purpose:** This section allows sellers to connect their Shiprocket account to ShopPulse. Shiprocket is a shipping aggregator that provides access to 17+ courier partners (Delhivery, BlueDart, Xpressbees, etc.) through a single integration.

### UI Flow

> **Design Decision:** Manual shipping is **always available by default**. Even if a seller hasn't connected any shipping service (Shiprocket), they can still add AWB numbers and manually update order statuses. This ensures sellers are never blocked from fulfilling orders.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚚 Shipping Settings                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SHIPPING PROVIDER                                                          │
│  ─────────────────                                                          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  📦 Shiprocket                                          [Not Connected] ││
│  │                                                                         ││
│  │  • 17+ courier partners (Delhivery, BlueDart, Xpressbees, etc.)        ││
│  │  • Auto rate comparison across all couriers                             ││
│  │  • Automatic label generation                                           ││
│  │  • Real-time tracking via webhooks                                      ││
│  │                                                                         ││
│  │                                                        [Configure →]    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ℹ️ Manual shipping (Speed Post, self-delivery, local couriers) is always  │
│     available. You can add AWB numbers and update statuses manually for    │
│     any order, regardless of whether Shiprocket is connected.               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**What This Means:**

| Scenario | What Seller Can Do |
|----------|--------------------|
| **No shipping service connected** | Manual shipping only - add AWB, update status manually |
| **Shiprocket connected** | Both options: Shiprocket API shipping OR manual shipping |

**Card Explanation:**

| Element | What It Does |
|---------|--------------|
| **Shiprocket Card** | Shows aggregated shipping option with multi-courier access |
| **[Configure →] Button** | Opens the credential entry modal to connect Shiprocket API |
| **[Not Connected] Badge** | Shows current connection status (changes to ✅ Connected when active) |

### Shiprocket Connection Modal

> **What This Modal Does:** Collects Shiprocket API credentials from the seller. These credentials are encrypted and stored securely. ShopPulse uses them to authenticate with Shiprocket's API for rate fetching, order creation, AWB generation, and tracking.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Connect Shiprocket                                                    [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Don't have a Shiprocket account?                                           │
│  [Sign up at shiprocket.in →]                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  API Credentials                                                            │
│                                                                              │
│  Email (API User)                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ api@mystore.com                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Password                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ ••••••••••••••••                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ℹ️ Create an API user in Shiprocket Dashboard → Settings → API             │
│                                                                              │
│  [Test Connection]                                                          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│                                    [Cancel]  [Save & Connect]               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Field & Button Explanations:**

| Element | What It Does |
|---------|--------------|
| **Email (API User)** | The email address used to create an API user in Shiprocket Dashboard (Settings → API). This is NOT the main Shiprocket login email. |
| **Password** | The password set for the API user. Stored encrypted using AES-256. |
| **[Test Connection]** | Calls `POST /auth/login` on Shiprocket API to verify credentials are valid. Shows success/error toast. Does NOT save credentials yet. |
| **[Cancel]** | Closes modal without saving. Any entered data is discarded. |
| **[Save & Connect]** | 1) Encrypts credentials 2) Saves to `StoreIntegration` table 3) Fetches & stores JWT token 4) Syncs pickup locations from Shiprocket |

**Backend Flow on Save:**
1. `POST /api/[storeId]/integrations` - Saves encrypted credentials
2. `POST /api/[storeId]/shipping/providers/shiprocket/verify` - Gets token + pickup locations
3. Creates/updates integration with `isDefault: true` for SHIPPING type

### Connected State

> **What This Shows:** After successful connection, shows account status, token health, and management actions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SHIPROCKET CONNECTION                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Status: ✅ Connected                                                       │
│  Account: api@mystore.com                                                   │
│  Token Expires: Jan 15, 2026 (8 days remaining)                            │
│  Last Used: 2 hours ago                                                     │
│                                                                              │
│  [Test Connection]  [Disconnect]  [Refresh Token]                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Status Indicators:**
- **✅ Connected** - Green badge when API credentials are valid and token is active
- **⚠️ Token Expiring** - Yellow badge when token expires within 2 days
- **❌ Disconnected** - Red badge when token is expired or credentials are invalid

**Button Actions:**

| Button | What It Does |
|--------|--------------|
| **[Test Connection]** | Pings Shiprocket API with stored credentials. Verifies the connection is working. Updates "Last Used" timestamp. |
| **[Disconnect]** | Opens confirmation dialog → Deletes stored credentials and token → Sets `isActive: false` → Removes Shiprocket as shipping option |
| **[Refresh Token]** | Manually triggers `POST /auth/login` to get a new JWT token. Useful if token expired early or for troubleshooting. Token valid for 10 days. |

---

## 2. Package Dimensions (Handled at Product Level)

> **Design Decision:** Default package settings section has been **removed** from Shipping Settings. Instead, product dimensions (weight, length, breadth, height) are now **mandatory fields** when creating/editing products.

**Why This Change:**
- Each product has accurate dimensions stored in the database
- During shipment creation, dimensions are auto-calculated from order items
- No guessing with "default" values that may not match actual products
- Volumetric weight is calculated accurately for each shipment

**How It Works Now:**

| Step | What Happens |
|------|-------------|
| **Product Creation** | Seller MUST enter weight, length, breadth, height for each product |
| **Shipment Creation** | System calculates total weight from all items in order |
| **Rate Fetch** | Accurate dimensions sent to Shiprocket for precise rate calculation |
| **Manual Override** | Seller can still adjust dimensions in the Ship Order modal if needed |

**💡 Benefit:** Eliminates shipping disputes caused by incorrect default dimensions. Couriers bill based on `max(actual weight, volumetric weight)`, so accuracy matters.

---

## 3. Pickup Locations

> **Purpose:** Manages pickup addresses where couriers will collect packages. Locations can be **added directly from ShopPulse** via Shiprocket API, or synced if already added in Shiprocket dashboard. This will be in the shipping settings section.


```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PICKUP LOCATIONS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📍 Home Office (Default)                               ✅ Verified   │ │
│  │     123 Main Street, Sector 5                                          │ │
│  │     Gurugram, Haryana - 122001                                         │ │
│  │     📞 +91 98765 43210                                                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📍 Warehouse                                           ⏳ Pending    │ │
│  │     456 Industrial Area                                                │ │
│  │     Delhi - 110001                                                     │ │
│  │     📞 +91 98765 43211                                                 │ │
│  │                                                    [Set as Default]    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [➕ Add New Location]   [🔄 Sync from Shiprocket]                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add New Pickup Location Modal

> **What This Does:** Allows sellers to add a new pickup location directly from ShopPulse. The location is created in Shiprocket via API (`POST /settings/company/addpickup`) and stored locally.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Add Pickup Location                                                   [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Location Name *                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Warehouse Delhi                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ℹ️ A nickname for this location (max 36 characters)                       │
│                                                                              │
│  Contact Person *              Phone Number *                               │
│  ┌───────────────────────┐     ┌───────────────────────────────────────┐   │
│  │ Rahul Sharma          │     │ 9876543210                            │   │
│  └───────────────────────┘     └───────────────────────────────────────┘   │
│                                                                              │
│  Email *                                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ warehouse@mystore.com                                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Address Line 1 *                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 456 Industrial Area, Phase 2                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  Address Line 2                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Near Metro Station                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  City *                State *               PIN Code *                     │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │ Delhi        │      │ Delhi        │      │ 110001       │              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                                                                              │
│  ⚠️ Phone number will need OTP verification in Shiprocket dashboard.       │
│     Until verified, this location shows as "Pending".                       │
│                                                                              │
│                                          [Cancel]  [Add Location]           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Location Card Elements:**

| Element | What It Shows |
|---------|---------------|
| **📍 Location Name** | Nickname for the pickup location (e.g., "Home Office", "Warehouse") |
| **✅ Verified / ⏳ Pending** | Phone verification status. Pending locations may have pickup delays. |
| **(Default)** | Badge shown on the pickup location used by default for new shipments |
| **Address Lines** | Full address where courier will arrive for pickup |
| **📞 Phone** | Contact number courier will call if they can't find the address |

**Button Actions:**

| Button | What It Does |
|--------|--------------|
| **[Set as Default]** | Marks this location as default for new shipments. Updates `StoreSettings.defaultPickupLocationId`. Only one location can be default. |
| **[➕ Add New Location]** | Opens modal to add a new pickup location. Calls `POST /settings/company/addpickup` on Shiprocket API. |
| **[🔄 Sync from Shiprocket]** | Fetches all locations from Shiprocket (`GET /settings/company/pickup`) and syncs to ShopPulse. Useful if locations were added directly in Shiprocket dashboard. |

┌─ Shiprocket API Used ─────────────────────────────────────────────────────┐
│                                                                            │
│  **Add Location:** `POST /settings/company/addpickup`                      │
│  Required: pickup_location, name, email, phone, address, city, state,      │
│            country, pin_code                                               │
│  Returns: pickup_id, address object with status (1=pending, 2=verified)    │
│                                                                            │
│  **Get Locations:** `GET /settings/company/pickup`                         │
│  Returns: Array of all pickup addresses with verification status           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

### Pickup Address Sync Strategy

> **Storage:** Pickup locations are stored locally in the Address model (type=PICKUP) with provider metadata in JSON field for flexibility.

**Sync Triggers:**

| Trigger | When It Happens |
|---------|-----------------|
| **Manual Sync** | User clicks "🔄 Sync from Shiprocket" button |
| **Weekly Cron** | Automatic background sync every Sunday midnight |
| **API Error** | If shipment fails with "pickup location not found", auto-sync triggers |

**Sync Logic:**

```
GET /settings/company/pickup (from Shiprocket)
      ↓
Compare with local Address model (type=PICKUP):
      ↓
┌─────────────────────────────────────────────────────────┐
│ • ID in Shiprocket but not local → ADD (isActive=true)  │
│ • ID in local but not Shiprocket → SET isActive=false   │
│ • ID in both → UPDATE fields if changed                 │
│ • Default logic: If current default deleted →           │
│   first active location becomes new default             │
└─────────────────────────────────────────────────────────┘
```

**Why Store Locally?**
- **UI Speed** - Don't call Shiprocket API every time Ship Order modal opens
- **Default Selection** - Track which location is default (stored in our DB, not Shiprocket)
- **Failure Handling** - If Shiprocket API is down, we still show saved locations

**Critical Note:** Shiprocket API uses **location NAME** (string), not ID!
- When creating shipment: `"pickup_location": "Home Office"` ← string name
- If user deletes location in Shiprocket dashboard and we send old name → API error
- Error triggers sync → UI updates → user selects valid location

**⚠️ Important:** New locations require phone OTP verification in Shiprocket dashboard. Until verified (status=2), pickups may be delayed or rejected by some couriers.

---

## 4. Auto-Ship Configuration

> **Purpose:** Enables automatic shipment creation after successful payment. When enabled, orders automatically progress from "Paid" to "Shipped" without manual intervention. Great for high-volume stores with standardized products.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUTO-SHIP SETTINGS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [  ] Enable Auto-Ship                                                      │
│                                                                              │
│  When enabled, shipments are created automatically after payment.           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Wait Time Before Auto-Ship                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ○ Immediate (right after payment)                                    │   │
│  │   ⚠️ No review window! Orders ship instantly.                        │   │
│  │                                                                       │   │
│  │ ○ 30 minutes                                                         │   │
│  │   Quick review window. Check for issues before shipping.             │   │
│  │                                                                       │   │
│  │ ○ 1 hour                                                             │   │
│  │   Moderate delay. Time to review orders during business hours.       │   │
│  │                                                                       │   │
│  │ ○ 2 hours                                                            │   │
│  │   Standard workflow. Enough time to handle customer requests.        │   │
│  │                                                                       │   │
│  │ ● 4 hours (recommended)                                              │   │
│  │   ✅ Safest option. Catch cancellations, address issues, or fraud.  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Courier Selection                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ● Cheapest available                                                 │   │
│  │   Selects the lowest-priced courier for each delivery pincode.       │   │
│  │                                                                       │   │
│  │ ○ Fastest available                                                  │   │
│  │   Selects the courier with shortest estimated delivery time.         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ℹ️ Courier is selected dynamically for each order based on destination    │
│     pincode serviceability and current rates.                               │
│                                                                              │
│                                                             [Save Settings] │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

<!-- NOTE: We will add default courier selection by aggregator too, as shiprocket uses the CORE AI driven courier selection -->

> **Why No "Preferred Courier" Option?** We intentionally removed the ability to set a preferred/fixed courier because:
> - **Serviceability varies:** Not all couriers serve all pincodes. Delhivery may not deliver to remote areas where Xpressbees does.
> - **Rate changes:** Courier rates fluctuate. A "preferred" courier might become expensive.
> - **Availability:** Couriers may temporarily suspend services in certain regions.
> - **Better approach:** Let the system pick the best courier (cheapest/fastest) dynamically for each order's destination.

**Toggle & Option Explanations:**

| Element | What It Does |
|---------|--------------|
| **[Enable Auto-Ship]** | Master toggle. When OFF, all orders require manual "Ship Now" action. When ON, shipments are created automatically based on settings below. |
| **Wait Time** | Delay before auto-ship triggers. Gives seller time to review/cancel if needed. "Immediate" means shipment created right after payment webhook received. |
| **Courier Selection** | How auto-ship picks the courier: **Cheapest** = lowest rate, **Fastest** = shortest ETA. Both options check serviceability first. |

**Wait Time Options - Detailed Recommendations:**

| Option | ⚠️ Consideration | Best For |
|--------|------------------|----------|
| **Immediate** | No review window. Cannot cancel/modify orders before shipping. High-volume days mean instant shipment creation. | Trusted products, repeat customers, digital-first businesses |
| **30 minutes** | Very short window. May miss issues if you're not actively monitoring. | Small stores with low daily orders (<10) |
| **1 hour** | Reasonable for active sellers. Check orders hourly. | Medium stores (10-30 orders/day) |
| **2 hours** | Good buffer for customer service requests. | Stores with frequent address/item change requests |
| **4 hours (recommended)** | Best for most businesses. Catches fraud, wrong addresses, customer cancellations. | Most e-commerce stores |

**Button Actions:**

| Button | What It Does |
|--------|--------------|
| **[Save Settings]** | Saves auto-ship config to `StoreSettings.autoShip` JSON: `{ enabled, waitMinutes, courierSelection }` |

**⚠️ Important:** Auto-ship uses product dimensions stored in your catalog. Ensure all products have accurate weight and dimensions to avoid shipping disputes.

---

## 5. Manual Shipping (Always Available)

> **Design Decision:** Manual shipping settings section has been **removed** from Shipping Settings. Manual shipping is **always available by default** in every order's shipping modal.

**Why No Separate Settings?**
- Manual shipping doesn't need configuration - it's just entering AWB + courier name
- No preset couriers needed - seller types the courier name directly ("Speed Post", "DTDC", "Self Delivery", etc.)
- No default shipping charge needed - seller enters actual cost paid to courier
- Simpler UX - one less settings section to configure

**How Manual Shipping Works:**

| Action | Where It Happens |
|--------|------------------|
| **Ship Manually** | Click "Ship Manually" button on any order page |
| **Enter Details** | Modal opens: enter courier name, AWB number, tracking URL (optional) |
| **Update Status** | Order moves to "Shipped" status, customer gets notification |
| **Track Progress** | Manually update status as package progresses (In Transit → Out for Delivery → Delivered) |

**Manual Shipping Modal (available on every order):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ship Order Manually  #ORD-ABC123                                      [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Courier Name *                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ India Post (Speed Post)                                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  AWB / Tracking Number                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ EE123456789IN                                                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ℹ️ Can be added later if not available now                                │
│                                                                              │
│  Tracking URL (optional)                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ https://www.indiapost.gov.in/...                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [✓] Send shipping notification to customer                                │
│                                                                              │
│                                          [Cancel]  [Mark as Shipped]        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**💡 Key Point:** Sellers can use manual shipping regardless of whether Shiprocket is connected. This ensures no seller is ever blocked from fulfilling orders.

---
