# Database & Prisma Learning Series — Master Index

> **Purpose:** Take you from absolute beginner to production-confident in database migrations, schema management, and Prisma ORM query patterns. Every concept is taught with ShopPulse Admin examples.

---

## File 1: DATABASE_MIGRATION_MASTERY.md

### Part A — Foundations (What & Why)
1. What Is a Database Migration?
2. Why Not Just Modify the Database Directly?
3. Prisma Migration Architecture (files, shadow DB, _prisma_migrations table)
4. Migration Lifecycle: `migrate dev` → `migrate deploy` → `migrate status`
5. The Migration Folder Anatomy

### Part B — Schema Change Classification
6. Safe Changes (always work, zero risk)
7. Risky Changes (need care, data-dependent)
8. Destructive Changes (data loss without manual intervention)
9. Quick-Reference Danger Table

### Part C — The Errors You'll Hit (and How to Fix Each One)
10. "We found changes that cannot be executed" — The NOT NULL Problem
11. "Migration failed to apply cleanly" — Schema Drift
12. "Prisma Migrate has detected that the migration was modified" — Tampered Migrations
13. "The migration has already been applied" — Re-apply Conflicts
14. "Database schema is not empty" — Fresh DB vs Existing DB
15. Shadow Database Failures
16. Foreign Key Constraint Violations During Migration

### Part D — Hands-On Recipes (The Fix Playbook)
17. Recipe: Making a Column NOT NULL When Rows Already Exist
18. Recipe: Renaming a Column Without Losing Data
19. Recipe: Changing a Column's Type (e.g., String → Int)
20. Recipe: Removing a Column That Has a Foreign Key
21. Recipe: Splitting One Table Into Two
22. Recipe: Merging Two Tables Into One
23. Recipe: Adding a Unique Constraint to Existing Data With Duplicates
24. Recipe: Moving Data Between Tables (Our OrderItem → snapshot migration)

### Part E — Production Migration Strategies
25. The Expand-Contract Pattern (Zero-Downtime Schema Changes)
26. Blue-Green Database Deployments
27. Feature Flags + Schema Migrations
28. Multi-Step Migration for Breaking Changes
29. Rollback Strategies (Prisma Has No Auto-Rollback — What Now?)
30. Data Backfill Scripts
31. Migration in CI/CD Pipelines

### Part F — Prisma-Specific Migration Commands Deep Dive
32. `prisma migrate dev` — Full Breakdown
33. `prisma migrate deploy` — Production Usage
34. `prisma migrate reset` — When and Why
35. `prisma migrate status` — Reading the Output
36. `prisma migrate diff` — Schema Comparison
37. `prisma db push` — When to Use (and When NOT To)
38. `prisma db pull` — Introspecting Existing Databases
39. `prisma migrate resolve` — Fixing Stuck Migrations

### Part G — Real ShopPulse Admin Migration Case Studies
40. Case Study: Our OrderItem Snapshot Migration (What We Just Did)
41. Case Study: Adding `isDefault` to ProductVariant
42. Case Study: Adding `@@unique([storeId, sku])` With Existing Data
43. Lessons Learned: What Would Have Been Different in Production

---

## File 2: PRISMA_QUERY_MASTERY.md

### Part A — Setup & Architecture
1. Prisma Client: What It Is and How It Works
2. Connection Pooling and the Singleton Pattern (Our `prismadb` Setup)
3. Generated Types: How Prisma Gives You Type Safety
4. The Two Clients Pattern (Our `prismadb` vs `prisma` aliases)

### Part B — CRUD Operations (The Foundation)
5. create — Single Record Creation
6. createMany — Bulk Insert
7. findUnique — Exact ID/Unique Lookups
8. findFirst — First Match with Conditions
9. findMany — Querying Multiple Records
10. update — Modifying a Single Record
11. updateMany — Bulk Updates with Conditions
12. upsert — Create or Update in One Call
13. delete — Removing a Single Record
14. deleteMany — Bulk Deletion

### Part C — Where Clauses (Filtering Like a Pro)
15. Exact Match: `equals` (implicit and explicit)
16. Negation: `not`
17. Set Membership: `in`, `notIn`
18. Comparison: `lt`, `lte`, `gt`, `gte`
19. String Matching: `contains`, `startsWith`, `endsWith`
20. Compound Conditions: `AND`, `OR`, `NOT`
21. Nested Where on Relations
22. Dynamic Where Building (Our Orders Filter Pattern)

### Part D — Relations: select vs include
23. `include` — Loading Related Records
24. `select` — Cherry-Picking Fields
25. Why You Can't Mix `include` and `select` at the Same Level
26. Nested `select` Inside `include`
27. Nested `include` Inside `select`
28. Deep Nesting: 3+ Levels
29. Performance: When `select` Beats `include`

### Part E — Relation Queries & Filtering
30. One-to-One Relations
31. One-to-Many Relations
32. Many-to-Many Relations (implicit and explicit)
33. Relation Filters: `some`, `every`, `none` (and why we haven't used them yet)
34. `_count` — Counting Related Records Without Loading
35. Relation `where` Inside `include`/`select`

### Part F — Sorting & Pagination
36. `orderBy` — Single Field
37. `orderBy` — Multiple Fields
38. `orderBy` — Relation Fields
39. Offset Pagination: `skip` + `take`
40. Cursor-Based Pagination — The Superior Approach (Our Implementation)
41. The `take: limit + 1` hasMore Pattern
42. Bi-directional Cursor Pagination (next/prev, Our Orders Pattern)

### Part G — Aggregations & Grouping
43. `count` — Counting Records
44. `aggregate` — sum, avg, min, max
45. `groupBy` — Grouping Results
46. `_count` on Relations (Alternative to Separate Query)

### Part H — Transactions
47. Why Transactions? The ACID Guarantee
48. Interactive Transactions: `$transaction(async (tx) => { ... })`
49. Sequential Transactions (Array Style)
50. Transaction Timeout and Max Wait
51. Real Pattern: Our Stock Decrement + Order Creation
52. Real Pattern: Our Expire-Unpaid-Orders Atomic Check
53. Nested Writes as Implicit Transactions

### Part I — Atomic Operations
54. `increment` and `decrement` — Race-Condition-Safe Updates
55. `multiply` and `divide`
56. Combining Atomic Ops with Conditional Where (Our Stock Pattern)

### Part J — Special Operations
57. JSON Fields: Reading, Writing, and Why Prisma's JSON Filtering Is Limited
58. Decimal Fields: The `.toString()` Conversion Pattern
59. DateTime Comparisons and Ranges
60. Null Handling: `null`, `not: null`, Optional Fields
61. `connectOrCreate`, `connect`, `disconnect` — Relation Management
62. `set` — Replacing Relation Lists

### Part K — Error Handling
63. P2002 — Unique Constraint Violation (Our SKU Pattern)
64. P2003 — Foreign Key Constraint Failure
65. P2025 — Record Not Found
66. Unknown Errors: Wrapping Prisma Calls
67. Retry Patterns for Transient Failures

### Part L — Performance & Best Practices
68. Select Only What You Need (Avoiding Over-Fetching)
69. Index Design: When and What to Index
70. N+1 Problem and How `include` Solves It
71. Batch Operations vs Loops
72. Connection Pool Tuning
73. Query Logging for Debugging

### Part M — Real ShopPulse Query Patterns (Case Studies)
74. Pattern: Safe Stock Decrement (updateMany with gte guard in transaction)
75. Pattern: Cursor-Based Pagination with Search + Filters
76. Pattern: Pre-Fetching Archives for O(1) Lookup (Our Order Detail)
77. Pattern: Idempotency Guard (Auto-Ship Duplicate Check)
78. Pattern: Cascading Deletes vs SetNull (Our OrderItem.product)
79. Pattern: Dynamic Sort by Multiple Criteria (Products API)
80. Pattern: JSON Snapshot for Denormalization (Our variantSnapshot)

---

## How to Study

1. **Start with File 1 Part A** — understand what migrations are
2. **Read File 1 Parts B-C** — learn the danger zones and error messages
3. **Read File 1 Part D** — practice the fix recipes
4. **Read File 2 Parts A-D** — CRUD + filtering + relations (core 80%)
5. **Read File 2 Parts E-I** — advanced: pagination, transactions, atomics
6. **Read File 2 Parts J-M** — special ops, error handling, real patterns
7. **Re-read File 1 Parts E-G** — production strategies + case studies

> Every section includes the **what**, the **why**, the **syntax**, and a **ShopPulse example**.
