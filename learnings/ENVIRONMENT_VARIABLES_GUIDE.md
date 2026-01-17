# Professional Environment Variable Management

## How It Works

### NODE_ENV (Automatic - Don't Set Manually!)
Next.js **automatically** sets `NODE_ENV` based on the command:
- `npm run dev` → `NODE_ENV=development` 
- `npm run build` → `NODE_ENV=production`
- `npm start` → `NODE_ENV=production`

**You never need to set NODE_ENV yourself.**

---

## File Structure

```
.env.example       # Template (commit to git)
.env               # Shared defaults (commit to git)
.env.local         # Your local secrets (git-ignored)
.env.development   # Dev-only overrides (git-ignored)
.env.production    # Prod-only (not needed - use Vercel)
```

---

## Load Order (Priority)

Next.js loads files in this order (later files override earlier):

1. `.env` (base defaults)
2. `.env.local` (local overrides - **highest priority**)
3. `.env.development` or `.env.production` (based on NODE_ENV)
4. `.env.development.local` or `.env.production.local`

**In practice, you only need:**
- `.env` - Shared safe values
- `.env.local` - Your local secrets

---

## Current Setup

### ✅ .env (Committed to Git)
```env
# Safe placeholder values only
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_key_here"
DATABASE_URL="postgresql://localhost:5432/db"
```

**Purpose:** Template for team members, safe defaults

### ✅ .env.local (Git-Ignored)
```env
# Your real local values
DATABASE_URL="postgresql://varun:mysecretpassword@localhost:5432/cmsadmindb"
CLERK_SECRET_KEY="sk_test_..."
```

**Purpose:** Your actual development credentials

### ✅ .env.example (Git-Ignored)
```env
# Documentation for new developers
# Shows what variables are needed
```

**Purpose:** Onboarding guide for new team members

---

## How Auto-Create Uses This

### In Development (`npm run dev`)
```typescript
if (process.env.NODE_ENV === 'development') {
  // Uses DATABASE_URL from .env.local (local Docker)
  // Auto-creates users from Clerk API
}
```

### In Production (Vercel)
```typescript
else {
  // Uses DATABASE_URL from Vercel env vars (Neon)
  // Relies on webhooks for user creation
}
```

---

## Commands & Environments

| Command | NODE_ENV | Database | Behavior |
|---------|----------|----------|----------|
| `npm run dev` | development | Local Docker | Auto-create users |
| `npm run build` | production | Neon (if testing) | Webhook mode |
| Vercel deploy | production | Neon | Webhook mode |

---

## Best Practices

### ✅ DO:
- Use `.env.local` for all local secrets
- Commit `.env.example` as a template
- Use Vercel dashboard for production secrets
- Let Next.js manage NODE_ENV automatically

### ❌ DON'T:
- Set NODE_ENV manually
- Comment/uncomment DATABASE_URL
- Commit `.env.local` to git
- Put real secrets in `.env`

---

## Migration Steps (Completed)

1. ✅ Created `.env.example` (template)
2. ✅ Created `.env.local` (your local secrets)
3. ✅ Updated `.env` (safe defaults only)
4. ✅ Verified `.gitignore` includes `.env*`

---

## Testing

### Verify Local Environment:
```bash
npm run dev
```
**Expected:**
- Connects to `localhost:5432` (Docker)
- Auto-creates users from Clerk API
- Console shows: `🔧 [DEV MODE] User not found, creating...`

### Verify Production Build:
```bash
npm run build
```
**Expected:**
- Uses production database URL (if set in Vercel)
- Expects webhooks for user creation
- No auto-create logs

---

## Troubleshooting

### "Can't connect to database"
- Check Docker is running: `docker ps`
- Verify `.env.local` has correct DATABASE_URL
- Run: `npx prisma db push` (sync schema)

### "User not found in production"
- Check Clerk webhook is configured
- Verify CLERK_WEBHOOK_SECRET in Vercel
- Test webhook endpoint: `/api/webhook/clerk`

### "Wrong database in dev"
- Delete `.env.development` if it exists
- `.env.local` should override everything
- Restart dev server

---

## Next Steps

1. **Test Local Setup:**
   ```bash
   npm run dev
   # Sign up with new user
   # Check console for auto-create logs
   ```

2. **Verify Database:**
   ```bash
   npx prisma studio
   # Check user was created
   ```

3. **Update Team:**
   - Share `.env.example` 
   - Document setup in README
   - Add to onboarding guide

---

## Production Deployment

Vercel automatically:
- Sets `NODE_ENV=production`
- Uses environment variables from dashboard
- Ignores `.env.local` (not in git)

**No manual configuration needed!**
