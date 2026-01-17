# Clerk Customization Guide

## Overview
This guide explains how to customize Clerk components in the ShopPulse Admin application, including the UserButton, SignIn, and SignUp components.

**Documentation Source:** Official Clerk Docs (Last Updated: Nov 21, 2025)  
**Clerk Version:** @clerk/nextjs ^6.32.0 (Core 2)

---

## Table of Contents
1. [UserButton Customization](#userbutton-customization)
2. [SignIn/SignUp Component Customization](#signin-signup-component-customization)
3. [Global Styling Options](#global-styling-options)
4. [Element Reference](#element-reference)
5. [Examples](#examples)

---

## UserButton Customization

### Changing Position

The `<UserButton />` is just a React component - move it anywhere in your JSX:

**Current Location:** `src/components/navbar.tsx`
```tsx
<div className="ml-auto flex items-center space-x-4">
  <ThemeToggle />
  <UserButton afterSignOutUrl="/" />
</div>
```

**Example: Move to Left Side**
```tsx
<div className="flex items-center space-x-4">
  <UserButton afterSignOutUrl="/" />
  <MainNav className="mx-6" />
  <div className="ml-auto">
    <ThemeToggle />
  </div>
</div>
```

### Styling the Dropdown

You can customize the dropdown (popover) that appears when clicking the UserButton:

#### Method 1: Using the `appearance` Prop
```tsx
<UserButton 
  afterSignOutUrl="/"
  appearance={{
    elements: {
      userButtonBox: "custom-class",
      userButtonAvatarBox: "custom-class",
      userButtonPopoverCard: "shadow-2xl rounded-xl border-2", // The dropdown card
      userButtonPopoverActionButton: "hover:bg-blue-50", // Action buttons in dropdown
      userButtonPopoverActionButtonText: "text-gray-700",
      userButtonPopoverActionButtonIcon: "text-blue-500",
      userButtonPopoverFooter: "bg-gray-50",
    },
    variables: {
      colorPrimary: '#6366f1',
      borderRadius: '0.75rem',
    }
  }}
/>
```

#### Method 2: Global CSS
Add to `src/app/globals.css`:
```css
.cl-userButtonPopoverCard {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
  border: 2px solid #e5e7eb;
}

.cl-userButtonPopoverActionButton:hover {
  background-color: #f3f4f6;
}

.cl-userButtonPopoverActionButtonText {
  color: #374151;
  font-weight: 500;
}
```

---

## SignIn/SignUp Component Customization

### Current Implementation
**Location:** `src/app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx`

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <SignIn 
            afterSignInUrl="/api/auth/post-auth"
            afterSignUpUrl="/api/auth/post-auth"
        />
    );
}
```

### Three Ways to Customize

#### 1. Using `appearance` Prop (Recommended)

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <SignIn 
            afterSignInUrl="/api/auth/post-auth"
            afterSignUpUrl="/api/auth/post-auth"
            appearance={{
                elements: {
                    // Card container
                    card: "shadow-2xl rounded-2xl border border-gray-200",
                    
                    // Header
                    headerTitle: "text-2xl font-bold text-gray-900",
                    headerSubtitle: "text-gray-600",
                    
                    // Form elements
                    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg",
                    formFieldInput: "rounded-lg border-gray-300 focus:border-indigo-500",
                    formFieldLabel: "text-gray-700 font-medium",
                    
                    // Social buttons
                    socialButtonsBlockButton: "border-gray-300 hover:bg-gray-50",
                    
                    // Footer
                    footer: "hidden", // Hide if needed
                    footerActionLink: "text-indigo-600 hover:text-indigo-700",
                },
                variables: {
                    colorPrimary: '#6366f1',
                    colorBackground: '#ffffff',
                    colorInputBackground: '#ffffff',
                    colorInputText: '#1f2937',
                    borderRadius: '0.75rem',
                    fontFamily: 'Poppins, sans-serif',
                },
                layout: {
                    socialButtonsPlacement: 'bottom', // 'top' or 'bottom'
                    socialButtonsVariant: 'blockButton', // 'blockButton' or 'iconButton'
                    logoPlacement: 'inside', // 'inside' or 'outside'
                    showOptionalFields: true,
                }
            }}
        />
    );
}
```

#### 2. Using Tailwind Classes

First, configure `ClerkProvider` in `src/app/layout.tsx`:
```tsx
<ClerkProvider
  appearance={{
    cssLayerName: 'clerk',
  }}
>
  {/* ... */}
</ClerkProvider>
```

Then in your Sign-In page:
```tsx
<SignIn 
  appearance={{
    elements: {
      formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 rounded-xl py-3',
      card: 'shadow-2xl rounded-2xl',
      formFieldInput: 'rounded-lg border-2 focus:ring-2 focus:ring-indigo-500',
    }
  }}
  afterSignInUrl="/api/auth/post-auth"
  afterSignUpUrl="/api/auth/post-auth"
/>
```

#### 3. Global CSS Styling

Add to `src/app/globals.css`:
```css
/* SignIn/SignUp Card */
.cl-card {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  border-radius: 1.5rem;
  border: 1px solid #e5e7eb;
}

/* Primary Button */
.cl-formButtonPrimary {
  background-color: #6366f1;
  font-size: 16px;
  font-weight: 600;
  border-radius: 0.75rem;
  padding: 12px 24px;
  text-transform: none;
}

.cl-formButtonPrimary:hover,
.cl-formButtonPrimary:focus,
.cl-formButtonPrimary:active {
  background-color: #4f46e5;
}

/* Input Fields */
.cl-formFieldInput {
  border-radius: 0.75rem;
  border: 2px solid #e5e7eb;
  padding: 12px 16px;
  font-size: 14px;
}

.cl-formFieldInput:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Header */
.cl-headerTitle {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.cl-headerSubtitle {
  color: #6b7280;
  font-size: 14px;
}

/* Social Buttons */
.cl-socialButtonsBlockButton {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 12px;
}

.cl-socialButtonsBlockButton:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}

/* Footer Links */
.cl-footerActionLink {
  color: #6366f1;
  font-weight: 500;
}

.cl-footerActionLink:hover {
  color: #4f46e5;
}
```

### Customizing the Page Layout

Wrap the Clerk component with custom HTML/CSS:

```tsx
export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-black opacity-20"></div>
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md p-8">
        {/* Custom Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to ShopPulse
          </h1>
          <p className="text-white/80">
            Sign in to manage your store
          </p>
        </div>
        
        {/* Clerk SignIn Component */}
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-2xl bg-white/95 backdrop-blur",
            },
          }}
          afterSignInUrl="/api/auth/post-auth"
          afterSignUpUrl="/api/auth/post-auth"
        />
        
        {/* Custom Footer */}
        <div className="text-center mt-6">
          <p className="text-white/70 text-sm">
            © 2025 ShopPulse. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Global Styling Options

### Apply to All Clerk Components

Configure in `src/app/layout.tsx`:

```tsx
<ClerkProvider
  appearance={{
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#ffffff',
      colorInputBackground: '#ffffff',
      colorInputText: '#1f2937',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      borderRadius: '0.75rem',
    },
    // Customize specific components globally
    signIn: {
      variables: {
        colorPrimary: '#3b82f6',
      }
    },
    signUp: {
      variables: {
        colorPrimary: '#10b981',
      }
    },
    userButton: {
      elements: {
        userButtonPopoverCard: 'shadow-2xl',
      }
    }
  }}
>
  {/* ... */}
</ClerkProvider>
```

---

## Element Reference

### Common Elements for SignIn/SignUp

| Element Key | Description |
|------------|-------------|
| `card` | Main container card |
| `rootBox` | Outermost wrapper |
| `header` | Header section |
| `headerTitle` | Main heading text |
| `headerSubtitle` | Subtitle text |
| `formButtonPrimary` | Primary submit button |
| `formFieldInput` | Input fields |
| `formFieldLabel` | Input labels |
| `formFieldInputShowPasswordButton` | Show/hide password toggle |
| `socialButtonsBlockButton` | Social login buttons (full width) |
| `socialButtonsIconButton` | Social login buttons (icon only) |
| `footer` | Footer section |
| `footerActionLink` | Links in footer |
| `dividerLine` | Separator line |
| `dividerText` | "Or" text between sections |
| `identityPreview` | Email/phone preview |
| `formResendCodeLink` | Resend code link |
| `otpCodeFieldInput` | OTP input fields |

### UserButton Elements

| Element Key | Description |
|------------|-------------|
| `userButtonBox` | Outer container |
| `userButtonAvatarBox` | Avatar container |
| `userButtonAvatarImage` | Avatar image |
| `userButtonPopoverCard` | Dropdown card |
| `userButtonPopoverActionButton` | Action buttons in dropdown |
| `userButtonPopoverActionButtonText` | Button text |
| `userButtonPopoverActionButtonIcon` | Button icons |
| `userButtonPopoverFooter` | Footer in dropdown |

### Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `colorPrimary` | Primary brand color | `#6c47ff` |
| `colorBackground` | Card background | `#ffffff` |
| `colorForeground` | Text color | `#000000` |
| `colorInputBackground` | Input background | `#ffffff` |
| `colorInputText` | Input text color | `#000000` |
| `borderRadius` | Border radius | `0.375rem` |
| `fontFamily` | Font family | `inherit` |
| `fontSize` | Base font size | `0.8125rem` |

---

## Examples

### Example 1: Modern Gradient Theme

```tsx
// In sign-in/page.tsx
<SignIn 
  appearance={{
    elements: {
      card: "shadow-2xl border-0 bg-white/90 backdrop-blur-sm",
      headerTitle: "text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent",
      headerSubtitle: "text-gray-600",
      formButtonPrimary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700",
      formFieldInput: "border-2 border-gray-200 focus:border-indigo-500",
      socialButtonsBlockButton: "border-2 border-gray-200 hover:border-indigo-300",
    },
    variables: {
      borderRadius: '1rem',
    }
  }}
  afterSignInUrl="/api/auth/post-auth"
/>
```

### Example 2: Dark Mode Theme

```tsx
<SignIn 
  appearance={{
    elements: {
      card: "bg-gray-900 border border-gray-800 shadow-2xl",
      headerTitle: "text-white",
      headerSubtitle: "text-gray-400",
      formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
      formFieldInput: "bg-gray-800 border-gray-700 text-white focus:border-indigo-500",
      formFieldLabel: "text-gray-300",
      footer: "text-gray-400",
      footerActionLink: "text-indigo-400 hover:text-indigo-300",
      socialButtonsBlockButton: "bg-gray-800 border-gray-700 text-white hover:bg-gray-750",
    },
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#111827',
      colorInputBackground: '#1f2937',
      colorInputText: '#ffffff',
    }
  }}
  afterSignInUrl="/api/auth/post-auth"
/>
```

### Example 3: Minimal Clean Theme

```tsx
<SignIn 
  appearance={{
    elements: {
      card: "shadow-sm border border-gray-200",
      headerTitle: "text-2xl font-semibold text-gray-900",
      formButtonPrimary: "bg-gray-900 hover:bg-gray-800 rounded-md",
      formFieldInput: "rounded-md border-gray-300",
      socialButtonsBlockButton: "border border-gray-300 rounded-md",
    },
    variables: {
      colorPrimary: '#000000',
      borderRadius: '0.375rem',
    },
    layout: {
      socialButtonsPlacement: 'bottom',
    }
  }}
  afterSignInUrl="/api/auth/post-auth"
/>
```

### Example 4: Custom UserButton with Styled Dropdown

```tsx
// In navbar.tsx
<UserButton 
  afterSignOutUrl="/"
  appearance={{
    elements: {
      userButtonAvatarBox: "w-10 h-10 ring-2 ring-indigo-500 ring-offset-2",
      userButtonPopoverCard: "shadow-2xl rounded-xl border-2 border-gray-100 p-4",
      userButtonPopoverActionButton: "rounded-lg hover:bg-indigo-50 transition-colors",
      userButtonPopoverActionButtonText: "text-gray-700 font-medium",
      userButtonPopoverActionButtonIcon: "text-indigo-600",
      userButtonPopoverFooter: "bg-gray-50 rounded-lg p-3 mt-2",
    },
    variables: {
      colorPrimary: '#6366f1',
    }
  }}
/>
```

---

## Inspecting Elements

To find element class names for customization:

1. Open your app in the browser
2. Right-click on the Clerk component element you want to style
3. Select "Inspect" or "Inspect Element"
4. Look for classes starting with `cl-` (before the 🔒️ lock icon)
5. Use these class names (without the `cl-` prefix) in the `elements` prop

Example:
```
Class in inspector: cl-formButtonPrimary cl-button 🔒️ cl-internal-1ta0xpz

Use in code:        formButtonPrimary: "your-custom-classes"
```

---

## Tips and Best Practices

1. **Use Tailwind with cssLayerName**: Set `cssLayerName: 'clerk'` in ClerkProvider to ensure Tailwind utilities override Clerk's default styles

2. **Combine Methods**: You can mix `appearance` prop, global CSS, and custom wrapper styling

3. **Theme Consistency**: Use your app's existing CSS variables/Tailwind config for consistent theming

4. **Dark Mode**: Use Clerk's variables with CSS custom properties for automatic dark mode support

5. **Test Responsiveness**: Clerk components are responsive by default, but test your custom styles on mobile

6. **Don't Override Internal Classes**: Only modify classes before the 🔒️ lock icon in the inspector

7. **Use Layout Options**: The `layout` prop handles common UI patterns without CSS

---

## Additional Resources

- [Clerk Appearance Prop Docs](https://clerk.com/docs/customization/overview)
- [Clerk Variables Reference](https://clerk.com/docs/customization/variables)
- [Clerk Layout Options](https://clerk.com/docs/customization/layout)
- [UserButton Customization](https://clerk.com/docs/customization/user-button)

---

**Last Updated:** November 30, 2025  
**Project:** ShopPulse Admin  
**Clerk Version:** @clerk/nextjs ^6.32.0
