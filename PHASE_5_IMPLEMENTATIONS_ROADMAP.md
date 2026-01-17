# 🎯 Next 5-6 Critical Implementations - Detailed Roadmap

**Date:** November 9, 2025  
**Current Status:** Webhook & Cron infrastructure complete, UI/UX layer pending

---

## 📊 Current System Analysis

### ✅ What's Already Implemented:
1. **Database Schema** - Complete with all statuses (ACTIVE, COMPLETING, PAST_DUE, EXPIRED, etc.)
2. **Webhook Handlers** - All 8 Razorpay events (authenticated, charged, halted, completed, cancelled, paused, resumed, pending)
3. **Smart Payment Detection** - Cron job detects failures using `currentPeriodEnd < now` logic
4. **Cron Jobs** - Two crons: expire-trials (with payment failure detection) + expire-completed-subscriptions
5. **Access Control** - Dashboard layout allows PAST_DUE and COMPLETING statuses
6. **Trial System** - Complete trial indicator with countdown

### ⚠️ Critical Gaps (Affecting UX):
1. **No warning banners** - Users with PAST_DUE or COMPLETING status see no alerts
2. **No email notifications** - Silent failures, no communication
3. **No payment update page** - Users can't fix failed payments
4. **No reactivation flow** - Expired users can't easily resubscribe
5. **No renewal reminders** - Users don't know when to renew COMPLETING subscriptions
6. **No admin visibility** - No way to monitor subscription health

---

## 🚀 Priority 1: Subscription Status Banners (CRITICAL - User Awareness)

**Why First:** Users currently have no idea their payment failed or subscription is ending. This is a CRITICAL UX failure.

### Implementation Details:

#### 1A. PAST_DUE Banner (Urgent Payment Failure Warning)
```tsx
// File: src/components/subscription-banners/past-due-banner.tsx

"use client";

import { AlertTriangle, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PastDueBannerProps {
  userEmail: string;
  razorpaySubscriptionId: string | null;
}

export default function PastDueBanner({ 
  userEmail, 
  razorpaySubscriptionId 
}: PastDueBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const router = useRouter();

  if (isDismissed) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 relative animate-pulse-slow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-red-800 font-semibold text-sm mb-1">
              ⚠️ Payment Failed - Action Required
            </h3>
            <p className="text-red-700 text-sm mb-3">
              We couldn't process your payment. We're automatically retrying over the next 5-7 days. 
              To avoid service interruption, please update your payment method immediately.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/subscription/payment-method')}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Update Payment Method
              </button>
              <button
                onClick={() => window.open(`mailto:support@yourapp.com?subject=Payment Issue - ${userEmail}`, '_blank')}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-red-700 px-4 py-2 rounded-md text-sm font-medium border border-red-200 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-red-400 hover:text-red-600 p-1"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
```

#### 1B. COMPLETING Banner (Renewal Reminder)
```tsx
// File: src/components/subscription-banners/completing-banner.tsx

"use client";

import { Info, RefreshCw, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface CompletingBannerProps {
  currentPeriodEnd: Date;
  planName: string;
}

export default function CompletingBanner({ 
  currentPeriodEnd, 
  planName 
}: CompletingBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date().getTime();
      const end = new Date(currentPeriodEnd).getTime();
      const diff = end - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      setDaysRemaining(days > 0 ? days : 0);
    };

    calculateDays();
    const interval = setInterval(calculateDays, 1000 * 60 * 60); // Update hourly

    return () => clearInterval(interval);
  }, [currentPeriodEnd]);

  if (isDismissed) return null;

  const isUrgent = daysRemaining <= 3;
  const bgColor = isUrgent ? "bg-orange-50" : "bg-blue-50";
  const borderColor = isUrgent ? "border-orange-500" : "border-blue-500";
  const textColor = isUrgent ? "text-orange-800" : "text-blue-800";
  const subtextColor = isUrgent ? "text-orange-700" : "text-blue-700";
  const buttonColor = isUrgent 
    ? "bg-orange-600 hover:bg-orange-700" 
    : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`${bgColor} border-l-4 ${borderColor} p-4 relative`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Info className={`h-6 w-6 ${textColor} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <h3 className={`${textColor} font-semibold text-sm mb-1`}>
              Your {planName} subscription cycle is complete
            </h3>
            <p className={`${subtextColor} text-sm mb-3`}>
              Your subscription ends on {format(new Date(currentPeriodEnd), "MMM dd, yyyy")} 
              {daysRemaining > 0 && ` (${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining)`}.
              Renew now to continue using all features without interruption.
            </p>
            <button
              onClick={() => router.push('/subscription/plans')}
              className={`inline-flex items-center gap-2 ${buttonColor} text-white px-4 py-2 rounded-md text-sm font-medium transition-colors`}
            >
              <RefreshCw className="h-4 w-4" />
              Renew Subscription
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className={`${textColor} hover:opacity-70 p-1`}
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
```

#### 1C. Update Dashboard Layout
```tsx
// File: src/app/(dashboard)/[storeId]/layout.tsx
// Add after line 99 (COMPLETING check):

  // Determine which banner to show
  let subscriptionBanner = null;
  
  if (user.subscription.status === 'COMPLETING') {
    subscriptionBanner = (
      <CompletingBanner 
        currentPeriodEnd={user.subscription.currentPeriodEnd}
        planName={user.subscription.plan.name}
      />
    );
  }
  
  if (user.subscription.status === 'PAST_DUE') {
    subscriptionBanner = (
      <PastDueBanner 
        userEmail={user.email}
        razorpaySubscriptionId={user.subscription.razorpaySubscriptionId}
      />
    );
  }

  // Then in return statement, add after Navbar:
  return (
    <>
      <Navbar />
      {subscriptionBanner}
      {trialData && <TrialIndicator trialEndDate={trialData.trialEndDate} />}
      {children}
    </>
  );
```

**Testing Checklist:**
- [ ] Manually set subscription status to PAST_DUE in DB → Check banner appears
- [ ] Manually set status to COMPLETING → Check renewal banner appears
- [ ] Click "Update Payment Method" → Should route to payment page
- [ ] Click "Renew Subscription" → Should route to plans page
- [ ] Dismiss banner → Should hide until page refresh

**Estimated Time:** 3-4 hours

---

## 🚀 Priority 2: Payment Method Update Page (CRITICAL - User Action)

**Why Second:** Users with PAST_DUE need a way to update their payment method immediately.

### Implementation Details:

#### 2A. Create Payment Update Page
```tsx
// File: src/app/(dashboard)/subscription/payment-method/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prismadb from '@/lib/prismadb';
import PaymentMethodForm from './components/payment-method-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard } from 'lucide-react';

export default async function PaymentMethodPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await prismadb.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });

  if (!user || !user.subscription) {
    redirect('/subscription/plans');
  }

  const isPastDue = user.subscription.status === 'PAST_DUE';

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="h-8 w-8 text-gray-700" />
          <h1 className="text-3xl font-bold">Update Payment Method</h1>
        </div>
        <p className="text-gray-600">
          {isPastDue 
            ? "Your payment failed. Update your payment method to restore your subscription."
            : "Update the payment method for your subscription."}
        </p>
      </div>

      {isPastDue && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Action Required:</strong> Your subscription payment failed. 
            Update your payment method below to avoid service interruption.
          </AlertDescription>
        </Alert>
      )}

      <PaymentMethodForm 
        userId={userId}
        subscriptionId={user.subscription.id}
        razorpaySubscriptionId={user.subscription.razorpaySubscriptionId}
        isPastDue={isPastDue}
      />
    </div>
  );
}
```

#### 2B. Payment Method Form Component
```tsx
// File: src/app/(dashboard)/subscription/payment-method/components/payment-method-form.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import Script from "next/script";

interface PaymentMethodFormProps {
  userId: string;
  subscriptionId: string;
  razorpaySubscriptionId: string | null;
  isPastDue: boolean;
}

export default function PaymentMethodForm({ 
  userId, 
  subscriptionId, 
  razorpaySubscriptionId,
  isPastDue
}: PaymentMethodFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUpdatePayment = async () => {
    if (!razorpaySubscriptionId) {
      setError("No active subscription found");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create payment link for updating payment method
      const response = await fetch('/api/subscription/update-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subscriptionId,
          razorpaySubscriptionId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment link');
      }

      const data = await response.json();

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: razorpaySubscriptionId,
        name: "ShopPulse",
        description: "Update Payment Method",
        handler: async function (response: any) {
          // Verify the payment method update
          try {
            const verifyResponse = await fetch('/api/subscription/verify-payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyResponse.ok) {
              router.push('/subscription?updated=true');
              router.refresh();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            setError('Failed to verify payment method. Please try again.');
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false);
          }
        },
        theme: {
          color: "#3b82f6"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('Payment method update error:', err);
      setError('Failed to update payment method. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <CreditCard className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">How it works</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Update Payment Method" below</li>
                <li>Enter your new card details in the secure Razorpay form</li>
                <li>Authorize a ₹1 verification charge (refunded immediately)</li>
                <li>Your subscription will be updated with the new payment method</li>
                {isPastDue && <li className="font-semibold">Payment will be automatically retried within 24 hours</li>}
              </ol>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleUpdatePayment}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Opening Secure Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Update Payment Method
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your payment information is secured by Razorpay and never stored on our servers.
          </p>
        </div>
      </Card>
    </>
  );
}
```

#### 2C. Backend API Endpoints
```typescript
// File: src/app/api/subscription/update-payment-method/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { subscriptionId, razorpaySubscriptionId } = await req.json();

    // Verify subscription belongs to user
    const subscription = await prismadb.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: userId
      }
    });

    if (!subscription) {
      return new NextResponse('Subscription not found', { status: 404 });
    }

    // Create payment link for updating method
    // Razorpay allows updating payment method by creating a new payment
    const paymentLink = await razorpay.subscriptions.fetch(razorpaySubscriptionId);

    return NextResponse.json({
      success: true,
      shortUrl: paymentLink.short_url
    });

  } catch (error) {
    console.error('[UPDATE_PAYMENT_METHOD]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
```

**Testing Checklist:**
- [ ] Access page from PAST_DUE banner link
- [ ] Click "Update Payment Method" → Razorpay modal opens
- [ ] Complete payment → Redirects to success page
- [ ] Check DB: subscription status should update to ACTIVE after webhook

**Estimated Time:** 4-5 hours

---

## 🚀 Priority 3: Email Notification System (HIGH - Communication)

**Why Third:** Users need to know about subscription events, especially payment failures and trial expiry.

### Implementation Details:

#### 3A. Install Email Service (Resend - Recommended)
```bash
npm install resend
npm install react-email @react-email/components
```

Add to `.env`:
```
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourapp.com
```

#### 3B. Email Service Setup
```typescript
// File: src/lib/email-service.ts

import { Resend } from 'resend';
import PaymentFailedEmail from '@/emails/payment-failed';
import TrialExpiringEmail from '@/emails/trial-expiring';
import SubscriptionExpiredEmail from '@/emails/subscription-expired';
import PaymentSuccessEmail from '@/emails/payment-success';
import SubscriptionCompletingEmail from '@/emails/subscription-completing';
import TrialExpiredEmail from '@/emails/trial-expired';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPaymentFailedEmail(
  to: string,
  userName: string,
  nextRetryDate: Date
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: '⚠️ Payment Failed - Action Required',
      react: PaymentFailedEmail({ userName, nextRetryDate })
    });
    console.log(`✅ [EMAIL] Payment failed email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send payment failed email to ${to}:`, error);
  }
}

export async function sendTrialExpiringEmail(
  to: string,
  userName: string,
  trialEndDate: Date,
  daysRemaining: number
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: `Your trial expires in ${daysRemaining} days`,
      react: TrialExpiringEmail({ userName, trialEndDate, daysRemaining })
    });
    console.log(`✅ [EMAIL] Trial expiring email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send trial expiring email to ${to}:`, error);
  }
}

export async function sendTrialExpiredEmail(
  to: string,
  userName: string
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: 'Your trial has ended',
      react: TrialExpiredEmail({ userName })
    });
    console.log(`✅ [EMAIL] Trial expired email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send trial expired email to ${to}:`, error);
  }
}

export async function sendSubscriptionExpiredEmail(
  to: string,
  userName: string
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: 'Your subscription has expired',
      react: SubscriptionExpiredEmail({ userName })
    });
    console.log(`✅ [EMAIL] Subscription expired email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send subscription expired email to ${to}:`, error);
  }
}

export async function sendPaymentSuccessEmail(
  to: string,
  userName: string,
  amount: number,
  nextBillingDate: Date
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: 'Payment successful',
      react: PaymentSuccessEmail({ userName, amount, nextBillingDate })
    });
    console.log(`✅ [EMAIL] Payment success email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send payment success email to ${to}:`, error);
  }
}

export async function sendSubscriptionCompletingEmail(
  to: string,
  userName: string,
  periodEndDate: Date,
  planName: string
) {
  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to,
      subject: 'Time to renew your subscription',
      react: SubscriptionCompletingEmail({ userName, periodEndDate, planName })
    });
    console.log(`✅ [EMAIL] Subscription completing email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send subscription completing email to ${to}:`, error);
  }
}
```

#### 3C. Email Templates (Example: Payment Failed)
```tsx
// File: src/emails/payment-failed.tsx

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section
} from '@react-email/components';
import { format } from 'date-fns';

interface PaymentFailedEmailProps {
  userName: string;
  nextRetryDate: Date;
}

export default function PaymentFailedEmail({
  userName,
  nextRetryDate
}: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>We couldn't process your payment - Action required</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Payment Failed</Heading>
          
          <Text style={text}>Hi {userName},</Text>
          
          <Text style={text}>
            We attempted to charge your payment method for your ShopPulse subscription, 
            but the payment failed.
          </Text>

          <Section style={alertBox}>
            <Text style={alertText}>
              <strong>What happens next?</strong>
            </Text>
            <Text style={alertText}>
              • We'll automatically retry the payment over the next 5-7 days<br />
              • You still have full access to your account during this time<br />
              • If all retries fail, your subscription will be suspended
            </Text>
          </Section>

          <Text style={text}>
            To avoid any service interruption, please update your payment method immediately:
          </Text>

          <Button
            style={button}
            href={`${process.env.NEXT_PUBLIC_APP_URL}/subscription/payment-method`}
          >
            Update Payment Method
          </Button>

          <Text style={textSmall}>
            Next retry: {format(nextRetryDate, 'MMM dd, yyyy')}
          </Text>

          <Text style={textSmall}>
            If you have questions, reply to this email or contact support.
          </Text>

          <Text style={footer}>
            © 2025 ShopPulse. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#dc2626',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 20px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 20px',
};

const textSmall = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0 20px',
};

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '20px auto',
  maxWidth: '280px',
};

const alertBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px',
};

const alertText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  marginTop: '40px',
};
```

#### 3D. Integrate Emails into Cron Jobs
```typescript
// Update: src/app/api/cron/expire-trials/route.ts
// Add after line 98 (trial expiry):

await sendTrialExpiredEmail(subscription.user.email, subscription.user.name || 'there');

// Add after line 184 (payment failure detection):

await sendPaymentFailedEmail(
  subscription.user.email, 
  subscription.user.name || 'there',
  new Date(Date.now() + 24 * 60 * 60 * 1000) // Next retry in 24 hours
);
```

#### 3E. Add Email to Webhooks
```typescript
// Update: src/app/api/webhook/razorpay/subscription/route.ts
// In handleSubscriptionCharged (after PAST_DUE recovery):

if (subscription.status === 'PAST_DUE') {
  // Payment succeeded after failure
  await sendPaymentSuccessEmail(
    subscription.user.email,
    subscription.user.name || 'there',
    subscriptionEntity.plan.amount / 100, // Convert paise to rupees
    new Date(subscriptionEntity.current_end * 1000)
  );
}

// In handleSubscriptionCompleted:

await sendSubscriptionCompletingEmail(
  subscription.user.email,
  subscription.user.name || 'there',
  new Date(subscriptionEntity.current_end * 1000),
  subscription.plan.name
);

// In handleSubscriptionHalted:

await sendSubscriptionExpiredEmail(
  subscription.user.email,
  subscription.user.name || 'there'
);
```

#### 3F. Create Trial Expiry Reminder Cron
```typescript
// File: src/app/api/cron/remind-trial-expiring/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { sendTrialExpiringEmail } from '@/lib/email-service';

/**
 * Runs daily to send reminders for trials expiring in 2 days
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🔄 [CRON] Checking for trials expiring soon...');

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find trials expiring in exactly 2 days (within 24-hour window)
    const expiringTrials = await prismadb.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: {
          gte: twoDaysFromNow,
          lt: threeDaysFromNow
        },
        user: {
          trialUsed: false
        }
      },
      include: {
        user: true
      }
    });

    console.log(`📊 [CRON] Found ${expiringTrials.length} trials expiring in 2 days`);

    for (const subscription of expiringTrials) {
      try {
        await sendTrialExpiringEmail(
          subscription.user.email,
          subscription.user.name || 'there',
          subscription.currentPeriodEnd,
          2
        );

        console.log(`✅ [CRON] Sent trial expiring reminder to ${subscription.user.email}`);
      } catch (error) {
        console.error(`❌ [CRON] Failed to send reminder to ${subscription.user.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent: expiringTrials.length
    });

  } catch (error) {
    console.error('❌ [CRON] Trial reminder job failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send trial reminders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
```

**Testing Checklist:**
- [ ] Test email sending in development (check Resend dashboard)
- [ ] Trigger payment failure → Check email received
- [ ] Trigger trial expiry → Check email received
- [ ] Check email formatting on mobile and desktop
- [ ] Verify all links work correctly

**Estimated Time:** 6-8 hours (includes creating all 6 email templates)

---

## 🚀 Priority 4: Subscription Renewal Reminder Cron (MEDIUM - Proactive)

**Why Fourth:** Users with COMPLETING subscriptions need advance notice to renew before access ends.

### Implementation Details:

```typescript
// File: src/app/api/cron/remind-subscription-expiring/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { sendSubscriptionCompletingEmail } from '@/lib/email-service';

/**
 * Runs daily to send reminders for COMPLETING subscriptions expiring in 7 days
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🔄 [CRON] Checking for subscriptions expiring soon...');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eightDaysFromNow = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

    // Find COMPLETING subscriptions expiring in exactly 7 days
    const expiringSubscriptions = await prismadb.subscription.findMany({
      where: {
        status: 'COMPLETING',
        currentPeriodEnd: {
          gte: sevenDaysFromNow,
          lt: eightDaysFromNow
        }
      },
      include: {
        user: true,
        plan: true
      }
    });

    console.log(`📊 [CRON] Found ${expiringSubscriptions.length} subscriptions expiring in 7 days`);

    for (const subscription of expiringSubscriptions) {
      try {
        await sendSubscriptionCompletingEmail(
          subscription.user.email,
          subscription.user.name || 'there',
          subscription.currentPeriodEnd,
          subscription.plan.name
        );

        console.log(`✅ [CRON] Sent expiry reminder to ${subscription.user.email}`);
      } catch (error) {
        console.error(`❌ [CRON] Failed to send reminder to ${subscription.user.email}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent: expiringSubscriptions.length
    });

  } catch (error) {
    console.error('❌ [CRON] Subscription reminder job failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send subscription reminders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
```

**Vercel Cron Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-trials",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/expire-completed-subscriptions",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/remind-trial-expiring",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/remind-subscription-expiring",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Testing Checklist:**
- [ ] Manually run cron endpoint with auth header
- [ ] Check console logs for correct count
- [ ] Verify email sent to correct users
- [ ] Test with subscription expiring in 7 days (mock DB data)

**Estimated Time:** 2 hours

---

## 🚀 Priority 5: Admin Dashboard - Subscription Health Monitor (MEDIUM - Business Insight)

**Why Fifth:** You need visibility into subscription health (active subs, churned users, MRR, failed payments).

### Implementation Details:

```tsx
// File: src/app/(dashboard)/admin/subscriptions/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prismadb from '@/lib/prismadb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default async function AdminSubscriptionsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // TODO: Add admin check here
  // const user = await prismadb.user.findUnique({ where: { id: userId } });
  // if (!user?.isAdmin) redirect('/');

  // Get subscription statistics
  const [
    activeSubscriptions,
    pastDueSubscriptions,
    completingSubscriptions,
    expiredSubscriptions,
    allSubscriptions,
    recentPayments
  ] = await Promise.all([
    prismadb.subscription.count({ where: { status: 'ACTIVE' } }),
    prismadb.subscription.count({ where: { status: 'PAST_DUE' } }),
    prismadb.subscription.count({ where: { status: 'COMPLETING' } }),
    prismadb.subscription.count({ where: { status: 'EXPIRED' } }),
    prismadb.subscription.findMany({
      include: {
        user: true,
        plan: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    }),
    prismadb.payment.findMany({
      include: {
        user: true
      },
      orderBy: { paidAt: 'desc' },
      take: 20
    })
  ]);

  // Calculate MRR (Monthly Recurring Revenue)
  const activeSubsWithPlans = await prismadb.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true }
  });

  const mrr = activeSubsWithPlans.reduce((total, sub) => {
    let monthlyValue = sub.plan.price.toNumber();
    
    // Convert to monthly if yearly/half-yearly
    if (sub.plan.billingCycle === 'YEARLY') {
      monthlyValue = monthlyValue / 12;
    } else if (sub.plan.billingCycle === 'HALFYEARLY') {
      monthlyValue = monthlyValue / 6;
    }
    
    return total + monthlyValue;
  }, 0);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Subscription Health Monitor</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Healthy subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payment Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pastDueSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completing</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{completingSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(mrr).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* PAST_DUE Alerts */}
      {pastDueSubscriptions > 0 && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {pastDueSubscriptions} Failed Payment{pastDueSubscriptions !== 1 ? 's' : ''} Require Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allSubscriptions
                .filter(sub => sub.status === 'PAST_DUE')
                .map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium">{sub.user.email}</p>
                      <p className="text-sm text-gray-600">{sub.plan.name} - Failed since {sub.updatedAt.toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">₹{sub.plan.price.toNumber()}</p>
                      <p className="text-xs text-gray-500">Period ended {sub.currentPeriodEnd.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Plan</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Period End</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {allSubscriptions.map(sub => (
                  <tr key={sub.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{sub.user.email}</td>
                    <td className="p-2">{sub.plan.name}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        sub.status === 'PAST_DUE' ? 'bg-red-100 text-red-800' :
                        sub.status === 'COMPLETING' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-2">{sub.currentPeriodEnd.toLocaleDateString()}</td>
                    <td className="p-2">₹{sub.plan.price.toNumber()}</td>
                    <td className="p-2">{sub.updatedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Testing Checklist:**
- [ ] Access page and verify stats are correct
- [ ] Check MRR calculation with different plan types
- [ ] Verify PAST_DUE alerts show correctly
- [ ] Test pagination (if needed for large datasets)

**Estimated Time:** 4-5 hours

---

## 🚀 Priority 6: Reactivation Flow for Expired Subscriptions (LOW - User Retention)

**Why Sixth:** Make it easy for expired users to come back and resubscribe.

### Implementation Details:

```tsx
// File: src/app/(dashboard)/subscription/reactivate/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prismadb from '@/lib/prismadb';
import ReactivationFlow from './components/reactivation-flow';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';

export default async function ReactivationPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await prismadb.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Only allow reactivation for expired subscriptions
  if (user.subscription?.status !== 'EXPIRED') {
    redirect('/subscription/plans');
  }

  // Get available plans
  const plans = await prismadb.subscriptionPlan.findMany({
    where: {
      isPublic: true,
      isActive: true,
      name: { not: 'TRIAL' }
    },
    orderBy: { sortOrder: 'asc' }
  });

  const serializedPlans = plans.map(plan => ({
    ...plan,
    price: plan.price.toNumber(),
    priceBeforeDiscount: plan.priceBeforeDiscount.toNumber()
  }));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <RefreshCw className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Reactivate Your Subscription</h1>
        </div>
        <p className="text-gray-600">
          Welcome back! Choose a plan to reactivate your account and continue where you left off.
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800">
          <strong>Good news!</strong> Your store data is still intact. 
          Reactivate now to regain full access to all features.
        </AlertDescription>
      </Alert>

      <ReactivationFlow 
        userId={userId}
        previousPlan={user.subscription.plan}
        plans={serializedPlans}
      />
    </div>
  );
}
```

**Update Dashboard Layout to Show Reactivation Link:**
```tsx
// src/app/(dashboard)/[storeId]/layout.tsx
// Update the expired redirect (line 89):

if (!user.isActive || user.subscription?.status === 'EXPIRED') {
  redirect('/subscription/reactivate');  // Changed from /subscription/plans
}
```

**Testing Checklist:**
- [ ] Set subscription to EXPIRED → Access dashboard → Redirects to reactivation
- [ ] Choose plan → Payment succeeds → Subscription reactivated
- [ ] Check DB: status EXPIRED → ACTIVE, isActive false → true

**Estimated Time:** 3-4 hours

---

## 📊 Implementation Summary

| Priority | Feature | Impact | Estimated Time | Difficulty |
|----------|---------|--------|----------------|------------|
| 1 | Status Banners (PAST_DUE + COMPLETING) | HIGH | 3-4 hours | Easy |
| 2 | Payment Update Page | HIGH | 4-5 hours | Medium |
| 3 | Email Notifications (6 templates) | HIGH | 6-8 hours | Medium |
| 4 | Renewal Reminder Cron | MEDIUM | 2 hours | Easy |
| 5 | Admin Dashboard | MEDIUM | 4-5 hours | Medium |
| 6 | Reactivation Flow | LOW | 3-4 hours | Easy |

**Total Estimated Time:** 22-28 hours (3-4 days of focused work)

---

## 🎯 Recommended Implementation Order

### Week 1 (Critical UX):
1. **Day 1-2:** Implement Priority 1 (Banners) + Priority 2 (Payment Update Page)
   - Users can now see warnings and take action
   - Test thoroughly with mock PAST_DUE status

2. **Day 3-5:** Implement Priority 3 (Email System)
   - Set up Resend account
   - Create all 6 email templates
   - Integrate into webhooks and crons
   - Test email delivery

### Week 2 (Polish & Monitoring):
3. **Day 6:** Implement Priority 4 (Renewal Reminder Cron)
   - Quick implementation
   - Test with mock data

4. **Day 7-8:** Implement Priority 5 (Admin Dashboard)
   - Build monitoring interface
   - Add any additional metrics needed

5. **Day 9:** Implement Priority 6 (Reactivation Flow) - OPTIONAL
   - Can be deferred if time-constrained
   - Nice-to-have for user retention

---

## 🧪 Testing Strategy

### After Each Priority:
1. **Unit Test:** Individual component/API functionality
2. **Integration Test:** Full user flow (e.g., payment fails → banner shows → email sent → payment updated)
3. **Manual QA:** Real user experience testing

### Before Production:
1. Test all cron jobs in production-like environment
2. Verify Razorpay webhooks work correctly
3. Test email delivery to real addresses
4. Load test with multiple concurrent users

---

## 📈 Success Metrics

After implementation, track:
- **Payment Recovery Rate:** % of PAST_DUE that become ACTIVE within 7 days
- **Email Open Rates:** Are users reading notifications?
- **Renewal Rate:** % of COMPLETING users who renew
- **Churn Rate:** % of users who don't renew after COMPLETING
- **Support Tickets:** Should decrease once users have self-service options

---

## 🚨 Production Checklist

Before deploying:
- [ ] Add error monitoring (Sentry, LogRocket)
- [ ] Set up cron job monitoring (alert if jobs fail)
- [ ] Configure email sending limits (Resend rate limits)
- [ ] Add admin role check to admin dashboard
- [ ] Test webhook signature verification
- [ ] Review all error messages (user-friendly)
- [ ] Add loading states to all async operations
- [ ] Test on mobile devices
- [ ] Set up staging environment for final QA
- [ ] Create rollback plan

---

## 💡 Future Enhancements (After Core 6)

**Phase 2 Features:**
1. Payment retry configuration (admin can trigger manual retry)
2. Subscription analytics dashboard (charts, trends, cohort analysis)
3. User communication history (log all emails sent)
4. Proration for plan changes
5. Discount codes / promotional pricing
6. Invoice generation and download
7. Usage-based billing limits
8. Multiple payment methods per user
9. Subscription pause/resume (user-initiated)
10. Annual billing discount automation

---

**Your subscription system is 80% complete. These 6 implementations will take you to production-ready status!** 🎉
