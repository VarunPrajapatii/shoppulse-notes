# Part 3: Library Functions (High-Level Architecture)

## Modular Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYER ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   src/lib/shipping/                                                         │
│   │                                                                          │
│   ├── index.ts                  # Main exports                              │
│   │                                                                          │
│   ├── shipping-service.ts       # High-level orchestration                  │
│   │   └─ createShipment()       # Routes to correct provider                │
│   │   └─ cancelShipment()                                                   │
│   │   └─ trackShipment()                                                    │
│   │   └─ schedulePickup()                                                   │
│   │                                                                          │
│   ├── providers/                                                            │
│   │   ├── base-provider.ts      # Abstract interface                        │
│   │   ├── shiprocket.ts         # Shiprocket implementation                │
│   │   ├── delhivery.ts          # Future: Direct Delhivery                 │
│   │   └── manual.ts             # Manual shipping (no API)                  │
│   │                                                                          │
│   ├── rate-calculator.ts        # Rate comparison logic                     │
│   │                                                                          │
│   ├── label-generator.ts        # Label generation (Shiprocket/custom)      │
│   │                                                                          │
│   ├── webhook-handler.ts        # Process incoming webhooks                 │
│   │                                                                          │
│   ├── status-mapper.ts          # Normalize status codes                    │
│   │                                                                          │
│   └── utils/                                                                │
│       ├── volumetric.ts         # Calculate volumetric weight               │
│       ├── pincode.ts            # Pincode validation                        │
│       └── tracking-url.ts       # Generate tracking URLs                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Base Provider Interface

```typescript
// src/lib/shipping/providers/base-provider.ts

interface ShipmentRequest {
  orderId: string;
  order: Order & { shippingAddress: Address };
  package: {
    weight: number;  // KG
    length: number;  // CM
    breadth: number;
    height: number;
  };
  pickupAddressId: string;
  courierId?: number;
  isCod: boolean;
  codAmount?: number;
}

interface ShipmentResult {
  providerOrderId: string;
  providerShipmentId: string;
  awbCode: string;
  courierCode: string;
  courierName: string;
  trackingUrl?: string;
  labelUrl?: string;
  estimatedDeliveryDate?: Date;
  shippingCharge: number;
}

interface RateResult {
  courierId: number;
  courierCode: string;
  courierName: string;
  rate: number;
  estimatedDays: number;
  rating?: number;
  isCodAvailable: boolean;
}

interface TrackingResult {
  currentStatus: string;
  statusCode: string;
  location?: string;
  estimatedDelivery?: Date;
  events: Array<{
    status: string;
    description: string;
    location?: string;
    timestamp: Date;
  }>;
}

abstract class BaseShippingProvider {
  abstract readonly providerCode: ShippingProvider;
  abstract readonly displayName: string;
  
  // Core operations
  abstract createShipment(request: ShipmentRequest): Promise<ShipmentResult>;
  abstract cancelShipment(shipmentId: string): Promise<boolean>;
  abstract getRates(params: RateParams): Promise<RateResult[]>;
  abstract track(awbCode: string): Promise<TrackingResult>;
  
  // Pickup
  abstract schedulePickup(shipmentIds: string[], date: Date): Promise<string>;
  
  // Label
  abstract getLabel(shipmentId: string): Promise<string>; // URL
  
  // Serviceability
  abstract checkServiceability(pickup: string, delivery: string): Promise<boolean>;
}
```

---

## 2. Shiprocket Provider (Implementation Flow)

```typescript
// src/lib/shipping/providers/shiprocket.ts

class ShiprocketProvider extends BaseShippingProvider {
  providerCode = ShippingProvider.SHIPROCKET;
  displayName = "Shiprocket";
  
  private baseUrl = "https://apiv2.shiprocket.in/v1/external";
  
  // Get token from store integration (cached)
  private async getToken(storeId: string): Promise<string> {
    // 1. Check cache (Redis or memory)
    // 2. If expired, re-authenticate with stored email/password
    // 3. Return valid token
  }
  
  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    // STEP 1: Create order in Shiprocket
    //   POST /orders/create/adhoc
    //   Body: { order_id, order_date, pickup_location, ... items }
    //   Returns: { order_id, shipment_id }
    
    // STEP 2: Assign courier & generate AWB
    //   POST /courier/assign/awb
    //   Body: { shipment_id, courier_id? }
    //   Returns: { awb_code, courier_name }
    
    // STEP 3: Return combined result
  }
  
  async getRates(params: RateParams): Promise<RateResult[]> {
    // GET /courier/serviceability
    //   Query: pickup_postcode, delivery_postcode, weight, cod
    //   Returns: available_courier_companies[]
    //
    // Transform to RateResult[]
  }
  
  async track(awbCode: string): Promise<TrackingResult> {
    // GET /courier/track/awb/{awb}
    // Transform response to TrackingResult
  }
  
  async schedulePickup(shipmentIds: string[], date: Date): Promise<string> {
    // POST /courier/generate/pickup
    // Body: { shipment_id: [...], pickup_date }
    // Returns: pickup_token
  }
  
  async getLabel(shipmentId: string): Promise<string> {
    // POST /courier/generate/label
    // Body: { shipment_id: [...] }
    // Returns: label_url
  }
}
```

---

## 3. Manual Provider (No API)

```typescript
// src/lib/shipping/providers/manual.ts

class ManualShippingProvider extends BaseShippingProvider {
  providerCode = ShippingProvider.MANUAL;
  displayName = "Manual Shipping";
  
  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    // No API call - just create DB record
    // AWB provided by seller, or generated placeholder
    return {
      providerOrderId: null,
      providerShipmentId: null,
      awbCode: request.awbCode || await this.generatePlaceholderAWB(),
      courierCode: request.courierCode || "manual",
      courierName: request.courierName || "Manual Shipping",
      trackingUrl: request.trackingUrl || null,
      estimatedDeliveryDate: request.estimatedDeliveryDate,
      shippingCharge: 0,  // Seller enters manually
    };
  }
  
  // These throw "Not available for manual shipping"
  async getRates(): Promise<RateResult[]> {
    throw new Error("Rate calculation not available for manual shipping");
  }
  
  async track(awbCode: string): Promise<TrackingResult> {
    // Return from our database only (ShipmentEvent table)
    // No external API call
  }
  
  async schedulePickup(): Promise<string> {
    throw new Error("Pickup scheduling not available for manual shipping");
  }
  
  async getLabel(): Promise<string> {
    throw new Error("Label generation not available for manual shipping");
  }
  
  // Manual-specific method
  async updateStatus(
    shipmentId: string, 
    status: ShipmentStatus, 
    details: { location?: string; description?: string }
  ): Promise<void> {
    // Update Shipment record
    // Create ShipmentEvent record
    // Send customer notification
  }
}
```

---

## 4. Main Shipping Service (Router)

```typescript
// src/lib/shipping/shipping-service.ts

class ShippingService {
  private providers = new Map<ShippingProvider, BaseShippingProvider>();
  
  constructor() {
    this.providers.set(ShippingProvider.SHIPROCKET, new ShiprocketProvider());
    this.providers.set(ShippingProvider.MANUAL, new ManualShippingProvider());
    // Add more as needed
  }
  
  private getProvider(provider: ShippingProvider): BaseShippingProvider {
    const p = this.providers.get(provider);
    if (!p) throw new Error(`Provider ${provider} not supported`);
    return p;
  }
  
  // MAIN ENTRY POINT
  async createShipment(
    storeId: string,
    orderId: string,
    options: CreateShipmentOptions
  ): Promise<Shipment> {
    // 1. Validate order exists and is shippable
    // 2. Get provider
    // 3. Call provider.createShipment()
    // 4. Create Shipment record in DB
    // 5. Update Order status
    // 6. Send customer notification
    // 7. Return shipment
  }
  
  async getShippingRates(
    storeId: string,
    params: RateParams
  ): Promise<RateResult[]> {
    // 1. Get active shipping integration
    // 2. Call provider.getRates()
    // 3. Sort by price/rating
    // 4. Return
  }
  
  async trackShipment(shipmentId: string): Promise<TrackingResult> {
    // 1. Get shipment from DB
    // 2. If MANUAL: return events from DB
    // 3. If SHIPROCKET: call API, update DB, return
  }
  
  async cancelShipment(shipmentId: string): Promise<boolean> {
    // 1. Check if cancellable (not picked up)
    // 2. Call provider.cancelShipment()
    // 3. Update DB
    // 4. Return success
  }
}

// Singleton export
export const shippingService = new ShippingService();
```

---

## 5. Pickup Location Sync Service

```typescript
// src/lib/shipping/pickup-location-service.ts

interface PickupLocationSyncResult {
  added: number;
  updated: number;
  deleted: number;  // Soft deleted (isActive=false)
}

class PickupLocationService {
  
  /**
   * Sync pickup locations from Shiprocket to local Address model.
   * 
   * TRIGGERS:
   * 1. Manual "Sync from Shiprocket" button click
   * 2. Weekly cron job (every Sunday midnight)
   * 3. After API error "pickup location not found" during shipment
   */
  async syncFromProvider(storeId: string): Promise<PickupLocationSyncResult> {
    const result = { added: 0, updated: 0, deleted: 0 };
    
    // 1. Fetch from Shiprocket
    const token = await getShiprocketToken(storeId);
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    const providerLocations = data.data.shipping_address;
    
    // 2. Get local locations
    const localLocations = await prisma.address.findMany({
      where: { storeId, type: "PICKUP" }
    });
    
    // 3. Build lookup maps
    const providerIds = new Set(providerLocations.map((l: any) => l.id));
    const localByProviderId = new Map(
      localLocations
        .filter(l => l.providerMetadata?.shiprocket?.pickupId)
        .map(l => [l.providerMetadata.shiprocket.pickupId, l])
    );
    
    // 4. Process each provider location
    for (const pl of providerLocations) {
      const existingLocal = localByProviderId.get(pl.id);
      
      if (existingLocal) {
        // UPDATE: Location exists locally, update if changed
        await prisma.address.update({
          where: { id: existingLocal.id },
          data: {
            name: pl.pickup_location,     // CRITICAL: This name is used in API
            line1: pl.address,
            line2: pl.address_2 || null,
            city: pl.city,
            state: pl.state,
            pincode: pl.pin_code,
            phone: pl.phone,
            email: pl.email,
            isActive: true,               // Reactivate if was soft-deleted
            lastSyncedAt: new Date(),
            providerMetadata: {
              shiprocket: {
                pickupId: pl.id,
                status: pl.status,        // 1=pending, 2=verified
                phoneVerified: pl.phone_verified === 1,
                pickupCode: pl.pickup_code,
                rtoAddressId: pl.rto_address_id,
              }
            }
          }
        });
        result.updated++;
      } else {
        // ADD: New location from provider
        await prisma.address.create({
          data: {
            storeId,
            type: "PICKUP",
            name: pl.pickup_location,     // CRITICAL: This name is used in API
            line1: pl.address,
            line2: pl.address_2 || null,
            city: pl.city,
            state: pl.state,
            pincode: pl.pin_code,
            country: pl.country || "IN",
            phone: pl.phone,
            email: pl.email,
            isActive: true,
            isDefault: pl.is_primary_location === 1,
            lastSyncedAt: new Date(),
            providerMetadata: {
              shiprocket: {
                pickupId: pl.id,
                status: pl.status,
                phoneVerified: pl.phone_verified === 1,
                pickupCode: pl.pickup_code,
                rtoAddressId: pl.rto_address_id,
              }
            }
          }
        });
        result.added++;
      }
    }
    
    // 5. Soft-delete locations no longer in provider
    for (const local of localLocations) {
      const providerId = local.providerMetadata?.shiprocket?.pickupId;
      if (providerId && !providerIds.has(providerId)) {
        await prisma.address.update({
          where: { id: local.id },
          data: { isActive: false, lastSyncedAt: new Date() }
        });
        result.deleted++;
      }
    }
    
    // 6. Ensure there's a default if current default was deleted
    const hasActiveDefault = await prisma.address.findFirst({
      where: { storeId, type: "PICKUP", isActive: true, isDefault: true }
    });
    
    if (!hasActiveDefault) {
      const firstActive = await prisma.address.findFirst({
        where: { storeId, type: "PICKUP", isActive: true },
        orderBy: { createdAt: "asc" }
      });
      if (firstActive) {
        await prisma.address.update({
          where: { id: firstActive.id },
          data: { isDefault: true }
        });
      }
    }
    
    return result;
  }
  
  /**
   * Add new pickup location via Shiprocket API, then save locally.
   */
  async addPickupLocation(
    storeId: string,
    data: { name: string; phone: string; email: string; line1: string; line2?: string; city: string; state: string; pincode: string }
  ): Promise<Address> {
    // 1. Call Shiprocket API
    const token = await getShiprocketToken(storeId);
    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/settings/company/addpickup",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_location: data.name,  // This becomes the API identifier!
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.line1,
          address_2: data.line2 || "",
          city: data.city,
          state: data.state,
          country: "India",
          pin_code: data.pincode
        })
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || "Failed to add pickup location");
    }
    
    // 2. Save to local Address model
    const address = await prisma.address.create({
      data: {
        storeId,
        type: "PICKUP",
        name: data.name,
        phone: data.phone,
        email: data.email,
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: "IN",
        isActive: true,
        lastSyncedAt: new Date(),
        providerMetadata: {
          shiprocket: {
            pickupId: result.pickup_id,
            status: result.address.status,  // 1=pending verification
            phoneVerified: false,
          }
        }
      }
    });
    
    return address;
  }
  
  /**
   * Get pickup location name for Shiprocket API.
   * Falls back to default if locationId not found.
   */
  async getPickupLocationName(storeId: string, locationId?: string): Promise<string> {
    let location: Address | null = null;
    
    if (locationId) {
      location = await prisma.address.findFirst({
        where: { id: locationId, storeId, type: "PICKUP", isActive: true }
      });
    }
    
    if (!location) {
      // Fall back to default
      location = await prisma.address.findFirst({
        where: { storeId, type: "PICKUP", isActive: true, isDefault: true }
      });
    }
    
    if (!location) {
      throw new Error("No active pickup location found. Please add one in Settings.");
    }
    
    return location.name;  // This is what Shiprocket expects in API!
  }
}

export const pickupLocationService = new PickupLocationService();
```

---

## 6. Webhook Handler

```typescript
// src/lib/shipping/webhook-handler.ts

class ShippingWebhookHandler {
  
  async handleShiprocketWebhook(payload: ShiprocketWebhookPayload): Promise<void> {
    // STEP 1: Extract AWB
    const awbCode = payload.awb;
    
    // STEP 2: Find shipment
    const shipment = await prisma.shipment.findFirst({
      where: { awbCode, provider: "SHIPROCKET" },
      include: { order: true }
    });
    
    if (!shipment) {
      console.log(`Unknown AWB: ${awbCode}`);
      return;
    }
    
    // STEP 3: Map status
    const normalizedStatus = statusMapper.mapShiprocket(payload.current_status);
    
    // STEP 4: Create event
    await prisma.shipmentEvent.create({
      data: {
        shipmentId: shipment.id,
        status: payload.current_status,
        statusCode: normalizedStatus,
        description: payload.current_status_body || payload.current_status,
        location: payload.scans?.[0]?.location,
        eventTime: new Date(payload.scan_datetime),
        rawPayload: payload,
      }
    });
    
    // STEP 5: Update shipment
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: normalizedStatus,
        currentLocation: payload.scans?.[0]?.location,
        ...(normalizedStatus === "DELIVERED" && { deliveredAt: new Date() }),
      }
    });
    
    // STEP 6: Update order status
    await this.syncOrderStatus(shipment.orderId);
    
    // STEP 7: Send notification
    await notificationService.sendShippingUpdate(shipment.order, normalizedStatus);
  }
  
  private async syncOrderStatus(orderId: string): Promise<void> {
    // Map shipment status to order status
    // DELIVERED -> Order.DELIVERED
    // IN_TRANSIT -> Order.IN_TRANSIT
    // etc.
  }
}
```

---

## 6. Status Mapper

```typescript
// src/lib/shipping/status-mapper.ts

const SHIPROCKET_STATUS_MAP: Record<string, ShipmentStatus> = {
  // Pickup
  "Pickup Scheduled": "PICKUP_SCHEDULED",
  "Pickup Queued": "PICKUP_SCHEDULED",
  "Out For Pickup": "PICKUP_SCHEDULED",
  "Pickup Exception": "PENDING",
  "Picked Up": "PICKED_UP",
  
  // In Transit
  "In Transit": "IN_TRANSIT",
  "Reached at Destination Hub": "IN_TRANSIT",
  
  // Out for Delivery
  "Out for Delivery": "OUT_FOR_DELIVERY",
  
  // Delivered
  "Delivered": "DELIVERED",
  
  // Failed
  "Undelivered": "DELIVERY_FAILED",
  "Delivery Failed": "DELIVERY_FAILED",
  
  // RTO
  "RTO Initiated": "RTO_INITIATED",
  "RTO In-Transit": "RTO_IN_TRANSIT",
  "RTO Delivered": "RTO_DELIVERED",
  
  // Cancelled
  "Cancelled": "CANCELLED",
  
  // Lost
  "Lost": "LOST",
};

export function mapShiprocketStatus(shiprocketStatus: string): ShipmentStatus {
  return SHIPROCKET_STATUS_MAP[shiprocketStatus] || "IN_TRANSIT";
}
```

---

## 7. Utility Functions

```typescript
// src/lib/shipping/utils/volumetric.ts
export function calculateVolumetricWeight(
  length: number, 
  breadth: number, 
  height: number
): number {
  // Industry standard: L × B × H / 5000 for air freight
  // Surface: L × B × H / 4000
  return (length * breadth * height) / 5000;
}

export function getBillableWeight(
  actualWeight: number,
  volumetricWeight: number
): number {
  return Math.max(actualWeight, volumetricWeight);
}

// src/lib/shipping/utils/tracking-url.ts
export function generateTrackingUrl(
  provider: ShippingProvider,
  awbCode: string,
  courierCode?: string
): string {
  switch (provider) {
    case "SHIPROCKET":
      return `https://www.shiprocket.in/shipment-tracking/?awb=${awbCode}`;
    case "MANUAL":
      if (courierCode === "speedpost") {
        return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?ctl00$PlaceHolderMain$ucNewLeg498498498498${awbCode}`;
      }
      return `/track/${awbCode}`;  // Internal tracking page
    default:
      return `/track/${awbCode}`;
  }
}
```

---

## Adding New Provider (Example: Delhivery)

```typescript
// src/lib/shipping/providers/delhivery.ts

class DelhiveryProvider extends BaseShippingProvider {
  providerCode = ShippingProvider.DELHIVERY;
  displayName = "Delhivery";
  
  private baseUrl = "https://track.delhivery.com/api/v1";
  
  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    // POST /packages/json/
    // Different payload format than Shiprocket
  }
  
  async getRates(params: RateParams): Promise<RateResult[]> {
    // GET /c/api/pin-codes/json/
    // Transform to common format
  }
  
  // ... implement other methods
}

// Register in shipping-service.ts
this.providers.set(ShippingProvider.DELHIVERY, new DelhiveryProvider());
```

---

*Next: Part 4 - Dashboard Settings & UI Components*
