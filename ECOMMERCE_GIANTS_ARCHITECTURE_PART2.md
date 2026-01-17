# How Amazon, Flipkart & Myntra Handle Massive Scale

## Part 2: Deep Technical Implementation

---

## 🎯 Relevance & Ranking Algorithms

### How "Sort by Relevance" Actually Works

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    RELEVANCE SCORING PIPELINE                              │
│                                                                            │
│  User Query: "blue nike shoes"                                             │
│                                                                            │
│  Step 1: Query Understanding                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   Query Parser                                                       │  │
│  │   └─→ "blue" → color filter                                          │  │
│  │   └─→ "nike" → brand filter                                          │  │
│  │   └─→ "shoes" → category filter                                      │  │
│  │                                                                      │  │
│  │   Intent Detection                                                   │  │
│  │   └─→ Purchase intent: HIGH (specific brand + product)               │  │
│  │   └─→ Discovery intent: LOW                                          │  │
│  │                                                                      │  │
│  │   Spell Correction                                                   │  │
│  │   └─→ "bleu" → "blue"                                                │  │
│  │   └─→ "nikke" → "nike"                                               │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Step 2: Candidate Generation                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   Elasticsearch Query:                                               │  │
│  │   {                                                                  │  │
│  │     "bool": {                                                        │  │
│  │       "must": [                                                      │  │
│  │         { "match": { "title": "shoes" } },                          │  │
│  │         { "term": { "brand": "nike" } }                             │  │
│  │       ],                                                             │  │
│  │       "filter": [                                                    │  │
│  │         { "term": { "color": "blue" } },                            │  │
│  │         { "term": { "in_stock": true } }                            │  │
│  │       ]                                                              │  │
│  │     }                                                                │  │
│  │   }                                                                  │  │
│  │                                                                      │  │
│  │   Returns: ~5,000 matching products                                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Step 3: Relevance Scoring                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   Base Score (Text Match) - TF-IDF / BM25                           │  │
│  │   ┌────────────────────────────────────────────────────────────┐     │  │
│  │   │                                                            │     │  │
│  │   │   TF (Term Frequency):                                     │     │  │
│  │   │   How many times "nike" appears in product title?          │     │  │
│  │   │   "Nike Air Max Nike+" → TF = 2 → Higher score             │     │  │
│  │   │                                                            │     │  │
│  │   │   IDF (Inverse Document Frequency):                        │     │  │
│  │   │   How rare is "nike" across all products?                  │     │  │
│  │   │   "nike" appears in 0.1% of products → Rare → Higher score │     │  │
│  │   │   "shoes" appears in 5% of products → Common → Lower score │     │  │
│  │   │                                                            │     │  │
│  │   │   BM25 Score = TF × IDF (with normalization)               │     │  │
│  │   │                                                            │     │  │
│  │   └────────────────────────────────────────────────────────────┘     │  │
│  │                                                                      │  │
│  │   Boost Factors (Platform-Specific)                                  │  │
│  │   ┌────────────────────────────────────────────────────────────┐     │  │
│  │   │                                                            │     │  │
│  │   │   Popularity Boost:                                        │     │  │
│  │   │   score × (1 + log(sales_count) × 0.3)                     │     │  │
│  │   │                                                            │     │  │
│  │   │   Recency Boost (for new products):                        │     │  │
│  │   │   score × (1.5 if created_at < 7 days)                     │     │  │
│  │   │   score × (1.2 if created_at < 30 days)                    │     │  │
│  │   │                                                            │     │  │
│  │   │   Rating Boost:                                            │     │  │
│  │   │   score × (rating / 5)                                     │     │  │
│  │   │                                                            │     │  │
│  │   │   Conversion Boost:                                        │     │  │
│  │   │   score × (1 + conversion_rate × 2)                        │     │  │
│  │   │                                                            │     │  │
│  │   │   Seller Quality Boost:                                    │     │  │
│  │   │   score × seller_score                                     │     │  │
│  │   │                                                            │     │  │
│  │   └────────────────────────────────────────────────────────────┘     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Step 4: Re-ranking (ML Layer)                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   Machine Learning Model (LTR - Learning to Rank)                   │  │
│  │                                                                      │  │
│  │   Features:                                                          │  │
│  │   • Base relevance score                                             │  │
│  │   • User's past purchase history                                     │  │
│  │   • User's price sensitivity                                         │  │
│  │   • Product's return rate                                            │  │
│  │   • Inventory level                                                  │  │
│  │   • Profit margin (business consideration)                           │  │
│  │                                                                      │  │
│  │   Output: Final ranking score                                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Step 5: Diversification                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │   Problem: Top 20 results might all be same brand/style              │  │
│  │                                                                      │  │
│  │   Solution: Diversification algorithm                                │  │
│  │   • Max 3 products from same seller                                  │  │
│  │   • Mix price ranges                                                 │  │
│  │   • Include at least 2 different brands                              │  │
│  │   • Show one "sponsored" result (ad)                                 │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  Final Output: 20 products sorted by final_score                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Actual Relevance Formula (Simplified)

```typescript
// Amazon/Flipkart-style relevance scoring
function calculateRelevanceScore(product: Product, query: string): number {
  // 1. Text Match Score (BM25)
  const textScore = calculateBM25Score(product.title, query);
  
  // 2. Popularity Factor
  const popularityFactor = 1 + Math.log10(product.salesCount + 1) * 0.3;
  
  // 3. Recency Factor
  const daysSinceCreation = getDaysSince(product.createdAt);
  const recencyFactor = daysSinceCreation < 7 ? 1.5 :
                        daysSinceCreation < 30 ? 1.2 : 1.0;
  
  // 4. Rating Factor
  const ratingFactor = product.reviewCount > 10 
    ? (product.rating / 5) 
    : 0.5; // Penalize low review count
  
  // 5. Stock Factor
  const stockFactor = product.inStock ? 1 : 0.1;
  
  // 6. Click-Through Rate (CTR)
  const ctrFactor = 1 + (product.ctr || 0) * 2;
  
  // Final Score
  return textScore 
    * popularityFactor 
    * recencyFactor 
    * ratingFactor 
    * stockFactor 
    * ctrFactor;
}

// BM25 Algorithm (Simplified)
function calculateBM25Score(text: string, query: string): number {
  const k1 = 1.2; // Term frequency saturation
  const b = 0.75; // Length normalization
  const avgDocLength = 50; // Average title length
  
  const queryTerms = query.toLowerCase().split(' ');
  const docTerms = text.toLowerCase().split(' ');
  const docLength = docTerms.length;
  
  let score = 0;
  
  for (const term of queryTerms) {
    const termFreq = docTerms.filter(t => t === term).length;
    const idf = Math.log((totalDocs - docFreq[term] + 0.5) / (docFreq[term] + 0.5));
    
    score += idf * (termFreq * (k1 + 1)) / 
             (termFreq + k1 * (1 - b + b * docLength / avgDocLength));
  }
  
  return score;
}
```

---

## 🏪 Seller-Specific Filtering (Like Your storeId)

### How Flipkart Handles Seller Pages

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    SELLER PAGE ARCHITECTURE                                │
│                                                                            │
│  URL: flipkart.com/seller/nike-official-store                             │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Seller Data Isolation                             │  │
│  │                                                                      │  │
│  │   seller_id: "nike123" → Hash → Shard 42                            │  │
│  │                                                                      │  │
│  │   All queries include:                                               │  │
│  │   WHERE seller_id = 'nike123'                                        │  │
│  │                                                                      │  │
│  │   This means:                                                        │  │
│  │   • Query ONLY hits Shard 42                                        │  │
│  │   • Shard 42 has index on (seller_id, category_id, ...)             │  │
│  │   • Index narrows 10M products → 5,000 products                     │  │
│  │   • Response time: 5-20ms                                            │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Product Listing Strategy                          │  │
│  │                                                                      │  │
│  │   Option A: Return All (What Flipkart Does)                          │  │
│  │   └─→ For seller pages, return ALL products                         │  │
│  │   └─→ Frontend handles sort/filter                                  │  │
│  │   └─→ Why? Seller has max ~50,000 products                          │  │
│  │   └─→ 50K × 1KB = 50MB (paginated to 500 per request)               │  │
│  │                                                                      │  │
│  │   Option B: Backend Pagination                                       │  │
│  │   └─→ Only for category pages (million products)                    │  │
│  │   └─→ /electronics?page=5&sort=price                                │  │
│  │                                                                      │  │
│  │   Option C: Hybrid (What They Actually Do)                          │  │
│  │   └─→ Seller page < 500 products: Return all                        │  │
│  │   └─→ Seller page > 500 products: Paginate                          │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### This is EXACTLY Like ShopPulse!

```
ShopPulse Store Page = Flipkart Seller Page

Your storeId = Their seller_id

Query: GET /api/{storeId}/products?categoryId=xxx
Flipkart: GET /seller/{sellerId}/products?category=xxx

Both:
• Query is seller/store-specific
• Index on (storeId/sellerId, categoryId)
• Max products per store: 5,000 (realistic)
• Frontend pagination is fine
```

---

## 📱 Real-Time Inventory & Filtering

### The "Out of Stock" Problem

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    INVENTORY SYNC CHALLENGE                                │
│                                                                            │
│  Problem:                                                                  │
│  • Product shown in search results                                         │
│  • User clicks → "Out of Stock!"                                           │
│  • Bad UX, lost sale                                                       │
│                                                                            │
│  Why It Happens:                                                           │
│  • Search index (Elasticsearch) updated every 5 minutes                    │
│  • Real inventory changes per second                                       │
│  • Race condition between index and reality                                │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Solution: Hybrid Approach                         │  │
│  │                                                                      │  │
│  │   1. Search Index (Elasticsearch)                                    │  │
│  │      └─→ Returns product IDs + cached stock status                  │  │
│  │      └─→ "Probably in stock" (5 min delay acceptable)               │  │
│  │                                                                      │  │
│  │   2. Real-Time Stock Check (Redis/DB)                               │  │
│  │      └─→ Called when rendering product card                         │  │
│  │      └─→ Fast lookup: O(1) in Redis                                 │  │
│  │      └─→ Updates stock badge immediately                            │  │
│  │                                                                      │  │
│  │   3. Cart Addition (Database)                                        │  │
│  │      └─→ Final check before adding to cart                          │  │
│  │      └─→ "Sorry, this item just went out of stock"                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Amazon's Approach                                 │  │
│  │                                                                      │  │
│  │   // Redis: Real-time stock                                         │  │
│  │   HGET inventory:product_123 stock → 5                              │  │
│  │                                                                      │  │
│  │   // On purchase                                                     │  │
│  │   WATCH inventory:product_123                                        │  │
│  │   MULTI                                                              │  │
│  │     HINCRBY inventory:product_123 stock -1                          │  │
│  │   EXEC                                                               │  │
│  │                                                                      │  │
│  │   // On stock update                                                 │  │
│  │   PUBLISH stock_updates {product: 123, stock: 0}                    │  │
│  │                                                                      │  │
│  │   // Frontend subscribes                                             │  │
│  │   socket.on('stock_update', updateUI)                               │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Category Filtering at Scale

### Faceted Search (Filter Sidebar)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    FACETED SEARCH IMPLEMENTATION                           │
│                                                                            │
│  Search: "shoes" in Electronics category                                   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   Filter Sidebar            Main Content                            │   │
│  │   ┌─────────────────┐       ┌─────────────────────────────────────┐│   │
│  │   │                 │       │                                     ││   │
│  │   │  Brand          │       │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  ││   │
│  │   │  ☑ Nike (234)   │       │   │     │ │     │ │     │ │     │  ││   │
│  │   │  ☐ Adidas (189) │       │   │ P1  │ │ P2  │ │ P3  │ │ P4  │  ││   │
│  │   │  ☐ Puma (145)   │       │   │     │ │     │ │     │ │     │  ││   │
│  │   │                 │       │   └─────┘ └─────┘ └─────┘ └─────┘  ││   │
│  │   │  Price Range    │       │                                     ││   │
│  │   │  ☑ ₹1000-2000   │       │   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  ││   │
│  │   │  ☐ ₹2000-5000   │       │   │     │ │     │ │     │ │     │  ││   │
│  │   │  ☐ ₹5000+       │       │   │ P5  │ │ P6  │ │ P7  │ │ P8  │  ││   │
│  │   │                 │       │   │     │ │     │ │     │ │     │  ││   │
│  │   │  Size           │       │   └─────┘ └─────┘ └─────┘ └─────┘  ││   │
│  │   │  ☐ UK6 (45)     │       │                                     ││   │
│  │   │  ☐ UK7 (67)     │       │                                     ││   │
│  │   │  ☐ UK8 (89)     │       │                                     ││   │
│  │   │                 │       │                                     ││   │
│  │   └─────────────────┘       └─────────────────────────────────────┘│   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  Elasticsearch Aggregation Query:                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  {                                                                   │  │
│  │    "query": { "match": { "title": "shoes" } },                      │  │
│  │    "aggs": {                                                         │  │
│  │      "brands": {                                                     │  │
│  │        "terms": { "field": "brand", "size": 20 }                    │  │
│  │      },                                                              │  │
│  │      "price_ranges": {                                               │  │
│  │        "range": {                                                    │  │
│  │          "field": "price",                                          │  │
│  │          "ranges": [                                                 │  │
│  │            { "to": 1000 },                                          │  │
│  │            { "from": 1000, "to": 2000 },                            │  │
│  │            { "from": 2000 }                                         │  │
│  │          ]                                                           │  │
│  │        }                                                             │  │
│  │      },                                                              │  │
│  │      "sizes": {                                                      │  │
│  │        "terms": { "field": "sizes", "size": 20 }                    │  │
│  │      }                                                               │  │
│  │    }                                                                 │  │
│  │  }                                                                   │  │
│  │                                                                      │  │
│  │  Returns:                                                            │  │
│  │  • Products matching query                                           │  │
│  │  • Count per brand (for filter numbers)                              │  │
│  │  • Count per price range                                             │  │
│  │  • Count per size                                                    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Faceted Search for ShopPulse (If Needed Later)

```typescript
// If you need faceted search for a store with many products
// This can be done with PostgreSQL GROUP BY

async function getProductFilters(storeId: string, categoryId?: string) {
  const [sizeFilters, priceRanges] = await Promise.all([
    // Size distribution
    prismadb.$queryRaw`
      SELECT s.name, s.value, COUNT(*) as count
      FROM "Product" p
      JOIN "Size" s ON p."sizeId" = s.id
      WHERE p."storeId" = ${storeId}
        AND p."isArchived" = false
        ${categoryId ? Prisma.sql`AND p."categoryId" = ${categoryId}` : Prisma.empty}
      GROUP BY s.id, s.name, s.value
    `,
    
    // Price distribution
    prismadb.$queryRaw`
      SELECT 
        CASE 
          WHEN price < 1000 THEN 'under_1000'
          WHEN price BETWEEN 1000 AND 5000 THEN '1000_5000'
          ELSE 'over_5000'
        END as range,
        COUNT(*) as count
      FROM "Product"
      WHERE "storeId" = ${storeId}
        AND "isArchived" = false
        ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.empty}
      GROUP BY 1
    `
  ]);
  
  return { sizes: sizeFilters, priceRanges };
}
```

---

## 🎯 Key Takeaways for ShopPulse

### What You Can Learn from the Giants

| Concept | Amazon/Flipkart | ShopPulse Equivalent |
|---------|-----------------|---------------------|
| Seller isolation | `seller_id` partition | `storeId` index |
| Product search | Elasticsearch cluster | PostgreSQL + Redis |
| Real-time stock | Redis + pub/sub | Redis cache + DB |
| Relevance sort | ML ranking | Simple score formula |
| Faceted filters | ES aggregations | SQL GROUP BY |

### When to Upgrade

| Traffic Level | Solution |
|---------------|----------|
| 1K products | PostgreSQL only ✅ |
| 100K products | PostgreSQL + Redis ✅ |
| 1M products | Add Elasticsearch |
| 10M+ products | Elasticsearch + Sharding |
| 100M+ products | Full Amazon architecture |

### Your Current Position

```
ShopPulse Now:
• ~1K-10K products (manageable)
• PostgreSQL + Redis (perfect)
• Frontend pagination (correct choice)
• storeId isolation (already done!)

When to Upgrade:
• When a single store has 5000+ products
• When search across ALL stores is needed
• When you need complex faceted filters
• When query latency exceeds 500ms
```

---

## 📚 References & Further Reading

1. **Amazon A9 Algorithm**: amazon.com/gp/seller-account/mm-summary-page
2. **Flipkart Tech Blog**: tech.flipkart.com
3. **Elasticsearch Scaling**: elastic.co/guide/en/elasticsearch/reference
4. **Vitess Sharding**: vitess.io/docs
5. **Learning to Rank**: microsoft.com/en-us/research/publication/learning-to-rank

---

## Summary

These e-commerce giants solve the same problems you'll face, just at 1000x scale. The key insight:

> **Your storeId-based isolation is EXACTLY the right approach.**
> **It's the same pattern Amazon and Flipkart use with seller_id.**

You don't need their infrastructure until you hit their scale. For now:
- PostgreSQL ✅
- Redis caching ✅
- Frontend pagination ✅
- Proper indexes ✅

This will comfortably handle millions of products across thousands of stores.
