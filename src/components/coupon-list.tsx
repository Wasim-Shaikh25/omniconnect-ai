"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CouponRecord } from "@/modules/ecommerce";
import type { EcommerceActionState } from "@/modules/ecommerce";
import {
  updateCouponAction,
  deleteCouponAction,
  bulkDeleteCouponsAction,
} from "@/modules/ecommerce";

function formatExpiresAt(date: Date | null): string {
  if (!date) return "No expiry";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CouponRow({
  coupon,
  storeId,
  selected,
  onToggle,
}: {
  coupon: CouponRecord;
  storeId: string;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    async (prev: EcommerceActionState, formData: FormData) => {
      const result = await updateCouponAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (prev: EcommerceActionState, formData: FormData) => {
      const result = await deleteCouponAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    {},
  );

  return (
    <li className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(coupon.id)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          aria-label={`Select ${coupon.code}`}
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{coupon.code}</h3>
            <span className="text-xs text-muted-foreground">
              {coupon.status} · Expires {formatExpiresAt(coupon.expiresAt)}
            </span>
          </div>
          <form action={updateAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="couponId" value={coupon.id} />
            <input type="hidden" name="storeId" value={storeId} />
            <div>
              <Label htmlFor={`discount-${coupon.id}`} className="text-xs">
                Discount %
              </Label>
              <Input
                id={`discount-${coupon.id}`}
                name="discountPct"
                type="number"
                min={1}
                max={100}
                defaultValue={coupon.discountPct}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`status-${coupon.id}`} className="text-xs">
                Status
              </Label>
              <select
                id={`status-${coupon.id}`}
                name="status"
                defaultValue={coupon.status}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              >
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`expires-${coupon.id}`} className="text-xs">
                Expires
              </Label>
              <Input
                id={`expires-${coupon.id}`}
                name="expiresAt"
                type="date"
                defaultValue={
                  coupon.expiresAt
                    ? new Date(coupon.expiresAt).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? "Saving…" : "Save"}
            </Button>
            {updateState.error && (
              <p className="text-sm text-destructive">{updateState.error}</p>
            )}
            {updateState.ok && (
              <p className="text-sm text-green-600">{updateState.message}</p>
            )}
          </form>

          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!confirm("Delete this coupon?")) {
                event.preventDefault();
              }
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="couponId" value={coupon.id} />
            <input type="hidden" name="storeId" value={storeId} />
            <Button type="submit" size="sm" variant="destructive" disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
            {deleteState.error && (
              <p className="text-sm text-destructive">{deleteState.error}</p>
            )}
          </form>
        </div>
      </div>
    </li>
  );
}

function BulkDeleteToolbar({
  storeId,
  selected,
  onClear,
}: {
  storeId: string;
  selected: string[];
  onClear: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: EcommerceActionState, formData: FormData) => {
      const result = await bulkDeleteCouponsAction(prev, formData);
      if (result.ok) {
        onClear();
        router.refresh();
      }
      return result;
    },
    {},
  );

  if (selected.length === 0) return null;

  return (
    <form action={action} className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="couponIds" value={selected.join(",")} />
      <span className="text-sm">{selected.length} selected</span>
      <Button
        type="submit"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={(event) => {
          if (!confirm(`Delete ${selected.length} coupons?`)) {
            event.preventDefault();
          }
        }}
      >
        {pending ? "Deleting…" : "Delete selected"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onClear}>
        Clear
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">{state.message}</p>}
    </form>
  );
}

export function CouponList({
  coupons,
  storeId,
}: {
  coupons: CouponRecord[];
  storeId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = coupons.length > 0 && selected.size === coupons.length;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(coupons.map((c) => c.id)));
  }

  function clear() {
    setSelected(new Set());
  }

  if (coupons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No coupons in this store.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">Select all</span>
      </div>
      <BulkDeleteToolbar storeId={storeId} selected={Array.from(selected)} onClear={clear} />
      <ul className="space-y-4">
        {coupons.map((coupon) => (
          <CouponRow
            key={coupon.id}
            coupon={coupon}
            storeId={storeId}
            selected={selected.has(coupon.id)}
            onToggle={toggle}
          />
        ))}
      </ul>
    </div>
  );
}
