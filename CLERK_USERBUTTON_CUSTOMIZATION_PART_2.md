# Clerk UserButton Complete Customization Guide - Part 2

## Table of Contents (Part 2)

1. [Custom Menu Items](#custom-menu-items)
2. [UserProfile Integration](#userprofile-integration)
3. [Building Custom UI with Clerk Hooks](#building-custom-ui-with-clerk-hooks)
4. [Advanced CSS Customization](#advanced-css-customization)
5. [Localization](#localization)
6. [Complete Real-World Examples](#complete-real-world-examples)

---

## Custom Menu Items

Clerk allows you to add **custom actions and links** to the UserButton dropdown menu.

### Two Approaches

#### 1. Declarative (Recommended) - React Components

```tsx
import { UserButton } from "@clerk/nextjs";

<UserButton>
  <UserButton.MenuItems>
    <UserButton.Action
      label="Help Center"
      labelIcon={<span>❓</span>}
      onClick={() => window.open('/help')}
    />
    
    <UserButton.Link
      label="Settings"
      labelIcon={<span>⚙️</span>}
      href="/settings"
    />
    
    <UserButton.Action
      label="manageAccount"  // Reorder default items
    />
    
    <UserButton.Action
      label="signOut"
    />
  </UserButton.MenuItems>
</UserButton>
```

#### 2. Imperative - Props

```tsx
<UserButton
  customMenuItems={[
    {
      label: 'Help Center',
      icon: <HelpIcon />,
      onClick: () => window.open('/help'),
    },
    {
      label: 'Settings',
      icon: <SettingsIcon />,
      href: '/settings',
    },
  ]}
/>
```

---

### Custom Action Types

#### 1. Custom Action (onClick)

Triggers a function when clicked.

```tsx
<UserButton.Action
  label="Notifications"
  labelIcon={<Bell />}
  onClick={() => {
    // Custom logic
    console.log('Notifications clicked');
    toggleNotifications();
  }}
/>
```

**Props:**
- `label`: Text to display
- `labelIcon`: React element for icon
- `onClick`: Function to execute

---

#### 2. Custom Link (Navigation)

Navigates to a URL.

```tsx
<UserButton.Link
  label="Dashboard"
  labelIcon={<LayoutDashboard />}
  href="/dashboard"
/>

// External link
<UserButton.Link
  label="Help Center"
  labelIcon={<ExternalLink />}
  href="https://help.yoursite.com"
/>
```

**Props:**
- `label`: Text to display
- `labelIcon`: React element for icon
- `href`: URL to navigate to

---

#### 3. Reordering Default Items

Control the order of built-in actions:

```tsx
<UserButton>
  <UserButton.MenuItems>
    {/* Custom items at top */}
    <UserButton.Action
      label="Help"
      labelIcon={<HelpCircle />}
      onClick={() => openHelp()}
    />
    
    {/* Default items - order as you want */}
    <UserButton.Action label="signOut" />      {/* Sign out first */}
    <UserButton.Action label="manageAccount" /> {/* Then manage account */}
  </UserButton.MenuItems>
</UserButton>
```

**Default Action Labels:**
- `"manageAccount"` - Opens user profile
- `"signOut"` - Signs out current session
- `"addAccount"` - Add another account (multi-session only)
- `"signOutAll"` - Sign out all sessions (multi-session only)

---

### Dynamic Menu Items

Menu items can be conditional and stateful:

```tsx
function DynamicUserButton() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { user } = useUser();

  return (
    <UserButton>
      <UserButton.MenuItems>
        {/* Conditional rendering */}
        {user?.publicMetadata?.isAdmin && (
          <UserButton.Link
            label="Admin Panel"
            labelIcon={<Shield />}
            href="/admin"
          />
        )}
        
        {/* Dynamic labels */}
        <UserButton.Action
          label={`Notifications: ${notificationsEnabled ? 'ON' : 'OFF'}`}
          labelIcon={<Bell />}
          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
        />
        
        {/* Show/hide based on state */}
        {notificationsEnabled && (
          <UserButton.Action
            label="View All Notifications"
            labelIcon={<List />}
            onClick={() => router.push('/notifications')}
          />
        )}
        
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
```

---

### Styling Custom Menu Items

Custom items can be styled via `appearance.elements`:

```tsx
<UserButton
  appearance={{
    elements: {
      // All custom items
      userButtonPopoverCustomItemButton: 
        "hover:bg-purple-50 dark:hover:bg-purple-900/20",
      
      // Specific custom item by ID
      "userButtonPopoverCustomItemButton__help": 
        "text-blue-600 font-medium",
      
      // Custom item icon
      userButtonPopoverCustomItemButtonIconBox: 
        "text-purple-500",
    }
  }}
>
  <UserButton.MenuItems>
    <UserButton.Action
      label="Help"
      labelIcon={<HelpCircle />}
      onClick={() => {}}
    />
  </UserButton.MenuItems>
</UserButton>
```

---

## UserProfile Integration

The UserButton can open the `<UserProfile />` component for account management.

### Mode 1: Modal (Default)

Opens in an overlay modal.

```tsx
// No extra setup needed - default behavior
<UserButton />

// With custom appearance for the modal
<UserButton
  userProfileProps={{
    appearance: {
      elements: {
        modalBackdrop: "bg-black/80",
        card: "shadow-2xl",
      }
    }
  }}
/>
```

---

### Mode 2: Navigation (Dedicated Page)

Navigate to a dedicated profile page.

**Step 1: Configure UserButton**

```tsx
<UserButton
  userProfileMode="navigation"
  userProfileUrl="/user-profile"
/>
```

**Step 2: Create Profile Page**

```tsx
// app/user-profile/page.tsx (Next.js App Router)
import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <div className="flex justify-center p-8">
      <UserProfile />
    </div>
  );
}
```

---

### Adding Custom Pages to UserProfile

You can add custom pages to the UserProfile modal/page:

```tsx
<UserButton>
  {/* Custom UserProfile pages */}
  <UserButton.UserProfilePage
    label="Billing"
    labelIcon={<CreditCard />}
    url="billing"
  >
    <BillingPage />
  </UserButton.UserProfilePage>
  
  <UserButton.UserProfilePage
    label="API Keys"
    labelIcon={<Key />}
    url="api-keys"
  >
    <APIKeysPage />
  </UserButton.UserProfilePage>
  
  {/* Custom external link in UserProfile */}
  <UserButton.UserProfileLink
    label="Documentation"
    labelIcon={<Book />}
    url="https://docs.yoursite.com"
  />
</UserButton>
```

---

### UserProfile Appearance

Customize UserProfile appearance from UserButton:

```tsx
<UserButton
  userProfileProps={{
    appearance: {
      elements: {
        // Card container
        card: "rounded-2xl shadow-xl",
        
        // Navbar
        navbar: "bg-gradient-to-r from-purple-500 to-pink-500",
        navbarButton: "text-white hover:text-white/80",
        
        // Profile section
        profileSection: "border-gray-200",
        
        // Form elements
        formButtonPrimary: "bg-purple-600 hover:bg-purple-700",
      }
    }
  }}
/>
```

---

## Building Custom UI with Clerk Hooks

For maximum control, build your own UserButton using Clerk hooks.

### Custom UserButton Example

```tsx
import { useUser, useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

function CustomUserButton() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  
  if (!user) return null;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 hover:opacity-80">
          <Avatar>
            <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
            <AvatarFallback>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {user.fullName || user.primaryEmailAddress?.emailAddress}
          </span>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        {/* User Info Header */}
        <div className="px-2 py-3 border-b">
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-xs text-gray-500">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        
        {/* Custom Menu Items */}
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        {/* Clerk's UserProfile */}
        <DropdownMenuItem onClick={() => openUserProfile()}>
          <User className="mr-2 h-4 w-4" />
          Manage Account
        </DropdownMenuItem>
        
        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={() => signOut(() => router.push('/'))}
          className="text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### Available Clerk Hooks

```typescript
import {
  useUser,      // Current user data
  useClerk,     // Clerk instance methods
  useAuth,      // Auth state
  useSession,   // Current session
} from "@clerk/nextjs";

const { user, isLoaded, isSignedIn } = useUser();
const { signOut, openUserProfile, openSignIn } = useClerk();
const { userId, sessionId, getToken } = useAuth();
const { session } = useSession();
```

---

## Advanced CSS Customization

### Using CSS Classes (Bring Your Own CSS)

Clerk elements have stable CSS classes you can target:

```css
/* styles/clerk.css */

/* Trigger button */
.cl-userButtonTrigger {
  border: 2px solid gold !important;
  transition: all 0.3s ease;
}

.cl-userButtonTrigger:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Avatar */
.cl-userButtonAvatarBox {
  border: 3px solid #7c3aed;
}

/* Popover card */
.cl-userButtonPopoverCard {
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
}

/* Action buttons */
.cl-userButtonPopoverActionButton {
  padding: 12px 16px !important;
  border-radius: 8px !important;
}

.cl-userButtonPopoverActionButton:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}

/* Sign out button specifically */
.cl-userButtonPopoverActionButton__signOut {
  color: #dc2626 !important;
}

.cl-userButtonPopoverActionButton__signOut:hover {
  background: #fee2e2 !important;
}
```

Then import in your app:

```tsx
// app/layout.tsx
import './styles/clerk.css';
```

---

### CSS Class Reference

All available classes:

```
Root & Container:
- .cl-userButton-root
- .cl-rootBox

Trigger:
- .cl-userButtonTrigger
- .cl-userButtonTrigger[data-open]  // When open
- .cl-userButtonBox
- .cl-userButtonAvatarBox
- .cl-userButtonAvatarImage
- .cl-userButtonOuterIdentifier

Popover:
- .cl-userButtonPopoverRootBox
- .cl-userButtonPopoverCard
- .cl-userButtonPopoverMain
- .cl-userButtonPopoverFooter

Actions:
- .cl-userButtonPopoverActions
- .cl-userButtonPopoverActionButton
- .cl-userButtonPopoverActionButton__manageAccount
- .cl-userButtonPopoverActionButton__signOut
- .cl-userButtonPopoverActionButton__addAccount
- .cl-userButtonPopoverActionButton__signOutAll
- .cl-userButtonPopoverActionButtonIcon
- .cl-userButtonPopoverActionButtonIconBox

Custom Items:
- .cl-userButtonPopoverCustomItemButton
- .cl-userButtonPopoverCustomItemButton__[customId]
- .cl-userButtonPopoverCustomItemButtonIconBox
- .cl-userButtonPopoverActionItemButtonIcon
```

---

## Localization

Override any text in the UserButton:

```tsx
<UserButton
  localization={{
    userButton: {
      action__manageAccount: "My Profile",
      action__signOut: "Log Out",
      action__addAccount: "Add Another Account",
      action__signOutAll: "Sign Out Everywhere",
    }
  }}
/>
```

---

### Full Translation Example (Spanish)

```tsx
<UserButton
  localization={{
    userButton: {
      action__manageAccount: "Gestionar Cuenta",
      action__signOut: "Cerrar Sesión",
      action__addAccount: "Agregar Cuenta",
      action__signOutAll: "Cerrar Todas las Sesiones",
      action__openUserMenu: "Abrir menú de usuario",
      action__closeUserMenu: "Cerrar menú de usuario",
    }
  }}
/>
```

---

## Complete Real-World Examples

### Example 1: Sidebar UserButton (Collapsed/Expanded)

```tsx
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface SidebarUserButtonProps {
  isCollapsed: boolean;
}

export function SidebarUserButton({ isCollapsed }: SidebarUserButtonProps) {
  return (
    <UserButton
      showName={!isCollapsed}
      appearance={{
        elements: {
          // Trigger
          userButtonTrigger: cn(
            "w-full",
            "focus:shadow-none focus:ring-0",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "transition-all duration-200",
            isCollapsed ? "justify-center p-2" : "justify-start px-3 py-2 rounded-lg"
          ),
          
          // Avatar
          userButtonAvatarBox: "h-10 w-10",
          
          // Name (when expanded)
          userButtonOuterIdentifier: cn(
            "text-sm font-medium",
            "dark:text-white"
          ),
          
          // Popover positioning
          userButtonPopoverCard: cn(
            "!fixed shadow-2xl",
            isCollapsed 
              ? "!left-[80px]"    // Collapsed
              : "!left-[240px]",  // Expanded
            "!bottom-4 !top-auto"
          ),
          
          // Popover styling
          userButtonPopoverMain: "w-64",
          userButtonPopoverActionButton: 
            "hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md",
        },
        variables: {
          colorPrimary: "#7c3aed",
          borderRadius: "8px",
        }
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Action
          label="Dashboard"
          labelIcon={<LayoutDashboard className="h-4 w-4" />}
          onClick={() => router.push('/dashboard')}
        />
        
        <UserButton.Action
          label="Settings"
          labelIcon={<Settings className="h-4 w-4" />}
          onClick={() => router.push('/settings')}
        />
        
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
```

---

### Example 2: Multi-Session UserButton

Shows all active sessions:

```tsx
<UserButton
  appearance={{
    elements: {
      // When multiple sessions
      userButtonPopoverActions: "border-t border-gray-200",
      
      // Session switcher styling
      userButtonPopoverActionButton__addAccount: 
        "text-purple-600 hover:bg-purple-50",
      userButtonPopoverActionButton__signOutAll:
        "text-red-600 hover:bg-red-50",
    }
  }}
>
  <UserButton.MenuItems>
    <UserButton.Action
      label="View All Sessions"
      labelIcon={<Users />}
      onClick={() => router.push('/sessions')}
    />
    <UserButton.Action label="addAccount" />
    <UserButton.Action label="signOutAll" />
  </UserButton.MenuItems>
</UserButton>
```

---

### Example 3: Branded UserButton

Full custom branding:

```tsx
<UserButton
  appearance={{
    baseTheme: dark,
    variables: {
      // Brand colors
      colorPrimary: "#FF6B6B",
      colorTextOnPrimaryBackground: "#FFFFFF",
      colorBackground: "#1A1A2E",
      colorText: "#EAEAEA",
      colorTextSecondary: "#9CA3AF",
      
      // Typography
      fontFamily: "'Poppins', sans-serif",
      fontSize: "14px",
      fontWeight: {
        normal: 400,
        medium: 500,
        bold: 600,
      },
      
      // Rounded design
      borderRadius: "16px",
    },
    elements: {
      // Gradient trigger
      userButtonTrigger: 
        "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700",
      
      // Glassmorphism popover
      userButtonPopoverCard: `
        backdrop-blur-xl bg-white/10 
        border border-white/20 
        shadow-2xl
      `,
      
      // Action buttons
      userButtonPopoverActionButton: `
        hover:bg-white/10 
        transition-all duration-200
        text-white
      `,
    }
  }}
/>
```

---

### Example 4: Minimal UserButton (No Popover, Direct Navigation)

```tsx
import { useClerk, useUser } from "@clerk/nextjs";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

function MinimalUserButton() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  
  if (!user) return null;
  
  return (
    <button 
      onClick={() => openUserProfile()}
      className="hover:opacity-80 transition-opacity"
      aria-label="Open user profile"
    >
      <Avatar className="h-10 w-10 ring-2 ring-purple-500">
        <AvatarImage src={user.imageUrl} />
      </Avatar>
    </button>
  );
}
```

---

## Summary: What You Can Customize

### Position
✅ Place anywhere in your component tree  
✅ Control popover position via `appearance.elements.userButtonPopoverCard`  
✅ Perfect for sidebar, header, or floating placement

### Appearance
✅ Prebuilt themes (`dark`, `neobrutalism`, etc.)  
✅ Variables (colors, fonts, spacing, shadows)  
✅ Element-specific styles (all parts customizable)  
✅ CSS classes with stable selectors  

### Behavior
✅ Show/hide name next to avatar  
✅ Default open state  
✅ Navigation mode (modal vs dedicated page)  
✅ Redirect URLs after actions  

### Menu
✅ Add custom actions (onClick handlers)  
✅ Add custom links (navigation)  
✅ Reorder default items  
✅ Dynamic/conditional menu items  
✅ Custom icons and labels  

### UserProfile
✅ Modal or navigation mode  
✅ Custom pages within profile  
✅ External links  
✅ Full appearance customization  

### Advanced
✅ Build completely custom UI with hooks  
✅ Localization (translate all text)  
✅ Multi-session support  
✅ Dark mode themes  

---

## Need More Help?

- **Clerk Docs**: https://clerk.com/docs
- **Theme Editor**: https://clerk.com/components/theme-editor
- **Discord Support**: https://clerk.com/discord
- **Examples Repo**: https://github.com/clerk/javascript
