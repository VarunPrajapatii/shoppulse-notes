# ShopPulse Color System Implementation

## ✅ Complete Tailwind CSS Custom Classes

All colors are now implemented as proper Tailwind CSS utility classes that automatically switch between light and dark modes.

---

## 🎨 Color Classes Reference

### Primary Colors (Gradient)

| Class | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `bg-primary-gradient-from` | `#FF6A00` | `#FF7A1A` | Gradient start |
| `bg-primary-gradient-to` | `#FF2E63` | `#FF4D7D` | Gradient end |
| `bg-primary` | `#FF4D4D` | `#FF5E5E` | Solid primary |
| `text-primary` | `#FF4D4D` | `#FF5E5E` | Primary text |
| `border-primary` | `#FF4D4D` | `#FF5E5E` | Primary borders |

**Common Usage:**
```tsx
// Gradient backgrounds
<div className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to" />

// Gradient text
<h1 className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to bg-clip-text text-transparent" />

// Solid primary
<button className="bg-primary text-white" />
```

### Secondary & Accent

| Class | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `bg-secondary` | `#FFD166` | `#FFDC7F` | Secondary background |
| `text-secondary` | `#FFD166` | `#FFDC7F` | Secondary text |
| `bg-accent` | `#06B6D4` | `#22D3EE` | Accent background |
| `text-accent` | `#06B6D4` | `#22D3EE` | Accent text |
| `border-accent` | `#06B6D4` | `#22D3EE` | Accent borders |

**Common Usage:**
```tsx
// Secondary button
<button className="bg-secondary text-secondary-foreground" />

// Accent highlights
<span className="text-accent" />

// Accent borders
<div className="border-2 border-accent" />
```

### Background Colors

| Class | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `bg-background` | `#FFFFFF` | `#0A0A0A` | Main background |
| `bg-surface` | `#F9FAFB` | `#1A1A1A` | Cards, sections |
| `bg-surface-hover` | `#F3F4F6` | `#252525` | Hover states |

**Common Usage:**
```tsx
// Main container
<div className="bg-background" />

// Card
<div className="bg-surface rounded-xl p-6" />

// Hover effect
<button className="hover:bg-surface-hover" />
```

### Text Colors

| Class | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `text-text-primary` | `#1E293B` | `#F8FAFC` | Main text |
| `text-text-secondary` | `#64748B` | `#CBD5E1` | Secondary text |
| `text-text-muted` | `#94A3B8` | `#94A3B8` | Muted text |

**Common Usage:**
```tsx
// Headings
<h1 className="text-text-primary" />

// Body text
<p className="text-text-secondary" />

// Helper text
<span className="text-text-muted" />
```

### Border Colors

| Class | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `border-border` | `#E2E8F0` | `#2D3748` | Standard borders |
| `border-border-focus` | `#06B6D4` | `#22D3EE` | Focus states |

**Common Usage:**
```tsx
// Card border
<div className="border border-border" />

// Focus ring
<input className="focus:border-border-focus" />
```

---

## 🔤 Font Classes

| Class | Font | Usage |
|-------|------|-------|
| `font-primary` | Poppins | Headings, buttons |
| `font-secondary` | Nunito | Body text, paragraphs |
| `font-special` | Handlee | Logo, taglines |

**Common Usage:**
```tsx
// Heading
<h1 className="font-primary font-bold" />

// Body text
<p className="font-secondary" />

// Logo
<span className="font-special" />
```

---

## 📁 Implementation Details

### 1. **globals.css** Configuration

```css
@theme inline {
  /* Light mode colors */
  --color-primary-gradient-from: #FF6A00;
  --color-primary-gradient-to: #FF2E63;
  --color-primary: #FF4D4D;
  --color-secondary: #FFD166;
  --color-accent: #06B6D4;
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-surface-hover: #F3F4F6;
  --color-text-primary: #1E293B;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;
  --color-border: #E2E8F0;
  --color-border-focus: #06B6D4;
  
  /* Dark mode overrides via @media */
  @media (prefers-color-scheme: dark) {
    --color-primary-gradient-from: #FF7A1A;
    --color-primary-gradient-to: #FF4D7D;
    --color-primary: #FF5E5E;
    --color-secondary: #FFDC7F;
    --color-accent: #22D3EE;
    --color-background: #0A0A0A;
    --color-surface: #1A1A1A;
    --color-surface-hover: #252525;
    --color-text-primary: #F8FAFC;
    --color-text-secondary: #CBD5E1;
    --color-text-muted: #94A3B8;
    --color-border: #2D3748;
    --color-border-focus: #22D3EE;
  }
  
  /* Font families */
  --font-primary: var(--font-primary);
  --font-secondary: var(--font-secondary);
  --font-special: var(--font-special);
}

/* Dark mode class overrides (for manual toggle) */
.dark {
  --color-primary-gradient-from: #FF7A1A;
  --color-primary-gradient-to: #FF4D7D;
  --color-primary: #FF5E5E;
  --color-secondary: #FFDC7F;
  --color-accent: #22D3EE;
  --color-background: #0A0A0A;
  --color-surface: #1A1A1A;
  --color-surface-hover: #252525;
  --color-text-primary: #F8FAFC;
  --color-text-secondary: #CBD5E1;
  --color-text-muted: #94A3B8;
  --color-border: #2D3748;
  --color-border-focus: #22D3EE;
}
```

### 2. **layout.tsx** Font Configuration

```tsx
import { Poppins, Nunito, Handlee } from "next/font/google";

const poppins = Poppins({
  variable: "--font-primary",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-secondary",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const handlee = Handlee({
  variable: "--font-special",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

// Applied to body
className={`${poppins.variable} ${nunito.variable} ${handlee.variable}`}
```

---

## 🔄 Migration Summary

### Before (Hardcoded):
```tsx
// ❌ Old way - hardcoded hex values
<div className="bg-[#FF6A00] dark:bg-[#FF7A1A]" />
<p className="text-[#64748B] dark:text-[#CBD5E1]" />
<button className="bg-gradient-to-r from-[#FF6A00] to-[#FF2E63]" />
```

### After (Tailwind Classes):
```tsx
// ✅ New way - semantic Tailwind classes
<div className="bg-primary-gradient-from" />
<p className="text-text-secondary" />
<button className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to" />
```

---

## 📦 Updated Components

### ✅ Completed:
- `src/components/landing/navbar.tsx`
- `src/components/landing/hero-section.tsx`
- `src/components/landing/features-section.tsx`
- `src/components/landing/product-showcase-section.tsx`
- `src/components/landing/pricing-section.tsx`

---

## 💡 Benefits

### 1. **Semantic Class Names**
- `bg-primary` is clearer than `bg-[#FF4D4D]`
- Easier to understand component structure
- Self-documenting code

### 2. **Automatic Dark Mode**
- No need for `dark:` prefix everywhere
- Colors automatically switch based on theme
- Single source of truth

### 3. **Easy to Maintain**
- Change color once in `globals.css`
- Updates everywhere automatically
- No find-and-replace needed

### 4. **Better Performance**
- Smaller bundle size (no repeated hex values)
- Tailwind can optimize better
- Faster compilation

### 5. **Type Safety**
- Invalid class names caught at build time
- Autocomplete in IDE
- Intellisense support

---

## 🎯 Usage Examples

### Hero Section Pattern
```tsx
<section className="bg-gradient-to-br from-background to-surface">
  <h1 className="font-primary text-text-primary">
    <span className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to bg-clip-text text-transparent">
      Gradient Text
    </span>
  </h1>
  <p className="font-secondary text-text-secondary">Body text</p>
  <button className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to text-white">
    CTA Button
  </button>
</section>
```

### Card Pattern
```tsx
<div className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover">
  <h3 className="font-primary text-text-primary">Title</h3>
  <p className="font-secondary text-text-secondary">Description</p>
  <span className="text-text-muted">Helper text</span>
</div>
```

### Button Patterns
```tsx
// Primary gradient button
<button className="bg-gradient-to-r from-primary-gradient-from to-primary-gradient-to text-white">
  Primary Action
</button>

// Accent button
<button className="border-2 border-accent text-accent hover:bg-accent/10">
  Secondary Action
</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground">
  Tertiary Action
</button>
```

---

## 🚀 Next Steps

### To Change Colors:
1. Open `src/app/globals.css`
2. Find the color variable (e.g., `--color-primary`)
3. Change the hex value
4. Save - all components update automatically!

### To Add New Colors:
1. Add to `@theme inline` block in `globals.css`
2. Add dark mode variant in `@media` and `.dark` block
3. Use the new class name (e.g., `bg-new-color`)

### To Add New Fonts:
1. Import from `next/font/google` in `layout.tsx`
2. Add CSS variable to `@theme inline` block
3. Create utility class in `globals.css`
4. Use new class (e.g., `font-new-font`)

---

## ✨ Result

Your ShopPulse landing page now uses:
- ✅ Semantic, maintainable color classes
- ✅ Automatic dark mode switching
- ✅ Next.js optimized Google Fonts
- ✅ Single source of truth for colors
- ✅ Professional, scalable design system

**All components are now using proper Tailwind classes instead of hardcoded hex values!** 🎉
