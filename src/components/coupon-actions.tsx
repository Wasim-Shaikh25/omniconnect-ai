"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CouponRecord } from "@/modules/ecommerce";
import type { EcommerceActionState } from "@/modules/ecommerce";
import {
  updateCouponAction,
  deleteCouponAction,
} from "@/modules/ecommerce";

export function CouponActions({
  coupon,
  projectId,
}: {
  coupon: CouponRecord;
  projectId: string;
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
    <div className="space-y-3">
      <form action={updateAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="couponId" value={coupon.id} />
        <input type="hidden" name="projectId" value={projectId} />
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
        <input type="hidden" name="projectId" value={projectId} />
        <Button type="submit" size="sm" variant="destructive" disabled={deletePending}>
          {deletePending ? "Deleting…" : "Delete"}
        </Button>
        {deleteState.error && (
          <p className="text-sm text-destructive">{deleteState.error}</p>
        )}
      </form>
    </div>
  );
}
