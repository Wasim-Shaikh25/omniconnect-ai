# Spec 0059: Bulk Delete Success Message

- **Module(s):** ui/components, ecommerce
- **Status:** Implemented
- **Owner:** devin
- **Related task(s):** [docs/tasks/0059-bulk-delete-success-message-progress.md](../tasks/0059-bulk-delete-success-message-progress.md)
- **Related PR:** Follow-up to [#75](https://github.com/Wasim-Shaikh25/omniconnect-ai/pull/75)
- **Last updated:** 2026-07-29

## 1. Summary

After a product or coupon bulk delete, the server action soft-deletes the rows correctly, but the success message is never visible in the UI. The parent `ProductList` / `CouponList` unmounts the `BulkDeleteToolbar` as soon as `router.refresh()` returns an empty list, which also unmounts the toolbar's `useActionState` success state. This spec moves the success message out of the toolbar into the parent list so it survives the refresh and empty-list transition.

## 2. Goals

- Ensure users see a confirmation after bulk-deleting products or coupons.
- Keep the success message on screen for ~3 seconds even after the list becomes empty.
- Preserve existing error rendering inside the toolbar.

## 3. Non-Goals

- Changing backend soft-delete behavior.
- Adding per-row delete success messages.
- Changing the confirmation dialog.

## 4. User Stories

- As a store owner, when I select all products and click `Delete selected`, I want to see `6 product(s) deleted.` so I know the action succeeded.
- As a store owner, when I delete the last coupon, I want to see `1 coupon(s) deleted.` before the empty-state message appears.

## 5. Domain Model

No changes.

## 6. Public Contract

No changes to module contracts. `BulkDeleteToolbar` gains an optional `onSuccess(message: string)` callback.

## 7. Data / Persistence

No changes.

## 8. API / UI Surface

- `components/product-list.tsx` `ProductList`:
  - Owns a `bulkMessage` state.
  - Renders the message above the select-all header and the list.
  - Always renders `BulkDeleteToolbar` when `products.length > 0`.
  - Early-returns the empty-state paragraph only for the list area.
- `components/coupon-list.tsx` `CouponList`: same pattern.
- `BulkDeleteToolbar`:
  - Removes the 3-second `onClear` timer and `state.ok` display.
  - Calls `onSuccess(result.message)` on success before `router.refresh()`.
  - Continues to show `state.error`.

## 9. External Integrations

None.

## 10. Edge Cases & Failure Modes

- If `onSuccess` is not provided, the toolbar still refreshes but does not display a success message (backward compatibility).
- If the server returns `result.ok` with no message, the parent message is `undefined`; guard against empty strings.
- Clearing `bulkMessage` after 3 seconds must not interfere with a subsequent delete (clear timeout on unmount/message change).

## 11. Security & Privacy

None beyond existing RBAC/server action guards.

## 12. Testing Strategy

- E2E with Playwright: bulk delete all products/coupons and assert the success text appears before the list empties.
- Manual: verify the message is visible for ~3 s and then disappears.

## 13. Acceptance Criteria

- [x] `ProductList` / `CouponList` render a success message after bulk delete.
- [x] The message persists after the list refreshes to empty.
- [x] The message auto-dismisses after ~3 seconds.
- [x] Toolbar errors still render.
- [x] Quality gates pass.

## 14. Open Questions

- Should the message live in a toast/snackbar instead of inline? (Decision: inline for now to match existing UX.)
