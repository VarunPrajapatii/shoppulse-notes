# 📊 UsageRecord Table - Complete Explanation

## Purpose

The `UsageRecord` table tracks **how much** of each resource/feature a user is consuming over specific time periods. This enables:

1. **Usage Analytics** - Understand user behavior and patterns
2. **Plan Limits Enforcement** - Check if user exceeded their plan limits
3. **Billing Insights** - Data for usage-based billing (if added later)
4. **Trend Analysis** - See growth over time (daily, monthly, yearly)
5. **Quota Management** - Warn users when approaching limits

---

## Table Schema

```prisma
model UsageRecord {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // What metric?
  metricType      UsageMetricType
  
  // How much?
  count           Int             @default(0)
  
  // Time period
  periodStart     DateTime
  periodEnd       DateTime
  
  // Metadata
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([userId, metricType, periodStart, periodEnd])
  @@index([userId])
  @@index([metricType])
}

enum UsageMetricType {
  PRODUCTS        // Total products created
  ORDERS          // Total orders received
  STORAGE_GB      // Storage used in GB
  CATEGORIES      // Total categories
  BILLBOARDS      // Total billboards
  API_CALLS       // API calls (important for frontend usage tracking)
}
```

---

## Key Concepts

### 1. **metricType** - What are you tracking?

Each `UsageMetricType` represents a different resource:

```typescript
PRODUCTS      → Number of products created
ORDERS        → Number of orders received
STORAGE_GB    → Storage space used (in GB)
CATEGORIES    → Number of categories created
BILLBOARDS    → Number of billboards created
API_CALLS     → Number of API calls made by store's frontend
```

### 2. **count** - How many/how much?

The actual usage value. This can represent:
- Count of items (products, orders, etc.)
- Size in GB (for storage)
- Number of calls (for API)

### 3. **periodStart & periodEnd** - Time Window

Defines the time range this record covers. Examples:
- **Daily:** Jan 1, 2025 00:00 → Jan 1, 2025 23:59
- **Monthly:** Jan 1, 2025 00:00 → Jan 31, 2025 23:59
- **Yearly:** Jan 1, 2025 00:00 → Dec 31, 2025 23:59

### 4. **Unique Constraint** - No Duplicates

```prisma
@@unique([userId, metricType, periodStart, periodEnd])
```

**Meaning:** You can't have two records for the same user, same metric, same period.

**Example of what's allowed:**
```
✅ User A, PRODUCTS, Jan 1 → Jan 1 (daily)
✅ User A, PRODUCTS, Jan 1 → Jan 31 (monthly)
✅ User A, ORDERS, Jan 1 → Jan 1 (daily, different metric)
✅ User B, PRODUCTS, Jan 1 → Jan 1 (daily, different user)
```

**Example of what's NOT allowed:**
```
❌ User A, PRODUCTS, Jan 1 → Jan 1
❌ User A, PRODUCTS, Jan 1 → Jan 1 (duplicate - constraint violation)
```

---

## Use Cases & Examples

### Use Case 1: Daily Product Creation Tracking

**Scenario:** Track how many products user creates each day

**Sample Data:**

| id | userId | metricType | count | periodStart | periodEnd |
|----|--------|------------|-------|-------------|-----------|
| 1 | user_123 | PRODUCTS | 5 | 2025-01-01 00:00 | 2025-01-01 23:59 |
| 2 | user_123 | PRODUCTS | 8 | 2025-01-02 00:00 | 2025-01-02 23:59 |
| 3 | user_123 | PRODUCTS | 3 | 2025-01-03 00:00 | 2025-01-03 23:59 |

**Query:**
```typescript
// Get user's product creation for specific day
const usage = await prisma.usageRecord.findUnique({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId: 'user_123',
      metricType: 'PRODUCTS',
      periodStart: new Date('2025-01-01T00:00:00Z'),
      periodEnd: new Date('2025-01-01T23:59:59Z')
    }
  }
});

console.log(`Products created on Jan 1: ${usage?.count || 0}`);
```

---

### Use Case 2: Monthly Order Tracking

**Scenario:** Track total orders received per month

**Sample Data:**

| id | userId | metricType | count | periodStart | periodEnd |
|----|--------|------------|-------|-------------|-----------|
| 10 | user_123 | ORDERS | 120 | 2025-01-01 00:00 | 2025-01-31 23:59 |
| 11 | user_123 | ORDERS | 150 | 2025-02-01 00:00 | 2025-02-28 23:59 |
| 12 | user_123 | ORDERS | 200 | 2025-03-01 00:00 | 2025-03-31 23:59 |

**Query:**
```typescript
// Get user's orders for January 2025
const usage = await prisma.usageRecord.findUnique({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId: 'user_123',
      metricType: 'ORDERS',
      periodStart: new Date('2025-01-01T00:00:00Z'),
      periodEnd: new Date('2025-01-31T23:59:59Z')
    }
  }
});

console.log(`Orders in January: ${usage?.count || 0}`);
```

---

### Use Case 3: API Call Tracking (Real-time)

**Scenario:** Track API calls made by user's store frontend

**Sample Data:**

| id | userId | metricType | count | periodStart | periodEnd |
|----|--------|------------|-------|-------------|-----------|
| 20 | user_123 | API_CALLS | 1523 | 2025-01-01 00:00 | 2025-01-01 23:59 |
| 21 | user_123 | API_CALLS | 2100 | 2025-01-02 00:00 | 2025-01-02 23:59 |

**How it works:**
1. User's frontend makes API call
2. Your API increments the counter
3. You can warn if approaching limit

**Implementation:**
```typescript
// When API call is made
async function trackApiCall(userId: string) {
  const today = new Date();
  const periodStart = new Date(today.setHours(0, 0, 0, 0));
  const periodEnd = new Date(today.setHours(23, 59, 59, 999));

  // Upsert: Update if exists, create if not
  await prisma.usageRecord.upsert({
    where: {
      userId_metricType_periodStart_periodEnd: {
        userId,
        metricType: 'API_CALLS',
        periodStart,
        periodEnd
      }
    },
    update: {
      count: { increment: 1 }  // Add 1 to existing count
    },
    create: {
      userId,
      metricType: 'API_CALLS',
      count: 1,
      periodStart,
      periodEnd
    }
  });
}
```

---

### Use Case 4: Storage Usage Tracking

**Scenario:** Track total storage used (images, files)

**Sample Data:**

| id | userId | metricType | count | periodStart | periodEnd |
|----|--------|------------|-------|-------------|-----------|
| 30 | user_123 | STORAGE_GB | 2 | 2025-01-01 00:00 | 2025-01-31 23:59 |
| 31 | user_123 | STORAGE_GB | 3 | 2025-02-01 00:00 | 2025-02-28 23:59 |
| 32 | user_123 | STORAGE_GB | 4 | 2025-03-01 00:00 | 2025-03-31 23:59 |

**Note:** For storage, you might calculate total size monthly:

```typescript
// Calculate storage used
async function calculateStorageUsage(userId: string) {
  // Get all images for user's products
  const images = await prisma.image.findMany({
    where: {
      product: {
        store: { userId }
      }
    }
  });

  // Assume each image has a size field (in bytes)
  const totalBytes = images.reduce((sum, img) => sum + img.size, 0);
  const totalGB = totalBytes / (1024 * 1024 * 1024); // Convert to GB

  // Store for current month
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  await prisma.usageRecord.upsert({
    where: {
      userId_metricType_periodStart_periodEnd: {
        userId,
        metricType: 'STORAGE_GB',
        periodStart,
        periodEnd
      }
    },
    update: { count: Math.ceil(totalGB) },
    create: {
      userId,
      metricType: 'STORAGE_GB',
      count: Math.ceil(totalGB),
      periodStart,
      periodEnd
    }
  });
}
```

---

### Use Case 5: Plan Limit Enforcement

**Scenario:** Check if user has exceeded their plan's product limit

**Sample Data:**

```typescript
// User's plan (from SubscriptionPlan)
const plan = {
  maxProducts: 100,  // Limit: 100 products
  maxOrders: 1000    // Limit: 1000 orders/month
};

// User's current usage
const productUsage = await prisma.usageRecord.findUnique({
  where: {
    userId_metricType_periodStart_periodEnd: {
      userId: 'user_123',
      metricType: 'PRODUCTS',
      periodStart: startOfMonth,
      periodEnd: endOfMonth
    }
  }
});

// Check limit
if (productUsage && productUsage.count >= plan.maxProducts) {
  throw new Error('Product limit reached. Upgrade your plan to add more.');
}
```

**Flow in your app:**
```typescript
// When user tries to create a product
async function createProduct(userId: string, productData: any) {
  // 1. Get user's subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { include: { plan: true } } }
  });

  // 2. Check current product count
  const currentMonth = getCurrentMonthPeriod();
  const usage = await prisma.usageRecord.findUnique({
    where: {
      userId_metricType_periodStart_periodEnd: {
        userId,
        metricType: 'PRODUCTS',
        ...currentMonth
      }
    }
  });

  const currentCount = usage?.count || 0;
  const limit = user.subscription.plan.maxProducts;

  // 3. Enforce limit (if plan has limit)
  if (limit !== null && currentCount >= limit) {
    throw new Error(`Product limit reached (${limit}). Upgrade to add more.`);
  }

  // 4. Create product
  const product = await prisma.product.create({ data: productData });

  // 5. Increment usage counter
  await prisma.usageRecord.upsert({
    where: {
      userId_metricType_periodStart_periodEnd: {
        userId,
        metricType: 'PRODUCTS',
        ...currentMonth
      }
    },
    update: { count: { increment: 1 } },
    create: {
      userId,
      metricType: 'PRODUCTS',
      count: 1,
      ...currentMonth
    }
  });

  return product;
}
```

---

### Use Case 6: Multi-Period Tracking

**Scenario:** Track both daily AND monthly usage for the same metric

**Sample Data:**

| id | userId | metricType | count | periodStart | periodEnd | Description |
|----|--------|------------|-------|-------------|-----------|-------------|
| 40 | user_123 | PRODUCTS | 5 | 2025-01-01 00:00 | 2025-01-01 23:59 | Daily |
| 41 | user_123 | PRODUCTS | 8 | 2025-01-02 00:00 | 2025-01-02 23:59 | Daily |
| 42 | user_123 | PRODUCTS | 3 | 2025-01-03 00:00 | 2025-01-03 23:59 | Daily |
| 43 | user_123 | PRODUCTS | 95 | 2025-01-01 00:00 | 2025-01-31 23:59 | Monthly (sum of all days) |

**Why track both?**
- **Daily:** See daily patterns, detect spikes/drops
- **Monthly:** Enforce plan limits, billing calculations

**No Conflict:** The unique constraint includes `periodEnd`, so these don't conflict!

---

## Common Queries

### 1. Get User's Total Products (All Time)

```typescript
const allProductUsage = await prisma.usageRecord.findMany({
  where: {
    userId: 'user_123',
    metricType: 'PRODUCTS'
  }
});

const total = allProductUsage.reduce((sum, record) => sum + record.count, 0);
console.log(`Total products created: ${total}`);
```

### 2. Get Current Month Usage

```typescript
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

const monthlyUsage = await prisma.usageRecord.findMany({
  where: {
    userId: 'user_123',
    periodStart: { gte: startOfMonth },
    periodEnd: { lte: endOfMonth }
  }
});
```

### 3. Get Usage Trends (Last 6 Months)

```typescript
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const trends = await prisma.usageRecord.findMany({
  where: {
    userId: 'user_123',
    metricType: 'ORDERS',
    periodStart: { gte: sixMonthsAgo }
  },
  orderBy: { periodStart: 'asc' }
});

// Output: [
//   { count: 100, periodStart: 'Aug 2024' },
//   { count: 120, periodStart: 'Sep 2024' },
//   { count: 150, periodStart: 'Oct 2024' },
//   ...
// ]
```

### 4. Compare Multiple Users

```typescript
const topUsers = await prisma.usageRecord.groupBy({
  by: ['userId'],
  where: {
    metricType: 'API_CALLS',
    periodStart: { gte: startOfMonth }
  },
  _sum: { count: true },
  orderBy: { _sum: { count: 'desc' } },
  take: 10
});

// Output: Top 10 users by API calls this month
```

---

## Cron Job: Update Usage Records

**When to run:** Daily at midnight (or hourly for real-time metrics)

```typescript
// Cron job: Update daily usage records
async function updateDailyUsageRecords() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const periodStart = yesterday;
  const periodEnd = new Date(yesterday);
  periodEnd.setHours(23, 59, 59, 999);

  // Get all users
  const users = await prisma.user.findMany();

  for (const user of users) {
    // Count products created yesterday
    const productCount = await prisma.product.count({
      where: {
        store: { userId: user.id },
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    // Store record
    await prisma.usageRecord.upsert({
      where: {
        userId_metricType_periodStart_periodEnd: {
          userId: user.id,
          metricType: 'PRODUCTS',
          periodStart,
          periodEnd
        }
      },
      update: { count: productCount },
      create: {
        userId: user.id,
        metricType: 'PRODUCTS',
        count: productCount,
        periodStart,
        periodEnd
      }
    });

    // Repeat for ORDERS, CATEGORIES, etc.
  }
}
```

---

## Dashboard Analytics Examples

### Example 1: Usage Dashboard for User

```typescript
async function getUserUsageDashboard(userId: string) {
  const now = new Date();
  const currentMonth = {
    periodStart: new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  };

  const usage = await prisma.usageRecord.findMany({
    where: {
      userId,
      periodStart: currentMonth.periodStart,
      periodEnd: currentMonth.periodEnd
    }
  });

  // Get user's plan limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: { include: { plan: true } } }
  });

  const plan = user.subscription.plan;

  // Build dashboard data
  const dashboard = {
    products: {
      current: usage.find(u => u.metricType === 'PRODUCTS')?.count || 0,
      limit: plan.maxProducts,
      percentage: plan.maxProducts 
        ? (usage.find(u => u.metricType === 'PRODUCTS')?.count || 0) / plan.maxProducts * 100 
        : 0
    },
    orders: {
      current: usage.find(u => u.metricType === 'ORDERS')?.count || 0,
      limit: plan.maxOrders,
      percentage: plan.maxOrders 
        ? (usage.find(u => u.metricType === 'ORDERS')?.count || 0) / plan.maxOrders * 100 
        : 0
    },
    storage: {
      current: usage.find(u => u.metricType === 'STORAGE_GB')?.count || 0,
      limit: plan.maxStorageGB,
      percentage: plan.maxStorageGB 
        ? (usage.find(u => u.metricType === 'STORAGE_GB')?.count || 0) / plan.maxStorageGB * 100 
        : 0
    }
  };

  return dashboard;
}

// Output:
// {
//   products: { current: 45, limit: 100, percentage: 45 },
//   orders: { current: 320, limit: 1000, percentage: 32 },
//   storage: { current: 2, limit: 5, percentage: 40 }
// }
```

### Example 2: Show Warning When Approaching Limit

```tsx
// In your React component
function UsageWarning({ usage, limit, type }) {
  const percentage = (usage / limit) * 100;

  if (percentage >= 90) {
    return (
      <Alert variant="error">
        🚨 You've used {usage} of {limit} {type}. Upgrade to add more!
      </Alert>
    );
  }

  if (percentage >= 70) {
    return (
      <Alert variant="warning">
        ⚠️ You've used {usage} of {limit} {type}. Consider upgrading soon.
      </Alert>
    );
  }

  return null;
}
```

---

## Advanced: Reset Usage on Plan Change

**Scenario:** When user upgrades from Monthly to Yearly, reset usage counters

```typescript
async function upgradeUserPlan(userId: string, newPlanId: string) {
  // 1. Update subscription
  await prisma.subscription.update({
    where: { userId },
    data: {
      planId: newPlanId,
      // ... other fields
    }
  });

  // 2. Reset current month usage (optional, depends on policy)
  const currentMonth = getCurrentMonthPeriod();
  
  await prisma.usageRecord.updateMany({
    where: {
      userId,
      periodStart: currentMonth.periodStart,
      periodEnd: currentMonth.periodEnd
    },
    data: {
      count: 0  // Reset to 0
    }
  });
}
```

---

## Best Practices

### 1. **Use Upsert for Real-time Updates**

```typescript
// ✅ Good: Upsert handles both create and update
await prisma.usageRecord.upsert({
  where: { userId_metricType_periodStart_periodEnd: { ... } },
  update: { count: { increment: 1 } },
  create: { userId, metricType, count: 1, ... }
});

// ❌ Bad: Separate find + create/update (race conditions)
const existing = await prisma.usageRecord.findUnique({ ... });
if (existing) {
  await prisma.usageRecord.update({ ... });
} else {
  await prisma.usageRecord.create({ ... });
}
```

### 2. **Archive Old Records**

```typescript
// Move records older than 1 year to archive table
// Or delete if not needed
await prisma.usageRecord.deleteMany({
  where: {
    periodEnd: {
      lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    }
  }
});
```

### 3. **Cache Frequently Accessed Data**

```typescript
// Use Redis to cache current month usage
const cacheKey = `usage:${userId}:${metricType}:${month}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const usage = await prisma.usageRecord.findUnique({ ... });
await redis.setex(cacheKey, 3600, JSON.stringify(usage)); // Cache 1 hour
return usage;
```

### 4. **Batch Updates in Cron Jobs**

```typescript
// ✅ Good: Batch process
const users = await prisma.user.findMany();
const updates = users.map(user => updateUsageForUser(user.id));
await Promise.all(updates);

// ❌ Bad: Sequential (slow)
for (const user of users) {
  await updateUsageForUser(user.id);
}
```

---

## When to Update UsageRecord?

| Trigger | Update Method | Frequency |
|---------|--------------|-----------|
| Product created | Real-time increment | Immediate |
| Order received | Real-time increment | Immediate |
| API call made | Real-time increment | Immediate |
| File uploaded | Real-time + calculate size | Immediate |
| End of day | Cron job (aggregate) | Daily |
| End of month | Cron job (aggregate) | Monthly |

---

## Summary

**UsageRecord is for:**
- ✅ Tracking resource consumption
- ✅ Enforcing plan limits
- ✅ Analytics and trends
- ✅ Usage-based billing (future)

**Key Points:**
1. Each record represents usage for a specific time period
2. Use `userId + metricType + periodStart + periodEnd` to identify records
3. Can track multiple periods simultaneously (daily + monthly)
4. Use `upsert` for real-time updates
5. Run cron jobs to aggregate data
6. Display usage to users with warnings when approaching limits

**Your implementation should:**
1. Increment counters in real-time (products, orders, API calls)
2. Run daily cron to calculate storage/aggregate metrics
3. Check limits before allowing actions (create product, etc.)
4. Show usage dashboard to users
5. Warn when approaching 70%, 90% of limits
