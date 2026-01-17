# Option 1: Context-Aware Search Bar in TopBar

## Overview

Keep the TopBar as-is but transform the search bar into a **context-aware, page-specific search** that:
- Shows and functions differently based on the current page
- Connects to existing DataTable filtering on list pages
- Hides on pages that don't have searchable content
- Is modular and easily extensible for future pages

---

## Architecture Design

### Core Concept: Search Context System

```
┌─────────────────────────────────────────────────────────────────┐
│                         TopBar                                  │
│  ┌──────────────────────────────────────────┐  ┌─────────────┐  │
│  │     Context-Aware SearchBar              │  │ User/Theme  │  │
│  │  • Reads route → determines context      │  │ /Notif      │  │
│  │  • Shows placeholder based on page       │  └─────────────┘  │
│  │  • Syncs with DataTable via Zustand      │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Global State)
┌─────────────────────────────────────────────────────────────────┐
│                   useSearchStore (Zustand)                      │
│  • searchTerm: string                                           │
│  • searchContext: 'products' | 'categories' | ... | null        │
│  • setSearchTerm(term)                                          │
│  • setSearchContext(context)                                    │
│  • clearSearch()                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Consumed by)
┌─────────────────────────────────────────────────────────────────┐
│                    DataTable Component                          │
│  • Subscribes to searchTerm from store                          │
│  • Filters table data based on searchKey + searchTerm           │
│  • Syncs both ways (table filter ↔ top bar)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure (New/Modified Files)

```
src/
├── stores/
│   └── search-store.ts              # NEW: Zustand store for search state
├── hooks/
│   └── use-search-context.ts        # NEW: Hook to determine search context
├── components/
│   ├── dashboard/
│   │   ├── top-bar.tsx              # MODIFIED: Use context-aware search
│   │   └── search-bar.tsx           # NEW: Dedicated SearchBar component
│   └── ui/
│       └── data-table.tsx           # MODIFIED: Connect to search store
├── lib/
│   └── search-config.ts             # NEW: Search configuration registry
```

---

## Implementation Guide

### Step 1: Create Search Configuration Registry

**File:** `src/lib/search-config.ts`

This file defines which pages support search and their configuration.

```typescript
/**
 * Search Configuration Registry
 * 
 * Centralized configuration for context-aware search functionality.
 * Add new searchable pages here to automatically enable TopBar search.
 */

export interface SearchConfig {
  /** Route pattern to match (supports dynamic segments like [storeId]) */
  routePattern: RegExp;
  /** Human-readable context name */
  context: string;
  /** Placeholder text for the search input */
  placeholder: string;
  /** The key used by DataTable for filtering */
  searchKey: string;
  /** Keyboard shortcut hint to display */
  shortcutHint?: string;
}

/**
 * Registry of all searchable pages
 * 
 * To add a new searchable page:
 * 1. Add a new entry with the route pattern
 * 2. Specify the searchKey that matches DataTable's searchKey prop
 * 3. The TopBar search will automatically enable for that route
 */
export const SEARCH_CONFIGS: SearchConfig[] = [
  {
    routePattern: /^\/[^/]+\/products$/,
    context: 'products',
    placeholder: 'Search products by name...',
    searchKey: 'name',
    shortcutHint: '⌘K',
  },
  {
    routePattern: /^\/[^/]+\/categories$/,
    context: 'categories',
    placeholder: 'Search categories by name...',
    searchKey: 'name',
    shortcutHint: '⌘K',
  },
  {
    routePattern: /^\/[^/]+\/billboards$/,
    context: 'billboards',
    placeholder: 'Search billboards by label...',
    searchKey: 'label',
    shortcutHint: '⌘K',
  },
  {
    routePattern: /^\/[^/]+\/sizes$/,
    context: 'sizes',
    placeholder: 'Search sizes by name...',
    searchKey: 'name',
    shortcutHint: '⌘K',
  },
  {
    routePattern: /^\/[^/]+\/orders$/,
    context: 'orders',
    placeholder: 'Search orders by phone...',
    searchKey: 'phone',
    shortcutHint: '⌘K',
  },
  {
    routePattern: /^\/[^/]+\/upcoming-products$/,
    context: 'upcoming-products',
    placeholder: 'Search upcoming products by name...',
    searchKey: 'name',
    shortcutHint: '⌘K',
  },
];

/**
 * Find search configuration for a given pathname
 * @param pathname - Current route pathname
 * @returns SearchConfig if found, null if page doesn't support search
 */
export function getSearchConfig(pathname: string): SearchConfig | null {
  return SEARCH_CONFIGS.find(config => config.routePattern.test(pathname)) ?? null;
}

/**
 * Check if a pathname supports search
 * @param pathname - Current route pathname
 */
export function isSearchablePage(pathname: string): boolean {
  return getSearchConfig(pathname) !== null;
}
```

---

### Step 2: Create Zustand Search Store

**File:** `src/stores/search-store.ts`

```typescript
/**
 * Global Search Store
 * 
 * Manages search state across TopBar and DataTable components.
 * Uses Zustand for lightweight, performant global state.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface SearchState {
  /** Current search term entered by user */
  searchTerm: string;
  
  /** Current search context (which page/entity type) */
  searchContext: string | null;
  
  /** The search key used by DataTable (e.g., 'name', 'label', 'phone') */
  searchKey: string | null;
  
  /** Whether the search input is focused */
  isFocused: boolean;
}

interface SearchActions {
  /** Set the search term */
  setSearchTerm: (term: string) => void;
  
  /** Set the search context (called when navigating to a searchable page) */
  setSearchContext: (context: string | null, searchKey?: string | null) => void;
  
  /** Clear search state (called when navigating away or clearing) */
  clearSearch: () => void;
  
  /** Set focus state */
  setFocused: (focused: boolean) => void;
}

type SearchStore = SearchState & SearchActions;

export const useSearchStore = create<SearchStore>()(
  subscribeWithSelector((set) => ({
    // Initial state
    searchTerm: '',
    searchContext: null,
    searchKey: null,
    isFocused: false,
    
    // Actions
    setSearchTerm: (term) => set({ searchTerm: term }),
    
    setSearchContext: (context, searchKey = null) => 
      set({ 
        searchContext: context, 
        searchKey,
        // Clear search term when context changes
        searchTerm: '' 
      }),
    
    clearSearch: () => 
      set({ 
        searchTerm: '', 
        searchContext: null, 
        searchKey: null,
        isFocused: false 
      }),
    
    setFocused: (focused) => set({ isFocused: focused }),
  }))
);

// Selector hooks for optimized re-renders
export const useSearchTerm = () => useSearchStore((state) => state.searchTerm);
export const useSearchContext = () => useSearchStore((state) => state.searchContext);
export const useIsSearchable = () => useSearchStore((state) => state.searchContext !== null);
```

---

### Step 3: Create Search Context Hook

**File:** `src/hooks/use-search-context.ts`

```typescript
/**
 * useSearchContext Hook
 * 
 * Automatically determines and sets the search context based on current route.
 * Should be called in layout or page components to sync search state.
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSearchStore } from '@/stores/search-store';
import { getSearchConfig } from '@/lib/search-config';

/**
 * Hook that syncs route changes with the search store.
 * Call this in the main dashboard layout to enable context-aware search.
 * 
 * @example
 * // In layout.tsx or a client component wrapper
 * function DashboardLayout({ children }) {
 *   useSearchContext(); // Automatically syncs search context with route
 *   return <>{children}</>;
 * }
 */
export function useSearchContext() {
  const pathname = usePathname();
  const setSearchContext = useSearchStore((state) => state.setSearchContext);
  const clearSearch = useSearchStore((state) => state.clearSearch);
  
  useEffect(() => {
    const config = getSearchConfig(pathname);
    
    if (config) {
      // Page supports search - set context
      setSearchContext(config.context, config.searchKey);
    } else {
      // Page doesn't support search - clear
      clearSearch();
    }
    
    // Cleanup on unmount or route change
    return () => {
      // Optional: Clear search when leaving searchable page
      // Uncomment if you want search to reset on navigation
      // clearSearch();
    };
  }, [pathname, setSearchContext, clearSearch]);
}

/**
 * Hook to get current search configuration
 * Useful for components that need to know about search capabilities
 */
export function useCurrentSearchConfig() {
  const pathname = usePathname();
  return getSearchConfig(pathname);
}
```

---

### Step 4: Create SearchBar Component

**File:** `src/components/dashboard/search-bar.tsx`

```typescript
/**
 * Context-Aware Search Bar Component
 * 
 * A smart search input that:
 * - Automatically shows/hides based on current page
 * - Syncs with DataTable filtering
 * - Supports keyboard shortcuts
 * - Shows context-specific placeholder
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSearchStore } from '@/stores/search-store';
import { getSearchConfig } from '@/lib/search-config';
import { AnimatePresence, motion } from 'motion/react';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get search state from store
  const searchTerm = useSearchStore((state) => state.searchTerm);
  const setSearchTerm = useSearchStore((state) => state.setSearchTerm);
  const isFocused = useSearchStore((state) => state.isFocused);
  const setFocused = useSearchStore((state) => state.setFocused);
  
  // Get search config for current page
  const searchConfig = getSearchConfig(pathname);
  const isSearchable = searchConfig !== null;
  
  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if search is available on this page
      if (!isSearchable) return;
      
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Escape to blur search
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur();
        setSearchTerm('');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchable, isFocused, setSearchTerm]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);
  
  // Handle clear button
  const handleClear = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, [setSearchTerm]);
  
  // Don't render if page doesn't support search
  if (!isSearchable || !searchConfig) {
    return null;
  }
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={searchConfig.context}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className={cn('flex-1 max-w-xl', className)}
      >
        <div className="relative">
          {/* Search Icon */}
          <Search 
            className={cn(
              "absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
              isFocused ? "text-gray-600 dark:text-gray-300" : "text-gray-400"
            )} 
          />
          
          {/* Search Input */}
          <Input
            ref={inputRef}
            type="search"
            placeholder={searchConfig.placeholder}
            value={searchTerm}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={cn(
              "w-full rounded-full border-gray-200 dark:border-gray-700",
              "pl-11 pr-20",
              "focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600",
              "transition-all duration-200",
              isFocused && "ring-1 ring-gray-300 dark:ring-gray-600"
            )}
          />
          
          {/* Clear Button (when there's text) or Keyboard Shortcut */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchTerm ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={handleClear}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear search</span>
              </Button>
            ) : (
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 font-mono text-[10px] font-medium text-gray-600 dark:text-gray-400">
                <span className="text-xs">⌘</span>K
              </kbd>
            )}
          </div>
        </div>
        
        {/* Context Indicator (optional - shows what you're searching) */}
        {isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-xs text-gray-500 dark:text-gray-400 pl-4"
          >
            Searching in {searchConfig.context}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

### Step 5: Update TopBar Component

**File:** `src/components/dashboard/top-bar.tsx` (Modified)

```typescript
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { SearchBar } from "./search-bar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* Context-Aware Search Bar */}
        {/* Automatically shows/hides based on current page */}
        <SearchBar />
        
        {/* Spacer when search is hidden */}
        <div className="flex-1" />

        <div className="flex items-center gap-3 ml-6">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications Button */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-gray-950"></span>
          </Button>

          {/* User Profile Button - Clerk's UserButton */}
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-10 w-10"
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
```

---

### Step 6: Update DataTable Component

**File:** `src/components/ui/data-table.tsx` (Modified)

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";

import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { useSearchStore } from '@/stores/search-store';
import { usePathname } from 'next/navigation';
import { isSearchablePage } from '@/lib/search-config';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey: string;
  onRowClick?: (row: TData) => void;
  /** 
   * If true, hides the local search input when TopBar search is active.
   * Defaults to true for searchable pages.
   */
  useGlobalSearch?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  onRowClick,
  useGlobalSearch = true,
}: DataTableProps<TData, TValue>) {
  const pathname = usePathname();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  
  // Global search state from store
  const globalSearchTerm = useSearchStore((state) => state.searchTerm);
  const setGlobalSearchTerm = useSearchStore((state) => state.setSearchTerm);
  
  // Determine if we should use global search (TopBar) or local search
  const isGlobalSearchActive = useGlobalSearch && isSearchablePage(pathname);
  
  // Sync global search term with table filter
  useEffect(() => {
    if (isGlobalSearchActive) {
      // Apply global search term to table filter
      setColumnFilters(
        globalSearchTerm 
          ? [{ id: searchKey, value: globalSearchTerm }]
          : []
      );
    }
  }, [globalSearchTerm, searchKey, isGlobalSearchActive]);
  
  // Local search state (only used when global search is not active)
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  // Handle local search change
  const handleLocalSearchChange = (value: string) => {
    setLocalSearchTerm(value);
    setColumnFilters(value ? [{ id: searchKey, value }] : []);
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  // Sync table filter back to global store (bidirectional sync)
  // This allows filter changes from table to reflect in TopBar
  useEffect(() => {
    if (isGlobalSearchActive) {
      const currentFilter = columnFilters.find(f => f.id === searchKey);
      const filterValue = (currentFilter?.value as string) ?? '';
      
      if (filterValue !== globalSearchTerm) {
        // Only update if different (avoid infinite loop)
        setGlobalSearchTerm(filterValue);
      }
    }
  }, [columnFilters, searchKey, isGlobalSearchActive, globalSearchTerm, setGlobalSearchTerm]);

  return (
    <>
      <div>
        {/* Local Search - Only shown when global search is NOT active */}
        {!isGlobalSearchActive && (
          <div className="flex items-center py-4">
            <Input
              placeholder="Search..."
              value={localSearchTerm}
              onChange={(e) => handleLocalSearchChange(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        
        {/* Global Search Active Indicator (optional) */}
        {isGlobalSearchActive && globalSearchTerm && (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <span>
              Showing results for: <strong>"{globalSearchTerm}"</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGlobalSearchTerm('')}
              className="h-6 px-2 text-xs"
            >
              Clear
            </Button>
          </div>
        )}
        
        {/* Results count when filtered */}
        {(globalSearchTerm || localSearchTerm) && (
          <div className="pb-2 text-sm text-gray-500">
            {table.getFilteredRowModel().rows.length} result(s) found
          </div>
        )}
        
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
```

---

### Step 7: Add Search Context Hook to Layout

**File:** `src/app/(dashboard)/[storeId]/layout.tsx` (or create a client wrapper)

You need to call `useSearchContext()` somewhere in the dashboard layout. Since Next.js layouts are Server Components by default, create a client wrapper:

**File:** `src/components/dashboard/search-context-provider.tsx`

```typescript
/**
 * Search Context Provider
 * 
 * Client component that syncs the search context with the current route.
 * Must be rendered within the dashboard layout.
 */

'use client';

import { useSearchContext } from '@/hooks/use-search-context';

interface SearchContextProviderProps {
  children: React.ReactNode;
}

export function SearchContextProvider({ children }: SearchContextProviderProps) {
  // This hook syncs the search store with the current route
  useSearchContext();
  
  return <>{children}</>;
}
```

Then wrap your dashboard content with this provider in the layout or DashboardShell:

```typescript
// In DashboardShell or layout.tsx
import { SearchContextProvider } from '@/components/dashboard/search-context-provider';

export function DashboardShell({ children, ... }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar ... />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <SearchContextProvider>
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-6 lg:p-8">{children}</div>
          </main>
        </SearchContextProvider>
      </div>
      ...
    </div>
  );
}
```

---

### Step 8: Update Dashboard Index Export

**File:** `src/components/dashboard/index.ts` (Modified)

```typescript
export { Sidebar } from "./sidebar";
export { TopBar } from "./top-bar";
export { DashboardShell } from "./dashboard-shell";
export { SearchBar } from "./search-bar";
export { SearchContextProvider } from "./search-context-provider";
```

---

## Installation Requirements

Zustand must be installed for state management:

```bash
npm install zustand
# or
pnpm add zustand
```

---

## Adding New Searchable Pages (Future Extensibility)

To add search support for a new page, simply add an entry to `SEARCH_CONFIGS` in `src/lib/search-config.ts`:

```typescript
// Example: Adding Colors page search
{
  routePattern: /^\/[^/]+\/colors$/,
  context: 'colors',
  placeholder: 'Search colors by name...',
  searchKey: 'name',
  shortcutHint: '⌘K',
},
```

**That's it!** The TopBar search will automatically:
- Show when the user navigates to `/[storeId]/colors`
- Hide when they navigate away
- Use the correct placeholder and searchKey
- Connect to the DataTable on that page

---

## Visual Behavior Summary

| Page | Search Visible | Placeholder | SearchKey |
|------|----------------|-------------|-----------|
| `/[storeId]` (Dashboard) | ❌ Hidden | - | - |
| `/[storeId]/products` | ✅ Visible | "Search products by name..." | `name` |
| `/[storeId]/categories` | ✅ Visible | "Search categories by name..." | `name` |
| `/[storeId]/billboards` | ✅ Visible | "Search billboards by label..." | `label` |
| `/[storeId]/sizes` | ✅ Visible | "Search sizes by name..." | `name` |
| `/[storeId]/orders` | ✅ Visible | "Search orders by phone..." | `phone` |
| `/[storeId]/upcoming-products` | ✅ Visible | "Search upcoming products..." | `name` |
| `/[storeId]/settings/*` | ❌ Hidden | - | - |
| `/subscription/*` | ❌ Hidden | - | - |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Focus search bar |
| `Escape` | Clear search and unfocus |

---

## Benefits of This Approach

1. **Single Source of Truth**: Search state lives in Zustand store, accessible everywhere
2. **Zero Config for New Pages**: Just add to registry, everything else is automatic
3. **Bidirectional Sync**: TopBar ↔ DataTable always in sync
4. **Clean Separation**: Search logic is separated from UI components
5. **TypeScript Safety**: Full type safety with interfaces and generics
6. **Smooth UX**: Animated transitions between search contexts
7. **Keyboard Accessible**: Full keyboard navigation support
8. **No Breaking Changes**: Existing pages work without modification

---

## Complete File Checklist

| File | Action | Priority |
|------|--------|----------|
| `src/lib/search-config.ts` | CREATE | 1 |
| `src/stores/search-store.ts` | CREATE | 2 |
| `src/hooks/use-search-context.ts` | CREATE | 3 |
| `src/components/dashboard/search-bar.tsx` | CREATE | 4 |
| `src/components/dashboard/search-context-provider.tsx` | CREATE | 5 |
| `src/components/dashboard/top-bar.tsx` | MODIFY | 6 |
| `src/components/ui/data-table.tsx` | MODIFY | 7 |
| `src/components/dashboard/index.ts` | MODIFY | 8 |
| `src/components/dashboard/dashboard-shell.tsx` | MODIFY | 9 |

---

## Testing Checklist

- [ ] Navigate to Products page → Search bar appears with correct placeholder
- [ ] Type in search → DataTable filters results
- [ ] Press `⌘K` → Search bar focuses
- [ ] Press `Escape` → Search clears and unfocuses
- [ ] Navigate to Dashboard → Search bar hides
- [ ] Navigate to Settings → Search bar hides
- [ ] Navigate back to Products → Search bar appears (term cleared)
- [ ] Clear button works when text is entered
- [ ] Results count updates correctly
