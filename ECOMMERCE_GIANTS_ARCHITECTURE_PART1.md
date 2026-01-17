# How Amazon, Flipkart & Myntra Handle Massive Scale

## Part 1: Architecture Overview

---

## 📊 Scale Comparison

| Platform | Products | Daily Orders | Peak Queries/sec | Data Size |
|----------|----------|--------------|------------------|-----------|
| Amazon (Global) | 350+ million | 1.6 million | 500,000+ | Petabytes |
| Flipkart | 150+ million | 1+ million | 100,000+ | Hundreds of TB |
| Myntra | 10+ million | 500,000+ | 50,000+ | Tens of TB |
| ShopPulse (Your Scale) | 10M potential | 10,000/day | 1,000 | ~100 GB |

---

## 🏗️ The Problem: Why Traditional Databases Fail

### Single PostgreSQL Approach (What You Have)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Single PostgreSQL                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Products Table                       │   │
│   │                   (10 billion rows)                     │   │
│   │                                                         │   │
│   │  ┌──────────────────────────────────────────────────┐   │   │
│   │  │ Every query must:                                │   │   │
│   │  │ • Search through B-tree index (4-5 levels)       │   │   │
│   │  │ • Load relevant rows from disk                   │   │   │
│   │  │ • Apply filters in memory                        │   │   │
│   │  │ • Sort results                                   │   │   │
│   │  │ • Return to application                          │   │   │
│   │  └──────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   Limits:                                                       │
│   • ~10-50TB practical limit                                    │
│   • ~10,000-50,000 queries/sec max                              │
│   • Single point of failure                                     │
│   • Scaling requires expensive hardware                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Happens at Amazon Scale?

```
350 million products × 50+ attributes each = MASSIVE data
1 million searches/minute = IMPOSSIBLE for single DB
Global users = Latency requirements < 100ms

Single PostgreSQL? ❌ IMPOSSIBLE
```

---

## 🔍 How Amazon Does Product Search

### Architecture: Elasticsearch + DynamoDB

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AMAZON'S PRODUCT ARCHITECTURE                       │
│                                                                            │
│  User Search: "blue nike shoes size 10"                                    │
│                         │                                                  │
│                         ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway + Load Balancer                       │  │
│  │              (Routes to nearest data center)                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                         │                                                  │
│                         ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Search Service                                   │  │
│  │                                                                      │  │
│  │   ┌────────────────────────────────────────────────────────────┐     │  │
│  │   │              Elasticsearch Cluster                         │     │  │
│  │   │                                                            │     │  │
│  │   │   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │     │  │
│  │   │   │ Node 1 │  │ Node 2 │  │ Node 3 │  │ Node N │          │     │  │
│  │   │   │        │  │        │  │        │  │  ...   │          │     │  │
│  │   │   │ Shard  │  │ Shard  │  │ Shard  │  │ Shard  │          │     │  │
│  │   │   │  A,B   │  │  C,D   │  │  E,F   │  │ 100+   │          │     │  │
│  │   │   └────────┘  └────────┘  └────────┘  └────────┘          │     │  │
│  │   │                                                            │     │  │
│  │   │   Each shard has ~10M products                            │     │  │
│  │   │   100+ nodes = 350M products indexed                      │     │  │
│  │   └────────────────────────────────────────────────────────────┘     │  │
│  │                                                                      │  │
│  │   Query: "blue nike shoes size 10"                                   │  │
│  │   • Tokenized: ["blue", "nike", "shoes", "size", "10"]              │  │
│  │   • Search across all shards in parallel                            │  │
│  │   • Merge results by relevance score                                │  │
│  │   • Return top 20 product IDs in ~50ms                              │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                         │                                                  │
│                         │ Product IDs: [id1, id2, ..., id20]              │
│                         ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Product Service                                  │  │
│  │                                                                      │  │
│  │   ┌────────────────────────────────────────────────────────────┐     │  │
│  │   │              DynamoDB (or similar NoSQL)                   │     │  │
│  │   │                                                            │     │  │
│  │   │   • Partition by product_id                               │     │  │
│  │   │   • Get 20 products by ID in ~10ms                         │     │  │
│  │   │   • Each partition handles its own products                │     │  │
│  │   │   • Infinitely scalable (add more partitions)             │     │  │
│  │   └────────────────────────────────────────────────────────────┘     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                         │                                                  │
│                         ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Cache Layer (ElastiCache/Redis)                  │  │
│  │                                                                      │  │
│  │   • Popular searches cached                                          │  │
│  │   • "nike shoes" → Pre-computed results                              │  │
│  │   • 90% of requests served from cache                                │  │
│  │   • Cache hit: ~5ms                                                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                         │                                                  │
│                         ▼                                                  │
│                    User sees results in < 100ms                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Key Technologies Amazon Uses

| Component | Technology | Purpose |
|-----------|------------|---------|
| Search | Elasticsearch (custom A9) | Full-text search, facets, relevance |
| Product Data | DynamoDB | Primary product storage |
| Cache | ElastiCache (Redis/Memcached) | Hot data caching |
| CDN | CloudFront | Static assets, edge caching |
| Analytics | Kinesis + Redshift | Real-time + batch analytics |

---

## 🛍️ How Flipkart Does It

### Architecture: MySQL Sharding + Elasticsearch

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         FLIPKART'S ARCHITECTURE                            │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Traffic Distribution                              │  │
│  │                                                                      │  │
│  │   100,000 requests/second during Big Billion Days                    │  │
│  │                          │                                           │  │
│  │                          ▼                                           │  │
│  │   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                    │  │
│  │   │ LB 1   │  │ LB 2   │  │ LB 3   │  │ LB N   │                    │  │
│  │   └────────┘  └────────┘  └────────┘  └────────┘                    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Search Layer (Elasticsearch)                      │  │
│  │                                                                      │  │
│  │   • 100+ node cluster                                                │  │
│  │   • Index split by category                                          │  │
│  │   • Each category has dedicated shards                               │  │
│  │                                                                      │  │
│  │   ┌──────────────────┐  ┌──────────────────┐                        │  │
│  │   │  Electronics     │  │  Fashion         │                        │  │
│  │   │  (30M products)  │  │  (50M products)  │                        │  │
│  │   │  20 shards       │  │  30 shards       │                        │  │
│  │   └──────────────────┘  └──────────────────┘                        │  │
│  │   ┌──────────────────┐  ┌──────────────────┐                        │  │
│  │   │  Home & Living   │  │  Grocery         │                        │  │
│  │   │  (20M products)  │  │  (10M products)  │                        │  │
│  │   │  15 shards       │  │  10 shards       │                        │  │
│  │   └──────────────────┘  └──────────────────┘                        │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Database Layer (MySQL + Vitess)                   │  │
│  │                                                                      │  │
│  │   Vitess: MySQL sharding middleware (developed by YouTube)           │  │
│  │                                                                      │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │                    Vitess Proxy                             │    │  │
│  │   │                                                             │    │  │
│  │   │   • Routes queries to correct shard                        │    │  │
│  │   │   • Handles cross-shard queries                             │    │  │
│  │   │   • Manages connections                                     │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  │              │             │             │             │             │  │
│  │              ▼             ▼             ▼             ▼             │  │
│  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│  │
│  │   │  Shard 1     │ │  Shard 2     │ │  Shard 3     │ │  Shard N     ││  │
│  │   │  seller_id   │ │  seller_id   │ │  seller_id   │ │  seller_id   ││  │
│  │   │  0-999999    │ │  1M-2M       │ │  2M-3M       │ │  ...         ││  │
│  │   │              │ │              │ │              │ │              ││  │
│  │   │  MySQL       │ │  MySQL       │ │  MySQL       │ │  MySQL       ││  │
│  │   │  Primary     │ │  Primary     │ │  Primary     │ │  Primary     ││  │
│  │   │     │        │ │     │        │ │     │        │ │     │        ││  │
│  │   │     ▼        │ │     ▼        │ │     ▼        │ │     ▼        ││  │
│  │   │  Replica 1   │ │  Replica 1   │ │  Replica 1   │ │  Replica 1   ││  │
│  │   │  Replica 2   │ │  Replica 2   │ │  Replica 2   │ │  Replica 2   ││  │
│  │   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Flipkart's Sharding Strategy

**Shard by Seller ID (similar to your storeId)**

```sql
-- Seller 12345's products are on Shard 1
-- All queries for seller 12345 go to Shard 1 only

-- Query: Get products for category in seller's store
SELECT * FROM products 
WHERE seller_id = 12345 AND category_id = 'electronics'
-- Routes to: Shard 1 only (not all shards!)
```

**Why Seller-Based Sharding Works:**

1. **Isolation**: Each seller's data is independent
2. **No Cross-Shard**: Most queries are seller-specific
3. **Balanced**: Products distributed by seller count
4. **Similar to ShopPulse**: Your `storeId` is like their `seller_id`

---

## 👗 How Myntra Does It

### Architecture: Catalog Service + Search

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         MYNTRA'S ARCHITECTURE                              │
│                                                                            │
│  Focus: Fashion-specific optimizations                                     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Special Considerations                            │  │
│  │                                                                      │  │
│  │   Fashion has unique requirements:                                   │  │
│  │   • Size filtering (S, M, L, XL, 32, 34, etc.)                      │  │
│  │   • Color filtering (RGB variations, "Navy Blue")                   │  │
│  │   • Brand is critical (Nike, Adidas, Puma)                          │  │
│  │   • Style matching (Similar looks, "Complete the look")             │  │
│  │   • Image-based search (Visual similarity)                          │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Catalog Service Architecture                      │  │
│  │                                                                      │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │              Product Information Management                 │    │  │
│  │   │                                                             │    │  │
│  │   │   • Centralized product data                               │    │  │
│  │   │   • Normalized attributes                                   │    │  │
│  │   │   • Version controlled                                      │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  │                          │                                           │  │
│  │                          ▼                                           │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │              Attribute Service                              │    │  │
│  │   │                                                             │    │  │
│  │   │   • Color normalization ("Navy Blue" → color_code: #001f3f) │    │  │
│  │   │   • Size normalization (S, M, L → standard sizes)          │    │  │
│  │   │   • Brand entity resolution                                 │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  │                          │                                           │  │
│  │                          ▼                                           │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │              Search Index Builder                           │    │  │
│  │   │                                                             │    │  │
│  │   │   • Builds Elasticsearch documents                         │    │  │
│  │   │   • Adds computed fields:                                   │    │  │
│  │   │     - popularity_score                                      │    │  │
│  │   │     - discount_percentage                                   │    │  │
│  │   │     - delivery_estimate                                     │    │  │
│  │   │     - review_score                                          │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Search & Filtering                                │  │
│  │                                                                      │  │
│  │   Elasticsearch Index Structure:                                     │  │
│  │                                                                      │  │
│  │   {                                                                  │  │
│  │     "product_id": "MN123456",                                        │  │
│  │     "title": "Men's Blue Nike Running Shoes",                        │  │
│  │     "brand": "Nike",                                                 │  │
│  │     "category_path": ["Men", "Footwear", "Sports Shoes"],           │  │
│  │     "price": 4999,                                                   │  │
│  │     "discounted_price": 3499,                                        │  │
│  │     "discount_percent": 30,                                          │  │
│  │     "colors": [                                                      │  │
│  │       { "name": "Blue", "hex": "#0000FF", "image": "..." }          │  │
│  │     ],                                                               │  │
│  │     "sizes": ["UK7", "UK8", "UK9", "UK10"],                         │  │
│  │     "available_sizes": ["UK8", "UK9"],                               │  │
│  │     "rating": 4.3,                                                   │  │
│  │     "review_count": 1250,                                            │  │
│  │     "popularity_score": 8750,                                        │  │
│  │     "is_premium_brand": true,                                        │  │
│  │     "delivery_days": 3,                                              │  │
│  │     "keywords": ["running", "sports", "casual", "nike", "blue"]     │  │
│  │   }                                                                  │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Sorting Implementation                            │  │
│  │                                                                      │  │
│  │   Sort: "Popularity"                                                 │  │
│  │   └─→ ORDER BY popularity_score DESC                                 │  │
│  │       (Pre-computed: views × 0.3 + orders × 0.5 + wishlist × 0.2)   │  │
│  │                                                                      │  │
│  │   Sort: "What's New"                                                 │  │
│  │   └─→ ORDER BY created_at DESC                                       │  │
│  │       (Plus recency boost in relevance)                              │  │
│  │                                                                      │  │
│  │   Sort: "Price: Low to High"                                         │  │
│  │   └─→ ORDER BY discounted_price ASC                                  │  │
│  │       (Uses discounted price, not MRP!)                              │  │
│  │                                                                      │  │
│  │   Sort: "Customer Rating"                                            │  │
│  │   └─→ ORDER BY rating DESC, review_count DESC                        │  │
│  │       (Rating alone can be gamed with few reviews)                   │  │
│  │                                                                      │  │
│  │   Sort: "Discount"                                                   │  │
│  │   └─→ ORDER BY discount_percent DESC                                 │  │
│  │       (Popular during sales)                                         │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔢 The Math: Why This Works

### Query Distribution (Elasticsearch)

```
100,000 queries/second

Elasticsearch Cluster: 100 nodes
Each node handles: 1,000 queries/second

Each query:
• Hits 3-5 shards (category-specific)
• Each shard returns top 100
• Coordinator merges to top 20
• Total time: 30-50ms
```

### Data Distribution

```
150 million products
100 shards (by category)

Per shard: 1.5 million products
Shard size: ~15GB (with replicas)

Index query: O(log n) = log(1.5M) ≈ 21 operations
With in-memory index: ~1ms per shard
```

### Cache Hit Rates

```
Popular queries: 80% of traffic
Cached responses: 90% hit rate

Effective load on Elasticsearch:
100,000 queries × 20% (non-popular) + 100,000 × 80% × 10% (cache miss)
= 20,000 + 8,000 = 28,000 queries/second

Much more manageable!
```

---

## 📊 Summary: What Each Platform Does

| Aspect | Amazon | Flipkart | Myntra |
|--------|--------|----------|--------|
| **Primary DB** | DynamoDB | MySQL + Vitess | PostgreSQL |
| **Search** | Custom A9 + ES | Elasticsearch | Elasticsearch |
| **Sharding** | Partition by ID | Seller-based | Category-based |
| **Cache** | ElastiCache | Redis Cluster | Redis |
| **CDN** | CloudFront | Akamai | Fastly |
| **Scale** | 350M products | 150M products | 10M products |
| **Query Speed** | <100ms | <150ms | <100ms |

### Key Takeaways for ShopPulse

1. **Your scale is manageable** - Even 10M products is tiny compared to these
2. **storeId is your sharding key** - Just like seller_id at Flipkart
3. **PostgreSQL is fine** - Myntra uses it! Just need proper indexes
4. **Add Elasticsearch later** - When you hit 10M+ products
5. **Cache is critical** - Redis solves most performance issues
6. **Frontend pagination is valid** - Even big players use it for seller pages
