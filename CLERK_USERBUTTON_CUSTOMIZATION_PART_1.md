# Clerk UserButton Complete Customization Guide - Part 1

## Overview

The Clerk `<UserButton />` component is a pre-built React component that displays the current user's avatar and provides a dropdown menu for account management and sign-out. This guide covers **everything you can customize** about it.

---

## Table of Contents (Part 1)

1. [Basic Props](#basic-props)
2. [Positioning & Placement](#positioning--placement)
3. [Appearance Customization](#appearance-customization)
4. [Element Customization](#element-customization)
5. [Variables (Design Tokens)](#variables-design-tokens)

---

## Basic Props

### All Available Props

```typescript
interface UserButtonProps {
  // Navigation & Mode
  userProfileUrl?: string;
  userProfileMode?: 'modal' | 'navigation';
  
  // Display Options
  showName?: boolean;
  defaultOpen?: boolean;
  
  // Callbacks
  afterSignOutUrl?: string;
  afterSwitchSessionUrl?: string;
  afterMultiSessionSingleSignOutUrl?: string;
  
  // Customization
  appearance?: AppearanceProps;
  userProfileProps?: UserProfileProps;
  customMenuItems?: CustomMenuItem[];
  
  // Advanced/Experimental
  __experimental_asStandalone?: boolean;
  __experimental_asProvider?: boolean;
}
```

---

### 1. `showName` - Display Username/Email

Shows the user's name next to the avatar.

```typescript
// Hide name (default) - just avatar
<UserButton />

// Show name next to avatar
<UserButton showName={true} />
```

**Result:**
- `false` (default): Just the circular avatar
- `true`: Avatar + "John Doe" or email displayed inline

---

### 2. `defaultOpen` - Initially Expanded

Opens the popover immediately on mount.

```typescript
// Popover closed initially (default)
<UserButton />

// Popover open on mount
<UserButton defaultOpen={true} />
```

**Use Case:** Debugging, showing user menu immediately

---

### 3. `afterSignOutUrl` - Redirect After Sign Out

Where to redirect user after clicking "Sign Out".

```typescript
// Redirect to homepage after sign out
<UserButton afterSignOutUrl="/" />

// Redirect to custom goodbye page
<UserButton afterSignOutUrl="/goodbye" />

// Redirect to external URL
<UserButton afterSignOutUrl="https://yoursite.com" />
```

**Default:** Usually redirects to your sign-in page

---

### 4. `userProfileMode` & `userProfileUrl`

Controls where "Manage Account" opens.

#### Mode: `modal` (default)

Opens `<UserProfile />` in a modal overlay.

```typescript
<UserButton userProfileMode="modal" />
```

**Behavior:**
- Clicking "Manage Account" → Modal opens on top of current page
- User stays on same page
- Modal has backdrop

#### Mode: `navigation`

Navigates to a dedicated profile page.

```typescript
<UserButton 
  userProfileMode="navigation"
  userProfileUrl="/user-profile"
/>
```

**Behavior:**
- Clicking "Manage Account" → Navigates to `/user-profile`
- You must render `<UserProfile />` at that route

**Example Setup:**

```tsx
// In your app layout/router
<UserButton 
  userProfileMode="navigation"
  userProfileUrl="/user-profile"
/>

// At /user-profile route
import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return <UserProfile />;
}
```

---

## Positioning & Placement

### Moving UserButton Anywhere

The `<UserButton />` is **completely portable**. You can place it anywhere in your component tree:

```tsx
// Top-right corner (typical)
<header className="flex justify-end">
  <UserButton />
</header>

// Sidebar
<aside className="sidebar">
  <nav>...</nav>
  <div className="user-section">
    <UserButton />
  </div>
</aside>

// Inside a dropdown menu
<DropdownMenu>
  <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>
      <UserButton />
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Floating bottom-right
<div className="fixed bottom-4 right-4">
  <UserButton />
</div>
```

---

### Controlling Popover Position

When you move UserButton to different locations (especially sidebar), you may need to adjust where the dropdown opens.

#### Using `appearance.elements`

```typescript
<UserButton
  appearance={{
    elements: {
      // Popover positioning
      userButtonPopoverCard: "left-full ml-2 bottom-0",
      
      // Alternative: Fixed positioning
      userButtonPopoverCard: "!fixed !left-[240px] !bottom-4",
      
      // Right-side (for sidebar)
      userButtonPopoverCard: {
        left: 'calc(100% + 8px)', // 8px gap from trigger
        top: 'auto',
        bottom: 0,
      },
    }
  }}
/>
```

#### For Sidebar Placement

When in a **left sidebar**, you want the popover to open to the **right**:

```typescript
<UserButton
  appearance={{
    elements: {
      // Opens to the right of the sidebar
      userButtonPopoverCard: "left-full ml-2",
      
      // Collapsed sidebar (narrower)
      userButtonPopoverCard: "!fixed !left-[80px]", // when collapsed
      userButtonPopoverCard: "!fixed !left-[240px]", // when expanded
    }
  }}
/>
```

---

## Appearance Customization

The `appearance` prop is your main customization tool. It accepts:

### Structure

```typescript
appearance={{
  baseTheme: dark | neobrutalism | shadesOfPurple,  // Prebuilt themes
  layout: { ... },                                   // Layout config
  variables: { ... },                                // Design tokens
  elements: { ... },                                 // Element-specific styles
}}
```

---

### 1. `baseTheme` - Prebuilt Themes

Clerk provides several prebuilt themes:

```typescript
import { dark } from "@clerk/themes";

<UserButton
  appearance={{
    baseTheme: dark
  }}
/>
```

**Available Themes:**

| Theme | Import | Description |
|-------|--------|-------------|
| `dark` | `@clerk/themes` | Dark mode theme |
| `neobrutalism` | `@clerk/themes` | Bold, brutalist design |
| `shadesOfPurple` | `@clerk/themes` | Purple-themed |

**Combining Themes:**

```typescript
import { dark, neobrutalism } from "@clerk/themes";

<UserButton
  appearance={{
    baseTheme: [dark, neobrutalism] // Dark + brutalist
  }}
/>
```

---

### 2. `layout` - Layout Configuration

Controls structural layout of the popover.

```typescript
<UserButton
  appearance={{
    layout: {
      // Popover width
      cardBox: {
        width: '300px',
      },
      
      // Animation settings
      animations: true,
      
      // Branding
      showOptionalFields: false,
    }
  }}
/>
```

---

## Element Customization

The `elements` prop lets you target **specific parts** of the UserButton and apply custom styles or classes.

### Available Elements for UserButton

```typescript
appearance={{
  elements: {
    // Root & Container
    rootBox: "...",                    // Outermost container
    cardBox: "...",                    // Main card wrapper
    
    // Trigger Button
    userButtonTrigger: "...",          // The clickable avatar button
    userButtonBox: "...",              // Container inside trigger
    userButtonAvatarBox: "...",        // Avatar wrapper
    userButtonAvatarImage: "...",      // Avatar <img> element
    userButtonOuterIdentifier: "...",  // Name text (when showName=true)
    
    // Popover
    userButtonPopoverRootBox: "...",   // Popover root
    userButtonPopoverCard: "...",      // Popover card
    userButtonPopoverMain: "...",      // Main content area
    userButtonPopoverFooter: "...",    // Footer area
    
    // Menu Actions
    userButtonPopoverActions: "...",            // Actions container
    userButtonPopoverActionButton: "...",       // Individual action button
    userButtonPopoverActionButtonIcon: "...",   // Action icon
    userButtonPopoverActionButtonIconBox: "...", // Icon wrapper
    
    // Custom Menu Items
    userButtonPopoverCustomItemButton: "...",        // Custom menu item
    userButtonPopoverCustomItemButtonIconBox: "...", // Custom item icon box
    userButtonPopoverActionItemButtonIcon: "...",    // Custom item icon
  }
}
```

---

### Element Customization Methods

#### 1. Add CSS Classes

```typescript
<UserButton
  appearance={{
    elements: {
      userButtonTrigger: "hover:scale-105 transition-transform",
      userButtonAvatarBox: "ring-2 ring-purple-500",
      userButtonPopoverCard: "shadow-2xl rounded-2xl",
    }
  }}
/>
```

#### 2. Inline Styles (Object)

```typescript
<UserButton
  appearance={{
    elements: {
      userButtonTrigger: {
        backgroundColor: '#000',
        padding: '8px',
        borderRadius: '50%',
      },
      userButtonPopoverCard: {
        minWidth: '320px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      },
    }
  }}
/>
```

#### 3. Combined (Classes + Styles)

```typescript
<UserButton
  appearance={{
    elements: {
      userButtonTrigger: {
        className: "my-custom-trigger",
        style: {
          border: '2px solid gold',
        },
      },
    }
  }}
/>
```

---

### Targeting Specific States

Some elements support state-specific targeting:

```typescript
<UserButton
  appearance={{
    elements: {
      // Target "open" state
      "userButtonTrigger[data-open]": {
        backgroundColor: '#333',
      },
      
      // Target specific action buttons
      "userButtonPopoverActionButton__manageAccount": "text-blue-500",
      "userButtonPopoverActionButton__signOut": "text-red-500",
    }
  }}
/>
```

**Available Action IDs:**
- `__manageAccount` - "Manage account" button
- `__signOut` - "Sign out" button
- `__addAccount` - "Add account" (multi-session)
- `__signOutAll` - "Sign out of all accounts"

---

### Example: Sidebar-Optimized UserButton

```typescript
<UserButton
  showName={!isCollapsed}
  appearance={{
    elements: {
      // Trigger button
      userButtonTrigger: cn(
        "focus:shadow-none focus:ring-0",
        "hover:opacity-80 transition-opacity",
        isCollapsed && "justify-center w-10 h-10"
      ),
      
      // Avatar sizing
      userButtonAvatarBox: "h-10 w-10",
      
      // Name text (when expanded)
      userButtonOuterIdentifier: "text-sm font-medium",
      
      // Popover positioning for sidebar
      userButtonPopoverCard: cn(
        "!fixed shadow-xl",
        isCollapsed 
          ? "!left-[80px]"   // Collapsed sidebar
          : "!left-[230px]", // Expanded sidebar
        "!bottom-4",
        "!top-auto"
      ),
      
      // Popover content width
      userButtonPopoverMain: "w-64",
      
      // Action buttons
      userButtonPopoverActionButton: 
        "hover:bg-gray-100 dark:hover:bg-gray-800",
    }
  }}
/>
```

---

## Variables (Design Tokens)

Variables let you customize **colors, spacing, fonts, and other design tokens** globally across the UserButton.

### Structure

```typescript
appearance={{
  variables: {
    // Colors
    colorPrimary: "#000000",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorTextOnPrimaryBackground: "#ffffff",
    colorDanger: "#ff0000",
    colorSuccess: "#00ff00",
    colorWarning: "#ffaa00",
    
    // Typography
    fontSize: "16px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    // Spacing
    spacingUnit: "1rem",
    borderRadius: "0.5rem",
    
    // Shadows
    shadowShimmer: "0 2px 4px rgba(0,0,0,0.1)",
  }
}}
```

---

### Complete Variables List

```typescript
variables: {
  // === COLORS ===
  // Primary
  colorPrimary: string,
  colorTextOnPrimaryBackground: string,
  
  // Text
  colorText: string,
  colorTextSecondary: string,
  
  // Backgrounds
  colorBackground: string,
  colorBackgroundSecondary: string,
  
  // Borders
  colorInputBackground: string,
  colorInputText: string,
  
  // States
  colorDanger: string,
  colorSuccess: string,
  colorWarning: string,
  colorAlphaShade: string,
  
  // === TYPOGRAPHY ===
  fontSize: string,
  fontFamily: string,
  fontFamilyButtons: string,
  fontWeight: {
    normal: number,
    medium: number,
    semibold: number,
    bold: number,
  },
  
  // === LAYOUT ===
  spacingUnit: string,
  borderRadius: string,
  
  // === SHADOWS ===
  shadowShimmer: string,
}
```

---

### Example: Custom Theme Variables

```typescript
<UserButton
  appearance={{
    variables: {
      // Purple theme
      colorPrimary: '#7c3aed',
      colorTextOnPrimaryBackground: '#ffffff',
      colorText: '#1f2937',
      colorTextSecondary: '#6b7280',
      colorBackground: '#ffffff',
      colorBackgroundSecondary: '#f3f4f6',
      colorDanger: '#dc2626',
      
      // Typography
      fontFamily: "'Inter', sans-serif",
      fontSize: '14px',
      fontWeight: {
        normal: 400,
        medium: 500,
        bold: 700,
      },
      
      // Rounded design
      borderRadius: '12px',
      
      // Soft shadows
      shadowShimmer: '0 4px 12px rgba(124, 58, 237, 0.15)',
    }
  }}
/>
```

---

### Dark Mode with Variables

```typescript
import { dark } from "@clerk/themes";

<UserButton
  appearance={{
    baseTheme: dark,
    variables: {
      // Override dark theme colors
      colorPrimary: '#a78bfa', // Lighter purple for dark mode
      colorBackground: '#1f2937',
      colorText: '#f3f4f6',
      colorTextSecondary: '#9ca3af',
      borderRadius: '8px',
    }
  }}
/>
```

---

## Next: Part 2

Part 2 will cover:
- Custom Menu Items (Actions, Links, Pages)
- UserProfile Integration
- Advanced Customization (CSS, Localization)
- Real-World Examples
- Complete Sidebar Integration Example
