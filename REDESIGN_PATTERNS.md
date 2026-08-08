# UI/UX Redesign - Pattern Implementation Guide

**Purpose:** Systematic patterns and guidelines for applying the redesign to all remaining pages.

## Design System - Already Implemented ✅

### Utilities Available (globals.css)
- `.page-container` - Full-height page wrapper
- `.page-header` - Page title area styling
- `.page-title`, `.page-description` - Typography for headers
- `.section` - Vertical spacing between sections
- `.section-header`, `.section-title` - Section headers
- `.data-grid`, `.data-grid-2` - Responsive grids
- `.card-base`, `.card-hover` - Card styling with hover
- `.form-section`, `.form-group`, `.form-label`, `.form-error` - Form utilities
- `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info` - Status badges
- `.table-container`, `.table-header`, `.table-row-hover` - Table utilities
- `.empty-state`, `.empty-state-icon`, `.empty-state-title` - Empty state
- `.skeleton` - Loading placeholder
- `.responsive-hidden`, `.mobile-only` - Responsive helpers

### Components Available
- **PageHeader** - Title + breadcrumbs + actions
- **EmptyState** - Icon + title + description + CTA
- **LoadingState** - Spinner + text
- **SkeletonCard**, **SkeletonTable** - Loading placeholders

## Patterns for Common Page Types

### Pattern 1: List/Table Pages (Conversations, Products, Coupons, etc.)

```tsx
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default async function ListPage() {
  const data = await fetchData();

  return (
    <div className="page-container">
      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with title + create button */}
        <PageHeader
          title="Item List"
          description="Manage all items"
          breadcrumbs={[
            { label: "Home", href: "/stores/[projectId]" },
            { label: "Items" },
          ]}
          actions={<Button>Create Item</Button>}
        />

        {/* Table or Card List */}
        <div className="section">
          {data.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="No items yet"
              description="Create your first item to get started."
              action={{
                label: "Create Item",
                onClick: () => router.push("/create"),
              }}
            />
          ) : (
            <div className="table-container">
              {/* shadcn/ui Table component */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 2: Settings Pages

```tsx
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="page-container">
      <div className="container max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Settings"
          description="Manage your account and workspace settings"
        />

        {/* Setting Sections */}
        <div className="section space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form fields */}
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Manage your subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Billing info */}
            </CardContent>
          </Card>

          {/* Advanced Section */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced</CardTitle>
              <CardDescription>Advanced options for power users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Advanced options */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 3: Detail/Edit Pages

```tsx
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default async function DetailPage({ params }: Props) {
  const item = await fetchItem(params.id);

  return (
    <div className="page-container">
      <div className="container max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={item.name}
          description={item.description}
          breadcrumbs={[
            { label: "Items", href: "/items" },
            { label: item.name },
          ]}
          actions={<Button>Edit</Button>}
        />

        {/* Content Sections */}
        <div className="section">
          <h2 className="section-title">Overview</h2>
          <Card>
            {/* Item details */}
          </Card>
        </div>

        <div className="section">
          <h2 className="section-title">Activity</h2>
          {/* Activity feed */}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 4: Form Pages

```tsx
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function FormPage() {
  return (
    <div className="page-container">
      <div className="container max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Create New Item"
          description="Fill out the form below to create a new item"
          breadcrumbs={[
            { label: "Items", href: "/items" },
            { label: "Create" },
          ]}
        />

        <form className="section">
          {/* Form Section 1 */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input type="text" />
                <p className="form-description">Enter the item name</p>
              </div>
            </div>
          </div>

          {/* Form Section 2 */}
          <div className="form-section">
            <h3 className="section-title">Additional Details</h3>
            <div className="space-y-4">
              {/* More fields */}
            </div>
          </div>

          {/* Form Actions */}
          <div className="button-group justify-end">
            <Button variant="outline">Cancel</Button>
            <Button type="submit">Create Item</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Typography & Spacing Rules

### Always Apply These

```tsx
// Page structure
<div className="page-container">
  <div className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
    {/* content */}
  </div>
</div>

// Section spacing
<div className="section">
  <h2 className="section-title">Section Title</h2>
  {/* content */}
</div>

// Grid layouts
<div className="data-grid">     {/* 1-3 columns responsive */}
<div className="data-grid-2">   {/* 1-2 columns responsive */}

// Cards
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
</Card>
```

### Avoid

```tsx
// ❌ Don't use arbitrary padding/margins
<div className="p-8">
  <div className="mb-16">

// ❌ Don't mix inconsistent card styles
<div className="border rounded p-4">
<div className="border-2 rounded-lg p-8">

// ❌ Don't skip section headers
<div>
  <div className="space-y-6">
    {/* content without title */}
```

## Component Consistency Rules

### Forms
- Always wrap in `.form-section` or `.form-group`
- Use `.form-label` for labels
- Use `.form-description` for help text
- Use `.form-error` for error messages
- Group related fields with `.form-section`

### Tables
- Wrap in `.table-container` for consistent styling
- Use shadcn/ui Table component
- Apply `.table-row-hover` to rows
- Sortable columns should have visual indicator
- Include filter/search if > 10 rows

### Cards
- Use shadcn/ui Card component
- Apply `.card-hover` for interactive cards
- Use CardHeader + CardTitle + CardDescription consistently
- Never skip CardDescription when helpful

### Buttons
- Use shadcn/ui Button component
- Icons should have `mr-2` spacing before text
- Destructive actions use `variant="destructive"`
- Group buttons with `.button-group`

### Status Badges
- Use semantic classes: `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`
- Never use arbitrary colors for status

## Animations (Framer Motion)

Apply Framer Motion selectively:

```tsx
import { motion } from "framer-motion";

// Sidebar/drawer transitions (200ms)
<motion.aside animate={{ width }} transition={{ duration: 0.2 }}>

// Dialog fade-in (150ms)
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>

// Indicator animation
<motion.div layoutId="indicator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

// Badge animations
<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} />
```

**Keep animations fast:** 100-250ms
**Avoid:** Excessive floating, bouncing, parallax, long transitions

## Responsive Design Rules

```tsx
// Mobile first - default rules apply to all
<div className="space-y-4 sm:space-y-6 lg:space-y-8">

// Hide on mobile
<div className="hidden md:block">

// Show mobile only
<div className="md:hidden">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Responsive container widths
<div className="container max-w-7xl px-4 sm:px-6 lg:px-8">
```

## Accessibility Checklist

For every page, verify:
- [ ] Semantic HTML (proper headings, labels on inputs)
- [ ] Focus states visible (2px outline)
- [ ] Tab order logical (not jumping around)
- [ ] `aria-label` on icon-only buttons
- [ ] Color contrast WCAG AA minimum
- [ ] Touch targets 44px minimum
- [ ] Form errors associated with inputs
- [ ] Modals have `role="dialog"` and `aria-labelledby`

## Next Steps to Apply Pattern

For each remaining page:

1. **Identify page type** - List, Settings, Detail, Form, Dashboard
2. **Apply appropriate pattern** - Use template above
3. **Replace old styling** - Remove arbitrary CSS, use utilities
4. **Add PageHeader** - Title + breadcrumbs + actions
5. **Apply design tokens** - Colors, spacing, typography from system
6. **Test responsive** - All breakpoints
7. **Accessibility check** - Keyboard nav, focus, contrast
8. **Verify functionality** - All actions still work

## Files to Reference

- Design system: `src/app/globals.css`
- Components: `src/components/page-header.tsx`, `empty-state.tsx`, `loading-state.tsx`
- shadcn/ui: `src/components/ui/`
- App shell: `src/components/app-shell.tsx` (reference for Framer Motion usage)
- Dashboard example: `src/app/dashboard/page.tsx` (reference implementation)

---

**Apply this guide systematically to all remaining 75+ pages for consistent, professional UX.**
