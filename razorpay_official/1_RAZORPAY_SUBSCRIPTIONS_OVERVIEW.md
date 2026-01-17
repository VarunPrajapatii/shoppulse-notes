# Razorpay Subscriptions - Official Documentation Part 1: Overview

**Source**: Official Razorpay Documentation  
**Last Updated**: November 22, 2025  
**Documentation Version**: Latest (as provided)

---

## Table of Contents
1. [About Subscriptions](#about-subscriptions)
2. [Availability & Support](#availability--support)
3. [Key Concepts](#key-concepts)
4. [Billing Models](#billing-models)
5. [Getting Started](#getting-started)
6. [Supported Platforms](#supported-platforms)

---

## About Subscriptions

### What are Razorpay Subscriptions?

Razorpay Subscriptions allow you to accept recurring payments from your customers. These recurring payments are:

- **Automated**: No customer intervention required after initial setup
- **Scheduled**: Charged based on a billing cycle that you control
- **Flexible**: Based on a billing model that you define
- **Managed**: Easy to create, manage, and get instant alerts on payment activity

**Key Feature**: Razorpay automatically handles the invoicing for all Subscriptions.

---

## Availability & Support

### Available Regions

✅ **India (IN)**  
✅ **Malaysia (MY)**  
✅ **Singapore (SG)**  
✅ **United States (US)**

### International Payments

- You can use Subscriptions to accept payment in any supported international currencies
- However, settlements are made in INR
- Refer to International Payments documentation for more details

---

## Key Concepts

### Flash Checkout (Mandatory)

**IMPORTANT**: You must enable the Flash Checkout feature from the Dashboard to proceed with Subscriptions.

**How to Enable**:
1. Log in to the Dashboard
2. Click **Account & Settings** in the left menu
3. Click **Flash checkout** under Checkout settings
4. Enable the Flash Checkout feature

### Tokenisation for Card-based Subscriptions

**Compliance Requirement**: To process a subscription, customer card details must be secured/tokenised by applicable laws.

**How it Works**: Razorpay Checkout explicitly collects customer consent for tokenising the card to process e-mandate/subscription transactions.

---

## Billing Models

Razorpay Subscriptions supports three different billing models:

### 1. Fixed Schedule and Fixed Amount

**Use Case**: Standard recurring billing

**Description**: 
- Customer is charged a **fixed amount** at **fixed intervals**
- For a fixed quantity of goods or services

**Implementation**:
- Create a Plan with fixed amount and billing frequency
- Create a Subscription based on this Plan

**Example**: Netflix - ₹499/month for unlimited streaming

---

### 2. Fixed Schedule and Fixed Amount Plus

**Use Case**: Base subscription with add-ons

**Description**:
- Customer is charged a **fixed amount** at **fixed intervals**
- Can avail extra goods/services by paying additional charges

**Implementation**:
- Create a Plan with fixed amount and billing frequency
- Create a Subscription based on this Plan
- Extra goods/services can be added as add-ons to the Subscription

**Example**: Cloud storage - ₹299/month for 100GB + ₹50 per additional 10GB

---

### 3. Fixed Schedule and Variable Amount

**Use Case**: Usage-based billing

**Description**:
- Customer is charged at **fixed intervals**
- Amount varies based on their usage in the defined time interval
- Subscription amount and quantity are NOT fixed

**Implementation**:
- Create a Plan with a minimal fixed amount (can be as low as ₹1.00)
- Set a fixed billing frequency
- Create a Subscription based on this plan
- Charge customer variable amount based on their actual usage

**Example**: AWS - Monthly billing based on actual resource consumption

---

## Getting Started

### Quick Start Steps

**Step 1**: Log in to the Dashboard and click **Subscriptions** under PAYMENT PRODUCTS in the left menu.

**Step 2**: Create a Plan
- A Plan is the base of a Subscription
- Contains all information about services (amount, billing cycle, etc.)

**Step 3**: Create a Subscription
- Done after creating a Plan
- Contains Plan details, start date, number of billing cycles, and other information

---

## Supported Platforms

Razorpay Subscriptions is supported on the following platforms:

### Standard Checkout

| Platform | Support |
|----------|---------|
| Web | ✅ |
| Android | ✅ |
| iOS | ✅ |
| Webview | ✅ |

### Custom Checkout

| Platform | Support |
|----------|---------|
| Web | ✅ |
| Android | ✅ |
| iOS | ✅ |
| Webview | ✅ |

---

## Special Features

### On-demand Feature: Recurring Payments

Razorpay offers an on-demand feature called **Recurring Payments**. 

**What it does**: Lets you manage subsequent payments of your customers and charge them depending on your business requirements.

**How to get it**: Contact Razorpay support team for more information.

---

## Changelog

Discover new features, updates and deprecations related to Razorpay Subscriptions since January 2024.

Refer to the official Subscriptions Changelog for detailed version history.

---

**Next Document**: Part 2 - Workflow & Lifecycle
