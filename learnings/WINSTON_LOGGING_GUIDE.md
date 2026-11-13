# Winston Logging Guide - Complete Beginner's Reference

> **Author**: Learning Notes  
> **Last Updated**: January 2025  
> **Difficulty**: Beginner to Intermediate  
> **Applies To**: All Node.js projects (Next.js, Express, React SSR, NestJS, etc.)

---

## Table of Contents

1. [What is Winston?](#1-what-is-winston)
2. [Why Not Just Use console.log?](#2-why-not-just-use-consolelog)
3. [Installation](#3-installation)
4. [Basic Concepts](#4-basic-concepts)
5. [Setting Up Winston](#5-setting-up-winston)
6. [Log Levels Explained](#6-log-levels-explained)
7. [Transports (Where Logs Go)](#7-transports-where-logs-go)
8. [Formatting Logs](#8-formatting-logs)
9. [Daily Rotating Files](#9-daily-rotating-files)
10. [Usage Examples](#10-usage-examples)
11. [Best Practices](#11-best-practices)
12. [Framework-Specific Setup](#12-framework-specific-setup)
13. [Production Considerations](#13-production-considerations)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. What is Winston?

Winston is the most popular **logging library** for Node.js. Think of it as `console.log()` on steroids.

```
console.log  →  Simple, limited, only console
Winston      →  Multiple outputs, levels, files, formatting, filtering
```

### Key Features
- **Multiple transports**: Console, files, HTTP, databases, cloud services
- **Log levels**: error, warn, info, http, verbose, debug, silly
- **Custom formats**: JSON, timestamps, colors, custom templates
- **File rotation**: Auto-create new files daily/by size
- **Metadata**: Attach any data to logs
- **Filtering**: Show only certain levels in certain places

---

## 2. Why Not Just Use console.log?

| Feature | console.log | Winston |
|---------|-------------|---------|
| Log to file | ❌ No | ✅ Yes |
| Log levels | ❌ No | ✅ Yes (error, warn, info, debug) |
| Timestamps | ❌ Manual | ✅ Automatic |
| JSON format | ❌ No | ✅ Yes |
| File rotation | ❌ No | ✅ Yes |
| Filter by level | ❌ No | ✅ Yes |
| Production safe | ❌ Bad | ✅ Good |
| Metadata attachment | ❌ Limited | ✅ Unlimited |

### Real Problem Solved

**Without Winston:**
```javascript
// Your logs disappear when server restarts
// Can't find what happened yesterday
// No way to filter errors from info
console.log('Order created');
console.log('Error:', error);
```

**With Winston:**
```javascript
// Logs persist in files
// Filter: grep "error" logs/app.log
// Search: grep "orderId:123" logs/app.log
logger.info('Order created', { orderId: 123 });
logger.error('Payment failed', { orderId: 123, error: error.message });
```

---

## 3. Installation

### NPM
```bash
npm install winston winston-daily-rotate-file
```

### Yarn
```bash
yarn add winston winston-daily-rotate-file
```

### PNPM
```bash
pnpm add winston winston-daily-rotate-file
```

### What Each Package Does
- `winston`: Core logging library
- `winston-daily-rotate-file`: Creates new log file each day automatically

---

## 4. Basic Concepts

### Logger
The main object you use to write logs.

```javascript
const logger = winston.createLogger({ ... });
logger.info('Hello');
```

### Transport
Where logs go. You can have multiple transports.

```javascript
// Transport 1: Console
new winston.transports.Console()

// Transport 2: File
new winston.transports.File({ filename: 'app.log' })
```

### Format
How logs look.

```javascript
// JSON format (good for machines)
{"level":"info","message":"Order created","timestamp":"2025-01-27T10:00:00Z"}

// Pretty format (good for humans)
[2025-01-27 10:00:00] INFO: Order created
```

### Log Level
Priority of the log message.

```
error   (0)  →  Something broke, needs immediate attention
warn    (1)  →  Something might be wrong
info    (2)  →  Normal events (order created, user logged in)
http    (3)  →  HTTP requests/responses
verbose (4)  →  More detailed info
debug   (5)  →  Developer debugging info
silly   (6)  →  Everything possible
```

---

## 5. Setting Up Winston

### Step 1: Create the Logger File

Create `src/lib/logger.ts` (TypeScript) or `src/lib/logger.js` (JavaScript):

```typescript
// src/lib/logger.ts

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define custom log levels (optional - winston has defaults)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Format for CONSOLE (human readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Format for FILES (JSON for easy parsing/searching)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create logs directory path
const logsDir = path.join(process.cwd(), 'logs');

// Create the logger
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'debug', // Default level
  
  transports: [
    // Transport 1: Console
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    
    // Transport 2: Daily rotating file (all logs)
    new DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',     // Max 20 megabytes per file
      maxFiles: '14d',    // Keep logs for 14 days
      format: fileFormat,
    }),
    
    // Transport 3: Error-only file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',     // Only error level
      format: fileFormat,
    }),
  ],
});

export default logger;
```

### Step 2: Create logs Directory

Add to your `.gitignore`:
```
logs/
```

Create the directory (optional - winston creates it):
```bash
mkdir logs
```

### Step 3: Use in Your Code

```typescript
import logger from '@/lib/logger';

// Simple messages
logger.error('Something broke!');
logger.warn('This might be a problem');
logger.info('User logged in');
logger.debug('Debug info for developers');

// With metadata (recommended)
logger.info('Order created', {
  orderId: 'order_123',
  userId: 'user_456',
  amount: 999.99,
});

logger.error('Payment failed', {
  orderId: 'order_123',
  error: 'Card declined',
  cardLast4: '4242',
});
```

---

## 6. Log Levels Explained

### The Hierarchy

```
0  error   →  Highest priority, always logged
1  warn    →  High priority
2  info    →  Normal operations
3  http    →  HTTP traffic
4  debug   →  Development info
5  silly   →  Everything (very noisy)
```

### How Level Filtering Works

If you set `level: 'info'`, Winston logs:
- ✅ error (0)
- ✅ warn (1)
- ✅ info (2)
- ❌ http (3) - filtered out
- ❌ debug (4) - filtered out

**Rule**: It logs the specified level AND everything more important (lower number).

### When to Use Each Level

```typescript
// ERROR - Application errors that need fixing
logger.error('Database connection failed', { host: 'db.example.com' });
logger.error('Payment processing error', { error: err.message });

// WARN - Potential issues, not critical
logger.warn('Slow API response', { duration: 5000 });
logger.warn('Rate limit approaching', { remaining: 10 });

// INFO - Normal business events
logger.info('User registered', { userId: 'user_123' });
logger.info('Order completed', { orderId: 'order_456' });

// HTTP - API requests (often auto-logged by middleware)
logger.http('GET /api/users', { status: 200, duration: 45 });

// DEBUG - Developer debugging info
logger.debug('Calculating shipping', { weight: 5, zone: 'west' });
logger.debug('Cache miss', { key: 'user:123' });
```

---

## 7. Transports (Where Logs Go)

### Console Transport
Logs to terminal/console.

```typescript
new winston.transports.Console({
  format: consoleFormat,
  level: 'debug',           // Show debug and above
})
```

### File Transport
Logs to a single file.

```typescript
new winston.transports.File({
  filename: 'logs/app.log',
  level: 'info',            // Only info and above
  maxsize: 5242880,         // 5MB max
  maxFiles: 5,              // Keep 5 files
})
```

### Daily Rotate File Transport
Creates new file each day automatically.

```typescript
new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',  // %DATE% replaced with date
  datePattern: 'YYYY-MM-DD',        // Date format in filename
  maxSize: '20m',                   // Max file size
  maxFiles: '14d',                  // Keep for 14 days
  zippedArchive: true,              // Compress old logs
})
```

This creates files like:
```
logs/app-2025-01-25.log
logs/app-2025-01-26.log
logs/app-2025-01-27.log  ← Today
```

### HTTP Transport
Send logs to a remote server.

```typescript
new winston.transports.Http({
  host: 'logs.example.com',
  port: 443,
  path: '/logs',
  ssl: true,
})
```

### Multiple Transports Example

```typescript
const logger = winston.createLogger({
  transports: [
    // Console: Show all in development
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    }),
    
    // File: All logs
    new DailyRotateFile({
      filename: 'logs/all-%DATE%.log',
      level: 'debug',
    }),
    
    // File: Errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    
    // File: HTTP requests only
    new winston.transports.File({
      filename: 'logs/http.log',
      level: 'http',
    }),
  ],
});
```

---

## 8. Formatting Logs

### Built-in Formats

```typescript
import { format } from 'winston';

// Add timestamp
format.timestamp()

// Add colors (console only)
format.colorize()

// Output as JSON
format.json()

// Simple text
format.simple()

// Pretty print objects
format.prettyPrint()

// Custom printf
format.printf(info => `${info.level}: ${info.message}`)
```

### Combining Formats

```typescript
const myFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
```

### Custom Format Example

```typescript
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  // Custom output: [2025-01-27 10:00:00] [INFO] Order created {orderId: "123"}
  let output = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    output += ` ${JSON.stringify(metadata)}`;
  }
  
  return output;
});
```

### Format for Different Transports

```typescript
const logger = winston.createLogger({
  transports: [
    // Console: Pretty, colored
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => 
          `${timestamp} ${level}: ${message}`
        )
      ),
    }),
    
    // File: JSON for machine parsing
    new winston.transports.File({
      filename: 'logs/app.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});
```

---

## 9. Daily Rotating Files

### Installation
```bash
npm install winston-daily-rotate-file
```

### Configuration Options

```typescript
new DailyRotateFile({
  // File naming
  filename: 'logs/app-%DATE%.log',    // %DATE% = date
  datePattern: 'YYYY-MM-DD',          // Date format
  
  // Size management
  maxSize: '20m',                     // Max size per file
  maxFiles: '14d',                    // Keep for 14 days
  // OR
  maxFiles: 5,                        // Keep 5 files
  
  // Compression
  zippedArchive: true,                // Gzip old files
  
  // Level
  level: 'info',                      // Minimum level to log
  
  // Format
  format: winston.format.json(),
})
```

### Output Example

```
logs/
├── app-2025-01-25.log.gz    ← Compressed (old)
├── app-2025-01-26.log.gz    ← Compressed (old)
├── app-2025-01-27.log       ← Today (active)
└── error.log                ← All errors
```

---

## 10. Usage Examples

### Basic Usage

```typescript
import logger from '@/lib/logger';

// Simple message
logger.info('Server started');

// With metadata
logger.info('Request received', {
  method: 'GET',
  path: '/api/users',
  ip: '192.168.1.1',
});

// Error with stack trace
try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
  });
}
```

### Logging in API Routes (Next.js)

```typescript
// src/app/api/orders/route.ts
import logger from '@/lib/logger';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    logger.info('Order creation started', {
      flow: 'ORDERS',
      userId: body.userId,
    });
    
    // ... create order logic ...
    
    logger.info('Order created successfully', {
      flow: 'ORDERS',
      orderId: order.id,
      duration: Date.now() - startTime,
    });
    
    return Response.json({ success: true, orderId: order.id });
    
  } catch (error) {
    logger.error('Order creation failed', {
      flow: 'ORDERS',
      error: error.message,
      duration: Date.now() - startTime,
    });
    
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
```

### Logging in Services

```typescript
// src/lib/services/payment-service.ts
import logger from '@/lib/logger';

export async function processPayment(orderId: string, amount: number) {
  logger.debug('Processing payment', {
    flow: 'PAYMENT',
    orderId,
    amount,
  });
  
  try {
    const result = await paymentGateway.charge(amount);
    
    if (result.success) {
      logger.info('Payment successful', {
        flow: 'PAYMENT',
        orderId,
        transactionId: result.transactionId,
      });
    } else {
      logger.warn('Payment declined', {
        flow: 'PAYMENT',
        orderId,
        reason: result.declineReason,
      });
    }
    
    return result;
    
  } catch (error) {
    logger.error('Payment processing error', {
      flow: 'PAYMENT',
      orderId,
      error: error.message,
    });
    throw error;
  }
}
```

### Child Loggers (Scoped)

```typescript
// Create a child logger with default metadata
const paymentLogger = logger.child({ service: 'payment' });

paymentLogger.info('Processing started');
// Output: {"service":"payment","message":"Processing started",...}

paymentLogger.info('Processing complete', { orderId: '123' });
// Output: {"service":"payment","orderId":"123","message":"Processing complete",...}
```

---

## 11. Best Practices

### 1. Use Consistent Flow Tags

```typescript
// Good - easy to filter
logger.info('Shipment created', { flow: 'SHIPMENT', shipmentId: '123' });
logger.info('Pickup scheduled', { flow: 'PICKUP', batchId: '456' });
logger.info('Webhook received', { flow: 'WEBHOOK', type: 'payment' });

// Bad - inconsistent
logger.info('Shipment created');
logger.info('[PICKUP] Scheduled');
logger.info('WEBHOOK: payment received');
```

### 2. Include Context

```typescript
// Good - useful for debugging
logger.error('Payment failed', {
  orderId: order.id,
  userId: user.id,
  amount: order.total,
  error: error.message,
  errorCode: error.code,
});

// Bad - not helpful
logger.error('Payment failed');
```

### 3. Don't Log Sensitive Data

```typescript
// Good
logger.info('User authenticated', {
  userId: user.id,
  email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Masked
});

// Bad - security risk!
logger.info('User authenticated', {
  password: user.password,  // NEVER!
  creditCard: card.number,  // NEVER!
});
```

### 4. Log Entry and Exit

```typescript
async function processOrder(orderId: string) {
  logger.info('Order processing started', { orderId });
  const startTime = Date.now();
  
  try {
    // ... logic ...
    
    logger.info('Order processing completed', {
      orderId,
      duration: Date.now() - startTime,
    });
    
  } catch (error) {
    logger.error('Order processing failed', {
      orderId,
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}
```

### 5. Use Appropriate Levels

```typescript
// ERROR - Needs immediate attention
logger.error('Database connection lost');

// WARN - Concerning but not critical
logger.warn('Slow query detected', { duration: 5000 });

// INFO - Normal business events
logger.info('User signed up');

// DEBUG - Development details
logger.debug('Cache miss', { key: 'user:123' });
```

---

## 12. Framework-Specific Setup

### Next.js App Router

**Works in:**
- API Routes (`app/api/**/route.ts`)
- Server Components
- Server Actions
- Middleware

**Does NOT work in:**
- Client Components (browser - no file system)
- Client-side code

```typescript
// ✅ Works: API Route
// src/app/api/orders/route.ts
import logger from '@/lib/logger';

export async function GET() {
  logger.info('Orders fetched');
  // ...
}

// ✅ Works: Server Component
// src/app/orders/page.tsx
import logger from '@/lib/logger';

export default async function OrdersPage() {
  logger.info('Orders page accessed');
  // ...
}

// ❌ Doesn't work: Client Component
'use client';
import logger from '@/lib/logger'; // Error: fs not available
```

### Express.js

```typescript
// src/app.ts
import express from 'express';
import logger from './lib/logger';

const app = express();

// Log all requests
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    logger.http(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: Date.now() - startTime,
      ip: req.ip,
    });
  });
  
  next();
});

// Routes
app.get('/api/users', (req, res) => {
  logger.info('Users fetched');
  res.json([]);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  logger.info('Server started', { port: 3000 });
});
```

### NestJS

```typescript
// src/common/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import logger from './winston-logger';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    logger.info(message, { context });
  }
  
  error(message: string, trace?: string, context?: string) {
    logger.error(message, { trace, context });
  }
  
  warn(message: string, context?: string) {
    logger.warn(message, { context });
  }
  
  debug(message: string, context?: string) {
    logger.debug(message, { context });
  }
}
```

---

## 13. Production Considerations

### 1. Set Appropriate Log Level

```typescript
// In production, don't log debug info
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
```

### 2. Use Environment Variables

```bash
# .env.production
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=50m
LOG_FILE_MAX_DAYS=30
```

```typescript
new DailyRotateFile({
  level: process.env.LOG_LEVEL || 'info',
  maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_FILE_MAX_DAYS || '14d',
})
```

### 3. Consider Log Aggregation Services

For production, consider:
- **Datadog**
- **Logtail (Better Stack)**
- **AWS CloudWatch**
- **Papertrail**
- **Logflare**

These services provide:
- Centralized logs from multiple servers
- Search and filtering
- Alerting
- Dashboards

### 4. Rotate Logs to Prevent Disk Full

```typescript
new DailyRotateFile({
  maxSize: '50m',      // Max 50MB per file
  maxFiles: '30d',     // Delete after 30 days
  zippedArchive: true, // Compress old files
})
```

### 5. Don't Block the Event Loop

Winston is designed to be non-blocking, but be careful with:
- Very large log messages
- Too many logs per second

```typescript
// Good - brief message with metadata object
logger.info('Order processed', { orderId: order.id });

// Bad - serializing huge objects
logger.info('Order processed', { order: fullOrderObject }); // If order is huge
```

---

## 14. Troubleshooting

### Logs Not Appearing in File

1. Check if `logs/` directory exists
2. Check file permissions
3. Ensure winston-daily-rotate-file is installed
4. Check transport level vs logger level

### Colors Not Working in Console

```typescript
// Ensure colorize is in format
winston.format.combine(
  winston.format.colorize({ all: true }), // Must come before printf
  winston.format.printf(...)
)
```

### TypeScript Errors

```bash
npm install @types/winston --save-dev
```

### Logs Directory on Vercel/Serverless

Vercel has a read-only filesystem. Options:
1. Log to console only (Vercel captures stdout)
2. Use external service (Datadog, Logtail)
3. Use HTTP transport

```typescript
// For Vercel/serverless
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
];

// Only add file transport on traditional servers
if (!isServerless) {
  transports.push(new DailyRotateFile({ ... }));
}
```

---

## Summary

### When to Use Winston
- ✅ All Node.js backend projects
- ✅ Next.js API routes / Server Components
- ✅ Express.js servers
- ✅ NestJS applications
- ✅ Any server-side TypeScript/JavaScript

### When NOT to Use Winston
- ❌ Browser/client-side code
- ❌ React client components
- ❌ Frontend-only applications

### Quick Start Checklist
1. `npm install winston winston-daily-rotate-file`
2. Create `src/lib/logger.ts` (copy from Section 5)
3. Add `logs/` to `.gitignore`
4. Replace `console.log` with `logger.info`, `logger.error`, etc.
5. Include metadata for context

---

## Further Reading

- [Winston Documentation](https://github.com/winstonjs/winston)
- [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file)
- [Winston Transports](https://github.com/winstonjs/winston/blob/master/docs/transports.md)
