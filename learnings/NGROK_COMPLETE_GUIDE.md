# 🌐 ngrok Complete Guide: Testing Webhooks Locally

## Table of Contents
1. [What is ngrok?](#what-is-ngrok)
2. [Why Do We Need ngrok?](#why-do-we-need-ngrok)
3. [How ngrok Works](#how-ngrok-works)
4. [Installation Guide](#installation-guide)
5. [Using ngrok for Webhook Testing](#using-ngrok-for-webhook-testing)
6. [Complete Testing Flow](#complete-testing-flow)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Alternative Tools](#alternative-tools)

---

## What is ngrok?

### Simple Definition
**ngrok** is a tool that creates a **secure tunnel** from the internet to your local computer.

### Analogy
Think of ngrok like a **phone receptionist**:
- Your office (localhost) has no direct phone line to the outside world
- ngrok acts as a receptionist with a public phone number
- When someone calls the public number (ngrok URL), the receptionist forwards it to your office

### Technical Definition
ngrok is a **reverse proxy** that:
1. Gives your localhost a public HTTPS URL
2. Forwards all requests from that URL to your local server
3. Shows you all incoming requests in real-time
4. Works through firewalls and NAT

---

## Why Do We Need ngrok?

### The Problem: Clerk Can't Reach Localhost

```
┌─────────────────────────────────────────────────────────┐
│              WITHOUT NGROK (Doesn't Work)               │
└─────────────────────────────────────────────────────────┘

Clerk's Servers (Internet)
   ↓
   Tries to send webhook to:
   http://localhost:3000/api/webhook/clerk
   ↓
❌ BLOCKED!
   "localhost" only exists on YOUR computer
   Clerk's servers can't reach it
   
Error: "requests to this IP range are blocked"
```

### The Solution: ngrok Creates a Public Tunnel

```
┌─────────────────────────────────────────────────────────┐
│               WITH NGROK (Works!)                       │
└─────────────────────────────────────────────────────────┘

Clerk's Servers (Internet)
   ↓
   Sends webhook to:
   https://abc123.ngrok.io/api/webhook/clerk
   ↓
ngrok Cloud Service (Public Internet)
   ↓
   Forwards to:
   http://localhost:3000/api/webhook/clerk
   ↓
✅ Your Local Server Receives It!
```

---

## How ngrok Works

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    COMPLETE FLOW                        │
└─────────────────────────────────────────────────────────┘

Internet Services (Clerk, Stripe, etc.)
        ↓ HTTPS Request
        ↓ https://abc123.ngrok.io/api/webhook/clerk
        ↓
┌───────────────────────────┐
│   ngrok Cloud Servers     │  ← Public, always accessible
│   (Global Infrastructure) │
└───────────────────────────┘
        ↓ Secure Tunnel
        ↓ (Encrypted WebSocket Connection)
        ↓
┌───────────────────────────┐
│   ngrok Agent (CLI)       │  ← Running on your computer
│   Running in Terminal     │
└───────────────────────────┘
        ↓ HTTP Request
        ↓ http://localhost:3000/api/webhook/clerk
        ↓
┌───────────────────────────┐
│   Your Local Server       │  ← npm run dev
│   Next.js Dev Server      │
└───────────────────────────┘
        ↓
   Webhook Handler Processes Request
        ↓
   Returns Response
        ↓
   (Flows back through the tunnel)
        ↓
   Clerk Receives Response
```

### Key Features

1. **Public HTTPS URL**
   - You get: `https://random-string.ngrok.io`
   - Accessible from anywhere on the internet
   - Free tier provides random URL (changes on restart)

2. **Secure Tunnel**
   - Encrypted connection between ngrok cloud and your computer
   - No need to open firewall ports
   - Works behind corporate proxies

3. **Request Inspector**
   - Web interface at `http://localhost:4040`
   - See all incoming requests
   - Inspect headers, body, response
   - Replay requests for debugging

4. **Real-Time Forwarding**
   - Zero latency
   - Preserves all HTTP headers
   - Supports WebSockets
   - Works with any port

---

## Installation Guide

### Option 1: Download from Website (Recommended for Windows)

#### Step 1: Download ngrok
1. Go to: https://ngrok.com/download
2. Click **"Download for Windows"**
3. Choose **ZIP file** (easier) or **.exe installer**

#### Step 2: Extract (if ZIP)
1. Extract `ngrok.zip` to a folder
2. Example: `C:\Tools\ngrok\` or `D:\ngrok\`
3. You'll have: `ngrok.exe`

#### Step 3: Add to PATH (Important!)
**Method A: Temporarily (Quick Test)**
```bash
# Navigate to ngrok folder in Git Bash
cd /d/ngrok

# Run ngrok directly
./ngrok http 3000
```

**Method B: Permanently (Recommended)**
1. Copy the folder path: `D:\ngrok`
2. Open Windows Settings:
   - Press `Win + R`
   - Type: `sysdm.cpl`
   - Press Enter
3. Click **"Advanced"** tab
4. Click **"Environment Variables"**
5. Under "System variables", find **"Path"**
6. Click **"Edit"**
7. Click **"New"**
8. Paste: `D:\ngrok` (your ngrok folder path)
9. Click **"OK"** on all windows
10. **Close and reopen Git Bash terminal**

#### Step 4: Verify Installation
```bash
# Should show ngrok version
ngrok version

# Example output:
# ngrok version 3.x.x
```

---

### Option 2: Install via npm (Not Recommended)

The npm version has issues on Windows. Use the official download instead.

---

### Option 3: Install via Chocolatey (Windows Package Manager)

If you have Chocolatey installed:
```bash
choco install ngrok
```

---

## Using ngrok for Webhook Testing

### Complete Step-by-Step Guide

#### Prerequisites
- ✅ Dev server running: `npm run dev` on port 3000
- ✅ ngrok installed and in PATH
- ✅ Webhook handler code ready

---

### Step 1: Start Your Development Server

**Terminal 1: Dev Server**
```bash
cd D:/study/ShopPulseAdmin
npm run dev
```

**Wait for:**
```
✓ Ready in 1802ms
- Local: http://localhost:3000
```

---

### Step 2: Start ngrok (New Terminal)

**Terminal 2: ngrok**
```bash
# Open NEW terminal (don't close dev server)
cd D:/study/ShopPulseAdmin

# Start ngrok tunnel to port 3000
ngrok http 3000
```

**Expected Output:**
```
ngrok

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123xyz.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**IMPORTANT:** Copy the **Forwarding URL**:
```
https://abc123xyz.ngrok.io
```

This is your public URL! (It will be different each time)

---

### Step 3: Update Clerk Webhook URL

1. **Go to Clerk Dashboard**
   - https://dashboard.clerk.com
   - Select your application
   - Click "Webhooks"

2. **Edit Your Webhook**
   - Click on your existing webhook
   - Click "Edit"
   - Change URL from:
     ```
     http://localhost:3000/api/webhook/clerk
     ```
   - To (use YOUR ngrok URL):
     ```
     https://abc123xyz.ngrok.io/api/webhook/clerk
     ```
   - Click "Save"

---

### Step 4: Test the Webhook

**Option A: Send Test Event from Dashboard**
1. Stay on webhook details page
2. Click "Testing" tab
3. Select event: **user.created**
4. Click "Send Test Event"
5. Watch Terminal 1 (dev server) for logs

**Option B: Real Signup**
1. Open browser: http://localhost:3000/sign-up
2. Create a test account:
   - First name: Test
   - Last name: User
   - Email: test@example.com
   - Password: Test1234!
3. Click "Continue"
4. Watch Terminal 1 for webhook logs

---

### Step 5: Inspect Requests (Optional)

**Open ngrok Web Interface:**
```
http://localhost:4040
```

You'll see:
- All incoming requests
- Request headers
- Request body
- Response status
- Response body
- Timing information

**This is EXTREMELY useful for debugging!**

---

## Complete Testing Flow

### Terminal Setup

```
┌────────────────────────────────────────────────────────┐
│  Terminal 1: Dev Server                                │
│  $ npm run dev                                         │
│  ✓ Ready in 1802ms                                     │
│  - Local: http://localhost:3000                        │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Terminal 2: ngrok                                     │
│  $ ngrok http 3000                                     │
│  Forwarding: https://abc123.ngrok.io → localhost:3000 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Browser Tab 1: Your App                               │
│  http://localhost:3000                                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Browser Tab 2: ngrok Inspector                        │
│  http://localhost:4040                                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  Browser Tab 3: Clerk Dashboard                        │
│  https://dashboard.clerk.com                           │
└────────────────────────────────────────────────────────┘
```

---

## Common Issues & Solutions

### Issue 1: ngrok Command Not Found

**Error:**
```bash
$ ngrok http 3000
bash: ngrok: command not found
```

**Solution:**
1. Check if ngrok.exe exists in your folder
2. Run from ngrok folder: `./ngrok http 3000`
3. OR add to PATH (see installation steps above)
4. Restart terminal after adding to PATH

---

### Issue 2: ngrok URL Changes Every Time

**Problem:**
- Free tier gives random URL: `https://random123.ngrok.io`
- Changes on every restart
- Have to update Clerk webhook URL each time

**Solution A: Use Same URL (Paid Plan)**
- Sign up for ngrok account: https://ngrok.com/pricing
- Get static domain: `your-name.ngrok.io`
- Command: `ngrok http --domain=your-name.ngrok.io 3000`

**Solution B: Accept It (Free Tier)**
- Just update Clerk webhook URL each time
- Takes 30 seconds
- Good enough for development

---

### Issue 3: Port Already in Use

**Error:**
```
failed to start tunnel: bind: address already in use
```

**Solution:**
```bash
# Check what's using port 4040 (ngrok web interface)
netstat -ano | findstr :4040

# Kill the process
taskkill //F //PID <PID_NUMBER>

# Or use different port
ngrok http 3000 --web-addr=localhost:4041
```

---

### Issue 4: Tunnel Connection Failed

**Error:**
```
failed to reconnect session: session not found
```

**Solution:**
1. Stop ngrok: `Ctrl+C`
2. Restart ngrok: `ngrok http 3000`
3. Update Clerk webhook URL with NEW ngrok URL

---

### Issue 5: Webhook Still Failing

**Troubleshooting Steps:**

1. **Check ngrok is running**
   ```bash
   # Should see "Session Status: online"
   ```

2. **Verify URL is correct**
   - Clerk webhook: `https://abc123.ngrok.io/api/webhook/clerk`
   - NOT: `http://localhost:3000`
   - NOT: Missing `/api/webhook/clerk` path

3. **Check dev server is running**
   ```bash
   # Terminal 1 should show:
   ✓ Ready in 1802ms
   ```

4. **Test ngrok URL directly**
   ```bash
   # Open browser:
   https://YOUR-NGROK-URL.ngrok.io
   
   # Should see your Next.js app
   ```

5. **Check ngrok inspector**
   ```
   http://localhost:4040
   
   # See if request is reaching ngrok
   # Check response status code
   ```

6. **Check webhook secret**
   ```bash
   # In .env file:
   CLERK_WEBHOOK_SECRET=whsec_...
   
   # Must match Clerk dashboard
   ```

---

## Alternative Tools (If ngrok Doesn't Work)

### 1. Cloudflare Tunnel (Free, Better than ngrok)

**Advantages:**
- Free forever
- No random URLs (stable domain)
- Faster than ngrok
- No time limits

**Installation:**
```bash
# Download cloudflared
# Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Run tunnel
cloudflared tunnel --url http://localhost:3000
```

**You'll get:**
```
https://random.trycloudflare.com
```

---

### 2. localtunnel (npm package)

**Installation:**
```bash
npm install -g localtunnel
```

**Usage:**
```bash
lt --port 3000
```

**You'll get:**
```
https://random-slug.loca.lt
```

---

### 3. Expose (Simple Alternative)

**Installation:**
```bash
npm install -g expose-cli
```

**Usage:**
```bash
expose 3000
```

---

### 4. serveo (No Installation)

**Usage:**
```bash
ssh -R 80:localhost:3000 serveo.net
```

**You'll get:**
```
https://random.serveo.net
```

---

## ngrok Best Practices

### 1. Development Workflow

```bash
# Morning routine:
1. Start dev server: npm run dev
2. Start ngrok: ngrok http 3000
3. Copy ngrok URL
4. Update Clerk webhook URL
5. Test webhook
6. Keep both terminals running all day

# End of day:
1. Stop ngrok: Ctrl+C
2. Stop dev server: Ctrl+C
```

---

### 2. Save ngrok URL

**Keep a file with your current ngrok URL:**
```bash
# current-ngrok-url.txt
https://abc123xyz.ngrok.io

# Update this file when ngrok restarts
# Easy to copy/paste into Clerk dashboard
```

---

### 3. Use ngrok Config File

**Create:** `~/.ngrok2/ngrok.yml`
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN_HERE
tunnels:
  dev:
    proto: http
    addr: 3000
    inspect: true
```

**Run:**
```bash
ngrok start dev
```

---

## Summary Checklist

**Before Testing Webhooks:**
- [ ] Dev server running on port 3000
- [ ] ngrok installed and in PATH
- [ ] ngrok running: `ngrok http 3000`
- [ ] ngrok URL copied: `https://xxx.ngrok.io`
- [ ] Clerk webhook URL updated with ngrok URL
- [ ] Webhook secret in `.env` file
- [ ] Dev server restarted after adding secret

**During Testing:**
- [ ] Watch Terminal 1 for webhook logs
- [ ] Check ngrok inspector: `http://localhost:4040`
- [ ] Check Clerk dashboard webhook logs

**Troubleshooting:**
- [ ] ngrok shows "Session Status: online"
- [ ] Dev server shows "Ready"
- [ ] Can access app via ngrok URL in browser
- [ ] Webhook URL in Clerk has `/api/webhook/clerk` path
- [ ] Webhook secret matches Clerk dashboard

---

## Quick Reference Commands

```bash
# Start dev server
npm run dev

# Start ngrok (basic)
ngrok http 3000

# Start ngrok (with custom domain - paid)
ngrok http --domain=your-name.ngrok.io 3000

# Check ngrok status
curl http://localhost:4040/api/tunnels

# Test webhook locally
curl -X POST http://localhost:3000/api/webhook/clerk \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test via ngrok URL
curl -X POST https://YOUR-NGROK-URL.ngrok.io/api/webhook/clerk \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## Additional Resources

- **ngrok Documentation:** https://ngrok.com/docs
- **ngrok Dashboard:** https://dashboard.ngrok.com
- **Clerk Webhooks Guide:** https://clerk.com/docs/integrations/webhooks
- **Alternative Tools:** https://github.com/anderspitman/awesome-tunneling

---

**🎉 You're now ready to test webhooks with ngrok!**

Remember: 
1. Keep dev server running in Terminal 1
2. Keep ngrok running in Terminal 2
3. Update Clerk webhook URL with ngrok URL
4. Watch the logs and debug!
