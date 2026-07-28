"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductRecord } from "@/modules/ecommerce";
import type { EcommerceActionState } from "@/modules/ecommerce";
import {
  updateProductAction,
  deleteProductAction,
} from "@/modules/ecommerce";

function ProductRow({ product, storeId }: { product: ProductRecord; storeId: string }) {
  const router = useRouter();
  const [updateState, updateAction, updatePending] = useActionState(
    async (prev: EcommerceActionState, formData: FormData) => {
      const result = await updateProductAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (prev: EcommerceActionState, formData: FormData) => {
      const result = await deleteProductAction(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    {},
  );

  return (
    <li className="space-y-3 rounded-lg border p-4">
      <form action={updateAction} className="grid gap-4 sm:grid-cols-7">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="storeId" value={storeId} />
        <div className="sm:col-span-2">
          <Label htmlFor={`title-${product.id}`} className="text-xs">
            Title
          </Label>
          <Input
            id={`title-${product.id}`}
            name="title"
            defaultValue={product.title}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`description-${product.id}`} className="text-xs">
            Description
          </Label>
          <Input
            id={`description-${product.id}`}
            name="description"
            defaultValue={product.description ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`price-${product.id}`} className="text-xs">
            Price
          </Label>
          <Input
            id={`price-${product.id}`}
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product.price ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`currency-${product.id}`} className="text-xs">
            Currency
          </Label>
          <Input
            id={`currency-${product.id}`}
            name="currency"
            defaultValue={product.currency ?? ""}
            maxLength={3}
          />
        </div>
        <div>
          <Label htmlFor={`inventory-${product.id}`} className="text-xs">
            Stock
          </Label>
          <Input
            id={`inventory-${product.id}`}
            name="inventory"
            type="number"
            min="0"
            defaultValue={product.inventory ?? ""}
          />
        </div>
        <div className="sm:col-span-6">
          <Label htmlFor={`imageUrl-${product.id}`} className="text-xs">
            Image URL
          </Label>
          <Input
            id={`imageUrl-${product.id}`}
            name="imageUrl"
            type="url"
            defaultValue={product.imageUrl ?? ""}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={updatePending}>
            {updatePending ? "Saving…" : "Save"}
          </Button>
        </div>
        {updateState.error && (
          <p className="col-span-full text-sm text-destructive">{updateState.error}</p>
        )}
        {updateState.ok && (
          <p className="col-span-full text-sm text-green-600">{updateState.message}</p>
        )}
      </form>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          if (!confirm("Delete this product?")) {
            event.preventDefault();
          }
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="storeId" value={storeId} />
        <Button type="submit" size="sm" variant="destructive" disabled={deletePending}>
          {deletePending ? "Deleting…" : "Delete"}
        </Button>
        {deleteState.error && (
          <p className="text-sm text-destructive">{deleteState.error}</p>
        )}
      </form>
    </li>
  );
}

export function ProductList({
  products,
  storeId,
}: {
  products: ProductRecord[];
  storeId: string;
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No products in this store.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {products.map((product) => (
        <ProductRow key={product.id} product={product} storeId={storeId} />
      ))}
    </ul>
  );
}
