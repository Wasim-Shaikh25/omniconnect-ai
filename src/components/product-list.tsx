"use client";

import { formatCurrency } from "@/lib/currency";
import type { ProductRecord } from "@/modules/ecommerce";

interface ProductListProps {
  products: ProductRecord[];
  storeId?: string;
}

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No products synced yet. Connect your e-commerce source and run a sync to see your catalog here.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {products.map((product) => (
        <li key={product.id} className="py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{product.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description ?? "No description"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Provider ID: {product.externalId ?? "—"}
              </p>
            </div>
            <div className="mt-1 text-right sm:mt-0">
              <p className="text-sm font-medium">{formatCurrency(product.price ?? 0, product.currency ?? "USD")}</p>
              <p className="text-xs text-muted-foreground">
                {product.inventory ?? 0} in stock
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
