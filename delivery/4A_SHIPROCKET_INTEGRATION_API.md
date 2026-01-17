# Part 4A: Shiprocket Integration - API Guide

## 🔌 Technical Integration with Shiprocket

This document provides a comprehensive technical guide to integrating Shiprocket's API into ShopPulse for automated shipping management.

---

## Table of Contents

1. [Shiprocket API Overview](#shiprocket-api-overview)
2. [Authentication & Credentials](#authentication)
3. [Setting Up Integration](#setup)
4. [Rate Calculation API](#rate-calculation)
5. [Pincode Serviceability](#pincode-serviceability)
6. [Creating Orders/Shipments](#creating-shipments)
7. [AWB Generation](#awb-generation)
8. [Label Generation](#label-generation)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## Shiprocket API Overview

### Understanding the API Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET API OVERVIEW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BASE URL: https://apiv2.shiprocket.in/v1/external                          │
│                                                                              │
│  AUTHENTICATION: Bearer Token (JWT)                                         │
│                                                                              │
│  API CATEGORIES:                                                            │
│  ────────────────                                                           │
│                                                                              │
│  1. AUTHENTICATION APIs                                                     │
│     ├─ POST /auth/login           → Get access token                        │
│     └─ POST /auth/register        → Create account (rarely needed)          │
│                                                                              │
│  2. ORDER MANAGEMENT APIs                                                   │
│     ├─ POST /orders/create/adhoc  → Create new order                        │
│     ├─ GET /orders                → List all orders                         │
│     ├─ GET /orders/show/{id}      → Get order details                       │
│     └─ POST /orders/cancel/shipment/awbs → Cancel shipments (body: {awbs})  │
│                                                                              │
│  3. SHIPMENT APIs                                                           │
│     ├─ POST /shipments/create/forward-shipment → Wrapper: order+AWB+pickup  │
│     ├─ POST /courier/generate/pickup → Schedule pickup                      │
│     ├─ GET /courier/track/awb/{awb}  → Track shipment                      │
│     └─ POST /courier/assign/awb      → Generate AWB                         │
│                                                                              │
│  4. COURIER SERVICES APIs                                                   │
│     ├─ GET /courier/serviceability   → Check pincode serviceability         │
│     └─ GET /courier/courierid        → Get available couriers               │
│                                                                              │
│  5. UTILITY APIs                                                            │
│     ├─ GET /settings/company/pickup  → Get pickup locations                 │
│     ├─ POST /courier/generate/label  → Generate shipping label              │
│     └─ POST /manifests/generate      → Generate manifest                    │
│                                                                              │
│  RATE LIMITS:                                                               │
│  ────────────                                                               │
│  • Free tier: 100 requests/minute                                           │
│  • Paid plans: Higher limits                                                │
│  • Respect 429 (Too Many Requests) responses                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Response Format

```
SUCCESS RESPONSE:
─────────────────

HTTP 200 OK
{
  "status": 1,              // 1 = success
  "status_code": 200,
  "message": "Success message",
  "data": {
    // Actual response data
  }
}


ERROR RESPONSE:
───────────────

HTTP 4xx/5xx
{
  "status": 0,              // 0 = error
  "status_code": 400,
  "message": "Error description",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

---

## Authentication

### Getting API Credentials

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET AUTHENTICATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: STORE OWNER CREATES SHIPROCKET ACCOUNT                             │
│  ───────────────────────────────────────────────                            │
│                                                                              │
│  1. Go to app.shiprocket.in/register                                        │
│  2. Sign up with business email                                             │
│  3. Complete KYC (PAN, GST optional)                                        │
│  4. Add bank account for COD remittance                                     │
│  5. Add pickup address                                                      │
│                                                                              │
│  STEP 2: GET API CREDENTIALS                                                │
│  ───────────────────────────────                                            │
│                                                                              │
│  In Shiprocket Dashboard:                                                   │
│  Settings → API → Create API User                                           │
│                                                                              │
│  You get:                                                                    │
│  • Email (API username)                                                      │
│  • Password (API password)                                                   │
│                                                                              │
│  NOT API keys! Shiprocket uses email/password auth                          │
│                                                                              │
│  STEP 3: GENERATE ACCESS TOKEN                                              │
│  ─────────────────────────────────                                          │
│                                                                              │
│  POST https://apiv2.shiprocket.in/v1/external/auth/login                    │
│                                                                              │
│  Request Body:                                                              │
│  {                                                                           │
│    "email": "api@mystore.com",                                              │
│    "password": "api_password_123"                                           │
│  }                                                                           │
│                                                                              │
│  Response:                                                                   │
│  {                                                                           │
│    "id": 123456,                                                            │
│    "first_name": "Store",                                                   │
│    "last_name": "Owner",                                                    │
│    "email": "api@mystore.com",                                              │
│    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."                       │
│  }                                                                           │
│                                                                              │
│  TOKEN DETAILS:                                                             │
│  ───────────────                                                            │
│  • JWT token                                                                 │
│  • Valid for 10 days                                                         │
│  • Use in Authorization header                                               │
│  • Refresh before expiry                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Management in ShopPulse

```
HOW SHOPPULSE SHOULD HANDLE TOKENS:
────────────────────────────────────

┌──────────────────────────────────────────────────────────────────────┐
│  BYOK Model: Store owner provides their Shiprocket credentials        │
│                                                                       │
│  Store Settings:                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Shiprocket Integration                                         │  │
│  │  ──────────────────────────────────────────────────────────────│  │
│  │                                                                 │  │
│  │  Email:    [api@mystore.com                            ]       │  │
│  │  Password: [••••••••••••••                             ]       │  │
│  │                                                                 │  │
│  │  [Test Connection]  [Save Credentials]                         │  │
│  │                                                                 │  │
│  │  Status: ✅ Connected (Token expires in 9 days)                │  │
│  │                                                                 │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘

STORAGE REQUIREMENTS:
─────────────────────

Store in StoreIntegration model (encrypted):
{
  type: 'SHIPPING',
  provider: 'shiprocket',
  credentials: {
    email: 'api@mystore.com',           // Encrypted
    password: 'api_password_123',       // Encrypted
    accessToken: 'eyJhbGci...',         // Encrypted
    tokenExpiry: '2026-01-11T00:00:00Z' // When token expires
  }
}

<!-- NOTE: We will create cron job that runs everyday and refreshes tokens if they are about to expire (e.g., if its less than 2 days to expiry) -->

TOKEN REFRESH LOGIC:
────────────────────

async function getShiprocketToken(storeId: string): Promise<string> {
  const integration = await getIntegration(storeId, 'SHIPPING', 'shiprocket');
  
  const now = new Date();
  const expiry = new Date(integration.credentials.tokenExpiry);
  const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
  
  // Refresh if less than 2 days until expiry
  if (daysUntilExpiry < 2) {
    const newToken = await refreshShiprocketToken(
      integration.credentials.email,
      integration.credentials.password
    );
    
    await updateIntegrationToken(storeId, newToken);
    return newToken.token;
  }
  
  return integration.credentials.accessToken;
}
```

### Using the Token

```
ALL API REQUESTS NEED THIS HEADER:
──────────────────────────────────

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}


EXAMPLE REQUEST:
────────────────

const response = await fetch(
  'https://apiv2.shiprocket.in/v1/external/orders',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

---

## Setup

### Integration Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHOPPULSE SHIPROCKET SETUP FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER JOURNEY:                                                              │
│  ─────────────                                                              │
│                                                                              │
│  Store Owner logs into ShopPulse                                            │
│       │                                                                      │
│       ▼                                                                      │
│  Settings → Integrations → Shipping                                         │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  📦 SHIPPING INTEGRATIONS                                           │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  🚀 Shiprocket                                              │    │   │
│  │  │  India's #1 shipping aggregator                            │    │   │
│  │  │                                                             │    │   │
│  │  │  • 15+ courier partners                                     │    │   │
│  │  │  • Automatic rate comparison                               │    │   │
│  │  │  • Free to start                                            │    │   │
│  │  │                                                             │    │   │
│  │  │  [Connect Shiprocket]                                       │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       │ Click "Connect"                                                     │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  CONNECT YOUR SHIPROCKET ACCOUNT                                    │   │
│  │                                                                      │   │
│  │  Don't have an account? [Create Free Account]                       │   │
│  │                                                                      │   │
│  │  API Email:                                                         │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                             │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  API Password:                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                                                             │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  [Test Connection]                                                  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       │ On successful test                                                  │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ✅ CONNECTION SUCCESSFUL!                                          │   │
│  │                                                                      │   │
│  │  Account: MyStore (api@mystore.com)                                 │   │
│  │                                                                      │   │
│  │  SELECT DEFAULT PICKUP LOCATION:                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │  ◉ Primary Warehouse                                        │    │   │
│  │  │    123 ABC Street, Delhi - 110001                           │    │   │
│  │  │                                                             │    │   │
│  │  │  ○ Secondary Location                                       │    │   │
│  │  │    456 XYZ Road, Gurgaon - 122001                          │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  [Save & Enable]                                                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fetching Pickup Locations

```
GET PICKUP LOCATIONS:
─────────────────────

Endpoint: GET /settings/company/pickup

Response:
{
  "data": {
    "shipping_address": [
      {
        "id": 12345,
        "pickup_location": "Primary Warehouse",
        "name": "MyStore",
        "email": "contact@mystore.com",
        "phone": "9876543210",
        "address": "123 ABC Street",
        "address_2": "Near XYZ",
        "city": "New Delhi",
        "state": "Delhi",
        "country": "India",
        "pin_code": "110001",
        "status": 1  // 1 = active
      },
      {
        "id": 12346,
        "pickup_location": "Secondary",
        // ... other fields
      }
    ]
  }
}

STORE IN SHOPPULSE:
───────────────────

Save pickup location ID with integration:
{
  credentials: {
    email: '...',
    password: '...',
    accessToken: '...',
    tokenExpiry: '...',
    defaultPickupLocationId: 12345,
    pickupLocations: [...] // Cache for UI
  }
}
```

---

## Rate Calculation

### Checking Shipping Rates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPPING RATE CALCULATION                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHEN TO CHECK RATES:                                                       │
│  ────────────────────                                                        │
│  1. During checkout (show customer shipping cost)                           │
│  2. When creating shipment (choose best courier)                            │
│  3. Store settings (estimate costs)                                         │
│                                                                              │
│  API ENDPOINT:                                                              │
│  ─────────────                                                              │
│  GET /courier/serviceability                                                │
│                                                                              │
│  Query Parameters:                                                          │
│  ─────────────────                                                          │
│  pickup_postcode     - Seller's pincode (required)                          │
│  delivery_postcode   - Customer's pincode (required)                        │
│  weight              - Package weight in kg (required)                      │
│  cod                 - 1 for COD, 0 for prepaid (required)                  │
│  order_id            - Optional, for shipment linking                       │
│  declared_value      - Optional, for insurance                              │
│                                                                              │
│  EXAMPLE REQUEST:                                                           │
│  ────────────────                                                           │
│                                                                              │
│  GET /courier/serviceability?                                               │
│      pickup_postcode=110001&                                                │
│      delivery_postcode=400001&                                              │
│      weight=0.5&                                                             │
│      cod=0                                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rate Response Structure

```json
{
  "status": 200,
  "data": {
    "available_courier_companies": [
      {
        "id": 1,
        "name": "Delhivery",
        "courier_company_id": 26,
        "courier_name": "Delhivery Surface",
        "courier_type": "Surface",
        "freight_charge": 42.00,
        "cod_charges": 0,
        "cod_multiplier": 0,
        "coverage_charges": 0,
        "rto_charges": 42.00,
        "estimated_delivery_days": "4-5",
        "etd": "2026-01-06",
        "rating": 4.2,
        "is_custom_rate": 0,
        "is_hyperlocal": false,
        "is_rto_address_available": true,
        "is_surface": true,
        "zone": "b",
        "min_weight": 0.5,
        "blocked": false,
        "pod_available": true,
        "is_recommended": true,
        "suppress_date": null
      },
      {
        "courier_name": "DTDC Economy",
        "freight_charge": 35.00,
        "estimated_delivery_days": "5-7",
        "rating": 3.8,
        "is_recommended": false
      },
      {
        "courier_name": "BlueDart Express",
        "freight_charge": 78.00,
        "estimated_delivery_days": "2-3",
        "rating": 4.5,
        "is_recommended": false
      }
    ],
    "child_courier_id": null,
    "is_recommendation_enabled": 1,
    "recommended_by": {
      "id": 1,
      "title": "Shiprocket Recommended"
    },
    "shiprocket_recommended_courier_id": 26
  }
}
```

### Using Rates in ShopPulse

```
CHECKOUT FLOW - CALCULATING SHIPPING:
──────────────────────────────────────

async function calculateShippingCost(
  storeId: string,
  customerPincode: string,
  cartWeight: number,
  isCOD: boolean
): Promise<ShippingOption[]> {
  
  // Get store's Shiprocket integration
  const integration = await getShippingIntegration(storeId);
  
  if (!integration) {
    // Fallback: Return fixed shipping rate or "Free Shipping"
    return [{ name: 'Standard Shipping', cost: 0, days: '5-7' }];
  }
  
  // Get seller's pickup pincode
  const sellerPincode = integration.credentials.pickupLocations
    .find(l => l.id === integration.credentials.defaultPickupLocationId)
    ?.pin_code;
  
  // Call Shiprocket API
  const token = await getShiprocketToken(storeId);
  
  const response = await fetch(
    `https://apiv2.shiprocket.in/v1/external/courier/serviceability?` +
    `pickup_postcode=${sellerPincode}&` +
    `delivery_postcode=${customerPincode}&` +
    `weight=${cartWeight}&` +
    `cod=${isCOD ? 1 : 0}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  
  if (data.data.available_courier_companies.length === 0) {
    throw new Error('Delivery not available to this pincode');
  }
  
  // Transform to ShopPulse format
  return data.data.available_courier_companies.map(courier => ({
    id: courier.courier_company_id,
    name: courier.courier_name,
    cost: courier.freight_charge + (isCOD ? courier.cod_charges : 0),
    days: courier.estimated_delivery_days,
    etd: courier.etd,
    isRecommended: courier.is_recommended
  }));
}
```

---

## Pincode Serviceability

### Understanding Serviceability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              PINCODE SERVICEABILITY                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHAT IT MEANS:                                                             │
│  ───────────────                                                            │
│  Not all couriers deliver to all pincodes                                   │
│  Some pincodes have restrictions (COD not available, etc.)                  │
│                                                                              │
│  SCENARIOS:                                                                 │
│  ──────────                                                                 │
│                                                                              │
│  ✅ PINCODE SERVICEABLE                                                     │
│     Multiple couriers available                                              │
│     Both prepaid and COD options                                            │
│     Normal delivery times                                                    │
│                                                                              │
│  ⚠️ PINCODE PARTIALLY SERVICEABLE                                           │
│     Only 1-2 couriers available                                             │
│     OR only prepaid (no COD)                                                │
│     OR longer delivery times                                                 │
│                                                                              │
│  ❌ PINCODE NOT SERVICEABLE                                                  │
│     No courier delivers to this pincode                                     │
│     Usually very remote areas                                               │
│     Need to use India Post or inform customer                               │
│                                                                              │
│  CHECK TIMING:                                                              │
│  ──────────────                                                             │
│  1. When customer enters pincode in checkout                                │
│  2. Before showing shipping options                                         │
│  3. Before allowing order placement                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementing Pincode Check

```
FRONTEND: Checkout Address Form
─────────────────────────────────

┌────────────────────────────────────────────────────────────────────┐
│  Delivery Address                                                   │
│                                                                     │
│  Pincode: [201301]  ✅ Delivery available                          │
│                     4 courier options                               │
│                     COD available                                   │
│                                                                     │
│  City: [Noida]      (auto-filled from pincode)                     │
│  State: [UP]        (auto-filled from pincode)                     │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

OR

┌────────────────────────────────────────────────────────────────────┐
│  Delivery Address                                                   │
│                                                                     │
│  Pincode: [845401]  ⚠️ Limited delivery options                    │
│                     Only prepaid (No COD)                           │
│                     Delivery: 7-10 days                             │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

OR

┌────────────────────────────────────────────────────────────────────┐
│  Delivery Address                                                   │
│                                                                     │
│  Pincode: [999999]  ❌ Sorry, delivery not available               │
│                     to this pincode                                 │
│                     [Contact Support]                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘


API IMPLEMENTATION:
───────────────────

async function checkPincodeServiceability(
  storeId: string,
  customerPincode: string
): Promise<ServiceabilityResult> {
  
  // Same API as rate calculation, but just check if any couriers exist
  const rates = await calculateShippingCost(
    storeId,
    customerPincode,
    0.5, // default weight for check
    true // check COD availability
  );
  
  const prepaidRates = await calculateShippingCost(
    storeId,
    customerPincode,
    0.5,
    false // prepaid
  );
  
  return {
    isServiceable: prepaidRates.length > 0,
    codAvailable: rates.length > 0,
    courierCount: prepaidRates.length,
    estimatedDays: prepaidRates[0]?.days || null,
    cheapestRate: prepaidRates[0]?.cost || null
  };
}
```

### Pincode to City/State Lookup

```
BONUS: AUTO-FILL CITY/STATE FROM PINCODE
─────────────────────────────────────────

India Post provides free pincode database
OR use third-party API

Example API (Free): postalpincode.in

GET https://api.postalpincode.in/pincode/201301

Response:
{
  "Status": "Success",
  "PostOffice": [
    {
      "Name": "Sector 15 Noida",
      "District": "Gautam Buddha Nagar",
      "State": "Uttar Pradesh",
      "Pincode": "201301"
    }
  ]
}

Implementation:

async function getCityFromPincode(pincode: string) {
  const response = await fetch(
    `https://api.postalpincode.in/pincode/${pincode}`
  );
  const data = await response.json();
  
  if (data[0].Status === 'Success') {
    return {
      city: data[0].PostOffice[0].District,
      state: data[0].PostOffice[0].State
    };
  }
  return null;
}
```

---

## Creating Shipments

### Order Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              CREATING SHIPMENT IN SHIPROCKET                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHEN THIS HAPPENS:                                                         │
│  ──────────────────                                                         │
│  1. Seller clicks "Create Shipment" in ShopPulse order page                │
│  2. OR automatically when order status changes to PROCESSING               │
│                                                                              │
│  FLOW:                                                                       │
│  ─────                                                                       │
│                                                                              │
│  ShopPulse Order                    Shiprocket                              │
│       │                                  │                                   │
│       │   1. POST /orders/create/adhoc   │                                   │
│       ├─────────────────────────────────►│                                   │
│       │                                  │                                   │
│       │   2. Order Created               │                                   │
│       │      shiprocket_order_id         │                                   │
│       │◄─────────────────────────────────┤                                   │
│       │                                  │                                   │
│       │   3. POST /courier/assign/awb    │                                   │
│       ├─────────────────────────────────►│                                   │
│       │                                  │                                   │
│       │   4. AWB Assigned                │                                   │
│       │      awb_code, label_url         │                                   │
│       │◄─────────────────────────────────┤                                   │
│       │                                  │                                   │
│       │   (Pickup auto-scheduled)        │                                   │
│       │                                  │                                   │
│                                                                              │
│  TWO-STEP vs ONE-STEP:                                                      │
│  ─────────────────────                                                      │
│  Option A: Create order first, then assign AWB (more control)              │
│  Option B: Use combined endpoint (simpler)                                  │
│                                                                              │
│  We'll use Option A for more control                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Create Order API

```
ENDPOINT: POST /orders/create/adhoc
───────────────────────────────────

Request Body:
{
  "order_id": "SHOPPULSE-ORD-12345",
  "order_date": "2026-01-01 10:30:00",
  "pickup_location": "Primary Warehouse",
  "channel_id": "",
  "comment": "Handle with care",
  
  "billing_customer_name": "Rahul Sharma",
  "billing_last_name": "",
  "billing_address": "123, ABC Apartments",
  "billing_address_2": "Near XYZ Mall",
  "billing_city": "Noida",
  "billing_pincode": "201301",
  "billing_state": "Uttar Pradesh",
  "billing_country": "India",
  "billing_email": "rahul@email.com",
  "billing_phone": "9876543210",
  
  "shipping_is_billing": true,
  // OR provide separate shipping address
  
  "order_items": [
    {
      "name": "Blue T-Shirt Size M",
      "sku": "TSHIRT-BLU-M",
      "units": 1,
      "selling_price": "599",
      "discount": "0",
      "tax": "0",
      "hsn": ""
    },
    {
      "name": "Black Jeans Size 32",
      "sku": "JEANS-BLK-32",
      "units": 1,
      "selling_price": "899",
      "discount": "0",
      "tax": "0",
      "hsn": ""
    }
  ],
  
  "payment_method": "Prepaid",  // or "COD"
  "shipping_charges": 0,
  "giftwrap_charges": 0,
  "transaction_charges": 0,
  "total_discount": 0,
  "sub_total": 1498,
  
  "length": 25,   // cm
  "breadth": 20,  // cm
  "height": 5,    // cm
  "weight": 0.5   // kg
}


Response:
{
  "order_id": 123456789,        // Shiprocket's order ID
  "shipment_id": 987654321,     // Shiprocket's shipment ID
  "status": "NEW",
  "status_code": 1,
  "onboarding_completed_now": 0,
  "awb_code": "",               // Empty until AWB assigned
  "courier_company_id": "",
  "courier_name": ""
}
```

### Mapping ShopPulse Order to Shiprocket

```typescript
interface ShopPulseOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: Array<{
    product: {
      name: string;
      sku: string;
    };
    quantity: number;
    price: number;
  }>;
  totals: {
    subtotal: number;
    shipping: number;
    total: number;
  };
  paymentMethod: 'PREPAID' | 'COD';
  packageDetails?: {
    length: number;
    breadth: number;
    height: number;
    weight: number;
  };
}

function mapToShiprocketOrder(order: ShopPulseOrder): ShiprocketOrderPayload {
  return {
    order_id: order.orderNumber,
    order_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    pickup_location: "Primary", // From integration config
    
    billing_customer_name: order.customer.name.split(' ')[0],
    billing_last_name: order.customer.name.split(' ').slice(1).join(' '),
    billing_address: order.shippingAddress.line1,
    billing_address_2: order.shippingAddress.line2 || '',
    billing_city: order.shippingAddress.city,
    billing_state: order.shippingAddress.state,
    billing_pincode: order.shippingAddress.pincode,
    billing_country: 'India',
    billing_email: order.customer.email,
    billing_phone: order.customer.phone,
    
    shipping_is_billing: true,
    
    order_items: order.items.map(item => ({
      name: item.product.name,
      sku: item.product.sku || 'SKU-' + item.product.name.slice(0, 5),
      units: item.quantity,
      selling_price: String(item.price),
      discount: '0',
      tax: '0',
      hsn: ''
    })),
    
    payment_method: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
    sub_total: order.totals.subtotal,
    shipping_charges: order.totals.shipping,
    
    length: order.packageDetails?.length || 25,
    breadth: order.packageDetails?.breadth || 20,
    height: order.packageDetails?.height || 5,
    weight: order.packageDetails?.weight || 0.5
  };
}
```

---

## AWB Generation

### Assigning Courier & AWB

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              AWB GENERATION                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  WHAT IS AWB?                                                               │
│  ────────────                                                               │
│  Air Way Bill - unique tracking number for the shipment                     │
│  Generated when courier is assigned                                         │
│  Used for tracking, label printing, manifests                               │
│                                                                              │
│  ENDPOINT: POST /courier/assign/awb                                         │
│  ──────────────────────────────────                                         │
│                                                                              │
│  Request:                                                                    │
│  {                                                                           │
│    "shipment_id": 987654321,       // From order creation                   │
│    "courier_id": 26                 // Courier company ID (from rate API)   │
│  }                                                                           │
│                                                                              │
│  Response (Success):                                                        │
│  {                                                                           │
│    "awb_assign_status": 1,                                                  │
│    "response": {                                                            │
│      "data": {                                                              │
│        "awb_code": "1234567890123",                                         │
│        "courier_company_id": 26,                                            │
│        "courier_name": "Delhivery",                                         │
│        "assigned_date_time": {                                              │
│          "date": "2026-01-01 11:00:00"                                      │
│        }                                                                     │
│      }                                                                       │
│    }                                                                         │
│  }                                                                           │
│                                                                              │
│  COURIER SELECTION:                                                         │
│  ──────────────────                                                         │
│  Option A: Auto (Shiprocket recommends)                                     │
│     Don't send courier_id - Shiprocket picks best                           │
│                                                                              │
│  Option B: Seller Chooses                                                   │
│     Show courier options, let seller pick                                   │
│     Send their choice as courier_id                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Complete Shipment Creation Function

```typescript
async function createShipment(
  storeId: string,
  orderId: string,
  courierChoice?: number // Optional: seller's courier preference
): Promise<ShipmentResult> {
  
  // 1. Get order from ShopPulse database
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: { product: true }
      }
    }
  });
  
  if (!order) throw new Error('Order not found');
  
  // 2. Get Shiprocket token
  const token = await getShiprocketToken(storeId);
  
  // 3. Map to Shiprocket format
  const shiprocketPayload = mapToShiprocketOrder(order);
  
  // 4. Create order in Shiprocket
  const orderResponse = await fetch(
    'https://apiv2.shiprocket.in/v1/external/orders/create/adhoc',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(shiprocketPayload)
    }
  );
  
  const orderResult = await orderResponse.json();
  
  if (orderResult.status_code !== 1) {
    throw new Error(`Shiprocket order creation failed: ${orderResult.message}`);
  }
  
  // 5. Assign AWB
  const awbPayload = {
    shipment_id: orderResult.shipment_id,
    ...(courierChoice && { courier_id: courierChoice })
  };
  
  const awbResponse = await fetch(
    'https://apiv2.shiprocket.in/v1/external/courier/assign/awb',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(awbPayload)
    }
  );
  
  const awbResult = await awbResponse.json();
  
  if (awbResult.awb_assign_status !== 1) {
    throw new Error('AWB assignment failed');
  }
  
  // 6. Update ShopPulse order with shipment details
  await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: 'SHIPPED',
      shiprocketOrderId: String(orderResult.order_id),
      shiprocketShipmentId: String(orderResult.shipment_id),
      awbCode: awbResult.response.data.awb_code,
      courierName: awbResult.response.data.courier_name,
      shippedAt: new Date()
    }
  });
  
  // 7. Generate label URL
  const labelUrl = await getShippingLabel(
    token, 
    orderResult.shipment_id
  );
  
  return {
    success: true,
    awbCode: awbResult.response.data.awb_code,
    courierName: awbResult.response.data.courier_name,
    labelUrl: labelUrl,
    trackingUrl: `https://shiprocket.co/tracking/${awbResult.response.data.awb_code}`
  };
}
```

---

## Label Generation

### Getting Shipping Label

```
ENDPOINT: POST /courier/generate/label
──────────────────────────────────────

Request:
{
  "shipment_id": [987654321]  // Array, can batch multiple
}

Response:
{
  "label_created": 1,
  "label_url": "https://kr-label.s3.amazonaws.com/123456.pdf",
  "response": "Label generated Successfully"
}


ALTERNATIVE: GET /orders/print/invoice
────────────────────────────────────────
Gets combined invoice + label

Request:
{
  "ids": [987654321]  // shipment IDs
}
```

### Label Handling in ShopPulse

```typescript
async function getShippingLabel(
  token: string,
  shipmentId: number
): Promise<string> {
  
  const response = await fetch(
    'https://apiv2.shiprocket.in/v1/external/courier/generate/label',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        shipment_id: [shipmentId]
      })
    }
  );
  
  const result = await response.json();
  
  if (result.label_created === 1) {
    return result.label_url;
  }
  
  throw new Error('Label generation failed');
}


// In API route for downloading label
// GET /api/[storeId]/orders/[orderId]/label

export async function GET(req: Request, { params }) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId }
  });
  
  if (!order.shiprocketShipmentId) {
    return NextResponse.json({ error: 'No shipment created' }, { status: 400 });
  }
  
  const token = await getShiprocketToken(params.storeId);
  const labelUrl = await getShippingLabel(token, Number(order.shiprocketShipmentId));
  
  // Option 1: Return URL for client to open
  return NextResponse.json({ labelUrl });
  
  // Option 2: Proxy the PDF
  // const labelPdf = await fetch(labelUrl);
  // return new Response(labelPdf.body, {
  //   headers: { 'Content-Type': 'application/pdf' }
  // });
}
```

---

## Error Handling

### Common Errors and Solutions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET API ERROR HANDLING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ERROR: 401 Unauthorized                                                    │
│  ─────────────────────────                                                  │
│  Cause: Token expired or invalid                                            │
│  Solution: Refresh token using login API                                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ERROR: "Pickup pincode not serviceable"                                    │
│  ───────────────────────────────────────                                    │
│  Cause: Seller's pickup pincode has issues                                  │
│  Solution: Verify pickup address in Shiprocket dashboard                    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ERROR: "Order already exists with this order_id"                           │
│  ─────────────────────────────────────────────────                          │
│  Cause: Duplicate order creation attempt                                    │
│  Solution: Use unique order IDs, check if already created                   │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ERROR: "Weight mismatch"                                                   │
│  ─────────────────────────                                                   │
│  Cause: Declared weight vs actual weight                                    │
│  Solution: Accurate weighing, or dispute resolution                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ERROR: "Courier not available for this route"                              │
│  ─────────────────────────────────────────────                              │
│  Cause: Selected courier doesn't serve that pincode                        │
│  Solution: Let Shiprocket auto-select, or pick different courier           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ERROR: "Insufficient wallet balance"                                       │
│  ───────────────────────────────────                                        │
│  Cause: Seller's Shiprocket wallet empty                                    │
│  Solution: Seller needs to recharge in Shiprocket dashboard                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Robust Error Handling Code

```typescript
class ShiprocketError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public shiprocketCode?: string
  ) {
    super(message);
    this.name = 'ShiprocketError';
  }
}

async function shiprocketRequest<T>(
  storeId: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object
): Promise<T> {
  
  let token = await getShiprocketToken(storeId);
  
  const makeRequest = async (authToken: string) => {
    const url = `https://apiv2.shiprocket.in/v1/external${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    return fetch(url, options);
  };
  
  let response = await makeRequest(token);
  
  // Handle token expiry
  if (response.status === 401) {
    // Refresh token
    const integration = await getShippingIntegration(storeId);
    token = await refreshShiprocketToken(
      integration.credentials.email,
      integration.credentials.password
    );
    await updateIntegrationToken(storeId, token);
    
    // Retry request
    response = await makeRequest(token);
  }
  
  const data = await response.json();
  
  if (!response.ok || data.status === 0) {
    throw new ShiprocketError(
      data.message || 'Shiprocket API error',
      response.status,
      data.status_code
    );
  }
  
  return data as T;
}
```

---

## Best Practices

### Integration Best Practices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              SHIPROCKET INTEGRATION BEST PRACTICES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. TOKEN MANAGEMENT                                                        │
│  ───────────────────                                                        │
│  ✅ Store tokens securely (encrypted)                                       │
│  ✅ Refresh before expiry (not after failure)                               │
│  ✅ Implement retry with fresh token                                        │
│  ❌ Don't store tokens in client-side code                                  │
│                                                                              │
│  2. ORDER ID UNIQUENESS                                                     │
│  ──────────────────────                                                     │
│  ✅ Use meaningful, unique order IDs (e.g., STORE123-ORD-456)              │
│  ✅ Include store identifier for multi-store                               │
│  ❌ Don't use just database IDs (risk of conflicts)                        │
│                                                                              │
│  3. RATE CACHING                                                            │
│  ───────────────                                                            │
│  ✅ Cache rates for 15-30 minutes                                          │
│  ✅ Invalidate cache on weight/pincode change                              │
│  ❌ Don't cache indefinitely (rates change)                                │
│                                                                              │
│  4. ERROR HANDLING                                                          │
│  ─────────────────                                                          │
│  ✅ Log all API calls and responses                                        │
│  ✅ Show user-friendly error messages                                      │
│  ✅ Implement fallback for failures                                        │
│  ✅ Alert on repeated failures                                              │
│                                                                              │
│  5. WEBHOOK SECURITY (covered in Part 4B)                                   │
│  ────────────────────────────────────────                                   │
│  ✅ Verify webhook signatures                                               │
│  ✅ Use HTTPS endpoints only                                                │
│  ✅ Idempotent webhook handlers                                             │
│                                                                              │
│  6. WEIGHT ACCURACY                                                         │
│  ─────────────────                                                          │
│  ✅ Encourage accurate weight entry                                         │
│  ✅ Show volumetric weight warning                                          │
│  ✅ Handle weight dispute workflow                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Performance Considerations

```
OPTIMIZE API CALLS:
───────────────────

1. BATCH OPERATIONS
   When creating multiple shipments, process in batches
   Label generation supports array of shipment_ids
   
2. PARALLEL CALLS
   Independent calls can be parallelized:
   - Get rates AND check pickup locations
   - Create order AND fetch tracking
   
3. CACHING
   Cache these (with TTL):
   - Pickup locations (1 hour)
   - Pincode serviceability (15 minutes)
   - Shipping rates (15 minutes)
   
4. LAZY LOADING
   Don't fetch all couriers upfront
   Load on-demand when seller opens shipping modal
```

---

## Summary

### API Endpoint Quick Reference

```
AUTHENTICATION:
POST /auth/login                           → Get token

ORDERS:
POST /orders/create/adhoc                  → Create order
GET /orders/show/{id}                      → Get order
POST /orders/cancel/shipment/awbs          → Cancel shipments (body: {awbs: [...]})

SHIPMENTS:
POST /shipments/create/forward-shipment    → Wrapper: Create order + AWB + pickup + label + manifest
POST /courier/assign/awb                   → Assign AWB
POST /courier/generate/label               → Get label
POST /courier/generate/pickup              → Schedule pickup
GET /courier/track/awb/{awb}               → Track
POST /manifests/generate                   → Generate manifest

UTILITIES:
GET /courier/serviceability                → Check rates
GET /settings/company/pickup               → Pickup locations
```

### Data Flow Summary

```
ShopPulse Order → Shiprocket Order → AWB → Label → Pickup → Tracking
      ↑              ↑                ↑       ↑        ↑         ↑
  Our DB        API create        API assign  API gen  Auto    Webhooks
                                                     scheduled
```

---

## Next Document

**Part 4B** covers:
- Webhook setup and configuration
- Tracking status updates
- NDR (Non-Delivery Report) handling
- Event-driven status management

---

## References

- [Shiprocket API Documentation](https://apidocs.shiprocket.in/)
- [Shiprocket Postman Collection](https://www.postman.com/shiprocket)
- [Status Codes Reference](https://apidocs.shiprocket.in/#status-codes)
