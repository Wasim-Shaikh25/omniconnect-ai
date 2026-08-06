# TASK-0092: Complete End-to-End UI/UX Redesign Implementation

- **Status:** In Progress
- **Owner:** Claude / Design Team
- **Requirement:** `docs/requirements/REQ-0092-ui-ux-redesign.md`
- **Tracker:** `docs/trackers/TRACKER-0092-ui-ux-redesign.md`
- **Module(s):** presentation (pages, layouts), components
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — REQ-0092 Complete End-to-End UI/UX Redesign: Established unified design system, redesigned global navigation/shell, and systematically updated all pages/components with consistent typography, spacing, colors, responsive design, accessibility, and purposeful micro-interactions. All business logic preserved; application now feels like a premium, modern SaaS product.
- **Last updated:** 2026-08-06

## 1. Summary

Systematically redesign every user-facing component and page in OmniConnect AI using a cohesive design system. Work follows the master audit → design system → global shell → page-by-page approach, with emphasis on:

1. Establishing a unified design language
2. Redesigning the global application structure
3. Systematically updating all pages while preserving functionality
4. Implementing responsive design
5. Ensuring accessibility
6. Adding purposeful micro-interactions
7. Performing comprehensive visual and functional QA

## 2. References

- Architecture: `docs/specs/current-state.md`
- Requirement: `docs/requirements/REQ-0092-ui-ux-redesign.md`
- Tracker: `docs/trackers/TRACKER-0092-ui-ux-redesign.md`
- Design tools: shadcn/ui, 21st.dev MCP, Framer Motion, UI/UX Pro Max Skill

## 3. Implementation Plan

### Phase 1: Audit & Inventory

**Step 1A — Complete Application Audit**

Inspect entire codebase structure:

```bash
# Audit key directories
ls -la src/app/                           # All routes
ls -la src/components/                    # All components
ls -la src/modules/*/presentation/        # Feature modules
```

Build complete inventory of:
- All authenticated routes
- All unauthenticated routes
- All page components
- All shared components
- All layouts
- All states (loading, error, empty, success)
- All forms
- All tables/data-dense screens
- All dialogs/modals
- All navigation elements

**Step 1B — Understand Current Component Usage**

Analyze existing:
- shadcn/ui usage (which components, customization)
- Framer Motion usage (if any)
- TailwindCSS customization
- Global styles
- Component structure
- Layout structure
- Form patterns
- Table patterns
- Responsiveness approach

**Step 1C — Document Application Workflows**

Trace key user workflows:
- Registration → Onboarding → Dashboard
- Create Project → Configure
- Connect Meta/Shopify
- Create Content → Publish
- View Analytics
- Invite Team Member
- Change Settings
- Manage Billing
- Support ticket workflow

### Phase 2: Design System Establishment

**Step 2A — Typography System**

Define and apply consistent typography:

```ts
// src/styles/typography.ts or similar
// Define scale with clear hierarchy:
// - Display (44px, bold)
// - Page Title (32px, bold)
// - Section Title (24px, semibold)
// - Card Title (18px, semibold)
// - Body Large (16px, normal)
// - Body (14px, normal)
// - Small (12px, normal)
// - Caption (11px, normal, muted)
```

Apply consistently across:
- Page titles
- Section headers
- Card titles
- Form labels
- Table headers
- Button text
- Body text
- Captions

Do NOT use random font sizes.

**Step 2B — Spacing System**

Establish predictable spacing scale:

```ts
// Use standard scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
// Apply consistently to:
// - Page padding (typically 24px or 32px)
// - Section gaps (24px)
// - Card padding (16px or 20px)
// - Form field spacing (12px)
// - Button spacing (8px)
// - Table row height (40px standard)
```

Create spacing audit:
- [ ] Page layouts have consistent padding
- [ ] Sections have consistent gaps
- [ ] Cards have consistent padding
- [ ] Form fields have consistent spacing
- [ ] Table rows have consistent height

**Step 2C — Color System**

Define semantic color tokens:

```ts
// src/styles/colors.ts or Tailwind config
// Light mode:
// - Background: #ffffff (or #f9fafb)
// - Surface: #f3f4f6
// - Elevated surface: #ffffff with shadow
// - Border: #e5e7eb
// - Text primary: #111827
// - Text secondary: #6b7280
// - Text muted: #9ca3af
// - Primary: #2563eb (or brand color)
// - Secondary: #6b7280
// - Success: #10b981
// - Warning: #f59e0b
// - Error: #ef4444
// - Info: #3b82f6

// Dark mode (if applicable):
// - Similar hierarchy with adjusted values
```

Use TailwindCSS config to centralize colors.

**Step 2D — Border & Radius System**

Standardize borders and radius:

```ts
// Borders:
// - Subtle: 1px #e5e7eb
// - Divider: 1px #f3f4f6
// - Focus: 2px #2563eb

// Radius:
// - Inputs: 6px
// - Buttons: 6px
// - Cards: 8px
// - Modals: 8px
// - Dropdowns: 6px
// Avoid excessive rounding; keep professional
```

**Step 2E — Shadow System**

Minimal, purposeful shadows:

```ts
// Light:
// - sm: 0 1px 2px 0 rgba(0,0,0,0.05)
// - md: 0 4px 6px -1px rgba(0,0,0,0.1)
// - lg: 0 10px 15px -3px rgba(0,0,0,0.1)

// Prefer subtle shadows; rely on background/surface differences for hierarchy
```

**Step 2F — Iconography**

Standardize on Lucide icons throughout:

```ts
// Use lucide-react consistently
// Icon sizing: 16px (inline), 20px (buttons), 24px (headers)
// Do NOT mix icon styles
// Use icons to improve comprehension, not decorate every element
```

### Phase 3: Global Application Shell Redesign

**Step 3A — Redesign Sidebar Navigation**

Review and improve `src/app/layout.tsx` and `src/components/app-shell.tsx`:

```tsx
// Improvements:
// - Clear visual hierarchy for nav items
// - Active state indication (highlight + icon highlight)
// - Icon + label for expanded state
// - Icon only for collapsed state
// - Hover feedback
// - Smooth transitions
// - Mobile drawer behavior
// - Project/workspace selector at top
// - User menu/profile access at bottom
```

**Step 3B — Redesign Header/Top Navigation**

Improve consistency:

```tsx
// Contains:
// - Breadcrumbs (where applicable)
// - Page title
// - Primary actions
// - Search/command palette
// - Notifications
// - User menu
// - Dark mode toggle
```

**Step 3C — Implement Responsive Mobile Navigation**

Ensure mobile experience:

```tsx
// Mobile breakpoint (< 768px):
// - Sidebar becomes drawer/sheet
// - Header simplified
// - Touch-friendly spacing
// - Full-width forms
// - Simplified dialogs
```

**Step 3D — Establish Color & Typography Consistency**

Apply design tokens to shell:

```tsx
// - Use semantic color variables throughout
// - Apply consistent typography scale
// - Ensure proper contrast (WCAG AA minimum)
// - Test dark mode if applicable
```

### Phase 4: Redesign All Pages Systematically

**Step 4A — Authentication Pages**

Redesign in order:
- [ ] `/login` - Clear, focused form with social login options
- [ ] `/register` - Onboarding-friendly signup with inline validation
- [ ] `/verify-email` - Clear verification flow
- [ ] `/reset-password` - Clear password reset flow
- [ ] `/forgot-password` - Request reset flow

Use:
- Centered layout
- Clear call-to-action
- Error feedback
- Loading states
- Optional: empty state if no auth method configured

**Step 4B — Onboarding Flow**

Redesign:
- [ ] `/onboarding` - Step-by-step guided setup

**Step 4C — Authenticated Pages (Primary Routes)**

Redesign major routes:

```
Dashboard:
- [ ] /dashboard - Workspace/business overview with KPIs
- [ ] /stores - Project/store list and management

Analytics:
- [ ] /stores/[projectId]/analytics/* - All analytics views
  - [ ] Dashboard
  - [ ] Competitors
  - [ ] Trends
  - [ ] Content
  - [ ] Attribution
  - [ ] Mentions
  - [ ] Audience/Inspector

Content & Engagement:
- [ ] /stores/[projectId]/content - Content studio
- [ ] /stores/[projectId]/conversations - Unified inbox
- [ ] /chat - AI chat assistant

Settings:
- [ ] /settings - Account and workspace settings
- [ ] /stores/[projectId] - Project settings
- [ ] /admin/* - Super admin pages (if applicable)

Billing & Account:
- [ ] /settings/billing - Billing and subscription
- [ ] /settings/account - Profile and security
```

For each page:
- Clear page title and breadcrumbs
- Information hierarchy (most important first)
- Appropriate data visualization (tables, cards, charts)
- Clear CTAs
- Loading/empty/error states

**Step 4D — Tables & Data-Dense Pages**

Give exceptional attention to:

```tsx
// Improvements for ALL tables:
// - Clear headers with icons where helpful
// - Proper alignment (text left, numbers right)
// - Visual row separation
// - Sortable columns (visual indicator)
// - Filterable (clear filter UI)
// - Searchable (prominent search box)
// - Pagination (clear controls)
// - Row selection (checkboxes)
// - Bulk actions (only when rows selected)
// - Row actions (hover to reveal, or 3-dot menu)
// - Empty state (not just "No data")
// - Loading state (skeleton or progress)
// - Responsive: stack or scroll on mobile
```

Use shadcn/ui Table component consistently.

**Step 4E — Forms Redesign**

Improve ALL forms:

```tsx
// For each form:
// - Group related fields
// - Clear labels (required indicator if needed)
// - Helpful hint text / examples
// - Proper field sizing (not enormous)
// - Smart defaults
// - Real-time validation feedback
// - Error messages below field
// - Success feedback after submit
// - Loading state during submit
// - Disabled state styling
// - Focus states (visible outline)
```

Long forms → divide into sections with headers.

**Step 4F — Settings Pages**

Organize by category:

```tsx
// Account
// - Profile
// - Email/password
// - Phone
// - Sessions

// Workspace (if multi-workspace)
// - Name
// - Avatar
// - Members
// - Invitations

// Project
// - Name
// - Integrations
// - Webhooks

// Notifications
// - Email
// - Push
// - In-app
// - Per-feature

// Billing
// - Current plan
// - Payment method
// - Invoices
// - Upgrade/downgrade

// Integrations
// - Connected services
// - API keys
// - OAuth apps

// Security
// - Two-factor auth
// - Session management
// - API keys
// - Audit log

// Advanced
// - Data export
// - Account deletion
// - Developer settings
```

Use consistent checkbox, select, and switch patterns.

### Phase 5: Component & State Patterns

**Step 5A — Standardize Component Patterns**

Create or update reusable components:

```tsx
// Create in src/components/ if not exists:

// Layout components:
// - PageHeader (title, breadcrumbs, actions)
// - SectionHeader (section title, context)
// - DataTable (pagination, sorting, filtering)
// - DataCard (consistent card styling)

// State components:
// - EmptyState (icon, message, CTA)
// - ErrorState (icon, message, retry)
// - LoadingState (skeleton or spinner)
// - SuccessState (feedback toast/inline)

// Form components:
// - FormSection (grouped fields with header)
// - FormField (label, input, hint, error)
// - FormActions (submit/cancel buttons)

// Dialog components:
// - ConfirmDialog (delete, destructive actions)
// - AlertDialog (warnings)
// - FormDialog (small forms)
```

**Step 5B — Every Component State Coverage**

For major components, verify:

```tsx
// Default state (base appearance)
// Hover state (interactive feedback)
// Focus state (keyboard navigation)
// Active state (currently selected)
// Disabled state (grayed, no interaction)
// Loading state (spinner or skeleton)
// Error state (red, error message)
// Empty state (no data message)
// Success state (green feedback)
```

Create/update component storybook or tests.

### Phase 6: Responsive Design Implementation

**Step 6A — Breakpoint Strategy**

Use Tailwind breakpoints consistently:

```tsx
// Mobile first approach:
// - sm: 640px (mobile landscape)
// - md: 768px (tablet)
// - lg: 1024px (desktop)
// - xl: 1280px (wide desktop)

// For each page/component:
// - Base (mobile): stack, single column, full width
// - md: introduce 2-column layouts where appropriate
// - lg: full multi-column layouts
// - Ensure text readable, touch targets 44px+
```

**Step 6B — Mobile Navigation**

Ensure drawer/sheet behavior:

```tsx
// - Sidebar → drawer on mobile
// - Modals → full-screen or bottom-sheet option
// - Tables → scrollable or card view
// - Forms → single column, full width
// - Dialogs → full-screen or top-sheet
```

**Step 6C — Test All Breakpoints**

```bash
# Verify responsive design at:
# - 375px (iPhone SE)
# - 390px (iPhone 13)
# - 768px (iPad)
# - 1024px (iPad Pro / Laptop)
# - 1440px (Desktop)
# - 1920px (Wide Desktop)
```

### Phase 7: Accessibility Hardening

**Step 7A — Keyboard Navigation**

Verify:

```tsx
// - All interactive elements reachable via Tab
// - Logical Tab order (not jumping around)
// - Escape closes dialogs/dropdowns
// - Enter activates buttons
// - Space toggles checkboxes
// - Arrow keys navigate menus/dropdowns
// - Focus trap in modals
```

**Step 7B — Focus States**

Ensure visible:

```tsx
// - 2px outline on focused element
// - Sufficient contrast (WCAG AA minimum)
// - Clear, distinctive appearance
// - Not removed or invisible
```

**Step 7C — ARIA & Semantic HTML**

Check:

```tsx
// - Proper heading hierarchy (h1 → h2 → h3)
// - Labels associated with inputs
// - Buttons have text or aria-label
// - Icons have aria-hidden if decorative
// - Tables have thead/tbody
// - Form errors associated with inputs
// - Live regions for dynamic content
// - Dialog/modal: role="dialog" and aria-labelledby
```

**Step 7D — Color Contrast**

Verify WCAG AA minimum:

```
// - Text on background: 4.5:1
// - UI components: 3:1
// - Use contrast checker tools
// - Test in light and dark modes
```

**Step 7E — Touch Targets**

Ensure mobile-friendly:

```
// - Minimum 44px × 44px
// - Spacing between targets
// - No small buttons or links
```

### Phase 8: Micro-Interactions with Framer Motion

**Step 8A — Identify Key Interactions**

Where motion improves UX:

```tsx
// Good use of motion:
// - Sidebar collapse/expand (200ms)
// - Drawer slide in/out (250ms)
// - Dialog fade in (150ms)
// - Dropdown slide down (150ms)
// - Tab indicator underline (200ms)
// - Toast notification slide in (300ms)
// - Form validation feedback (150ms)
// - Success checkmark animation (400ms)
// - Loading spinner (smooth)
// - Page transitions (100ms fade)
// - Hover feedback (150ms)
```

**Step 8B — Implement Animations**

```tsx
import { motion } from 'framer-motion';

// Example sidebar collapse:
export function Sidebar() {
  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.2 }}
    >
      {/* content */}
    </motion.aside>
  );
}

// Keep animations:
// - Fast (100-250ms)
// - Smooth (easeInOut)
// - Purposeful (communicates something)
```

**Step 8C — Avoid Excessive Animation**

DO NOT:

```
- Animate every element on page load
- Use spring animations everywhere
- Animate backgrounds behind content
- Float/bounce elements excessively
- Parallax in business workflows
- Slow transitions that impede UX
```

### Phase 9: Visual QA & Polish

**Step 9A — Visual Consistency Audit**

Search for and fix:

```
- [ ] Misaligned elements
- [ ] Overflow/clipping
- [ ] Broken responsive layouts
- [ ] Inconsistent spacing
- [ ] Wrong colors
- [ ] Missing borders
- [ ] Awkward empty areas
- [ ] Bad table widths
- [ ] Text truncation issues
- [ ] Unexpected content
- [ ] Z-index issues
```

**Step 9B — Component Consistency**

Verify across pages:

```
- [ ] All buttons styled consistently
- [ ] All inputs styled consistently
- [ ] All cards styled consistently
- [ ] All tables styled consistently
- [ ] All dialogs styled consistently
- [ ] All forms styled consistently
- [ ] All empty states consistent
- [ ] All error states consistent
- [ ] All loading states consistent
- [ ] All success feedback consistent
```

**Step 9C — Dark Mode (if applicable)**

If dark mode exists:

```
- [ ] Contrast verified (WCAG AA)
- [ ] Borders visible
- [ ] Cards distinguishable
- [ ] Inputs clear
- [ ] Tables readable
- [ ] Charts visible
- [ ] All colors updated
- [ ] All text readable
```

### Phase 10: Functional QA

**Step 10A — Workflow Testing**

Test complete user flows:

```
- [ ] Login → Dashboard
- [ ] Create Project → Configure
- [ ] Connect Meta/Shopify
- [ ] Create Content → Publish → Analytics
- [ ] Invite Team Member → Accept
- [ ] Change Settings → Save
- [ ] Upload File → Progress → Complete
- [ ] Delete item → Confirm → Gone
- [ ] Search → Filter → Results
- [ ] Export → Download
- [ ] Manage Billing → Update → Success
```

**Step 10B — State Testing**

For each workflow, test:

```
- [ ] Loading states appear
- [ ] Empty states display correctly
- [ ] Error states show helpful messages
- [ ] Success feedback appears
- [ ] Disabled states prevent actions
- [ ] Forms validate properly
- [ ] Buttons are not double-clickable
- [ ] Modals close on Escape
- [ ] Data persists after save
```

**Step 10C — Performance Verification**

Ensure redesign doesn't break performance:

```bash
# Check build size
npm run build

# Verify performance:
# - Page load time
# - Interaction responsiveness
# - No excessive re-renders
# - No layout shifts
# - Smooth scrolling
```

### Phase 11: Repository Audit & Completeness

**Step 11A — Search for Missed Components**

```bash
# Find any remaining old-style components:
grep -r "className" src/components/ | grep -v "^Binary"  # Check for inline styles
grep -r "style=" src/                                      # Check for inline styles
grep -r "data-testid" src/                                 # Ensure consistent naming
grep -r "TODO" src/                                        # Fix TODOs
grep -r "FIXME" src/                                       # Fix FIXMEs
```

**Step 11B — Consistency Audit**

```bash
# Verify:
# - All pages use consistent layouts
# - All components follow design system
# - All colors come from tokens
# - All typography uses established scale
# - All spacing is consistent
# - All forms follow same pattern
# - All tables follow same pattern
# - No duplicate UI patterns
```

**Step 11C — Component Inventory**

Update documentation:

```
# Document new/updated components:
# - PageHeader
# - SectionHeader  
# - DataTable
# - DataCard
# - EmptyState
# - ErrorState
# - LoadingState
# - FormSection
# - ConfirmDialog
# - [others as created]
```

## 4. Subtasks

- [ ] Phase 1: Complete audit and create inventory
- [ ] Phase 2: Establish and apply design system
- [ ] Phase 3: Redesign global shell (navigation, header, responsive)
- [ ] Phase 4: Redesign all pages systematically
  - [ ] Authentication pages
  - [ ] Onboarding
  - [ ] Dashboard/stores
  - [ ] All analytics pages
  - [ ] Content/engagement pages
  - [ ] All settings pages
  - [ ] Admin pages (if applicable)
- [ ] Phase 5: Create reusable components and patterns
- [ ] Phase 6: Implement responsive design (all breakpoints)
- [ ] Phase 7: Accessibility hardening (keyboard, focus, ARIA, contrast)
- [ ] Phase 8: Add purposeful micro-interactions
- [ ] Phase 9: Visual QA and polish
- [ ] Phase 10: Functional QA (complete workflows)
- [ ] Phase 11: Repository audit and completeness check

## 5. Acceptance Criteria

- [ ] All acceptance criteria from REQ-0092 met
- [ ] Every authenticated route reviewed and redesigned
- [ ] Every unauthenticated route reviewed and redesigned
- [ ] Design system established and applied consistently
- [ ] Global shell cohesive and accessible
- [ ] Responsive design tested at all breakpoints
- [ ] Accessibility audit passed
- [ ] No functionality broken
- [ ] Visual QA completed (no misalignment, overflow, or inconsistencies)
- [ ] Functional QA completed (workflows tested end-to-end)
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] npm run test passes (if tests exist)
- [ ] npm run build passes
- [ ] CHANGELOG.md updated
- [ ] docs/specs/current-state.md updated if applicable

## 6. Notes / Blockers

- This is a large-scale redesign requiring systematic, thorough execution.
- Estimated effort: Substantial (multiple days of focused work).
- Key principle: NO functionality should be broken. All business logic preserved.
- Use 21st.dev MCP proactively for component inspiration.
- Apply design knowledge from UI/UX Pro Max Skill throughout.
- Test responsiveness at actual device sizes (not just browser devtools).
- Get early feedback on design direction if possible, but do NOT wait for approval on every page.
