import { z } from "zod";
import type { ProductRepository } from "./ports";

export const deleteProductSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
});

export type DeleteProductInput = z.infer<typeof deleteProductSchema>;

export function makeDeleteProduct(deps: { products: ProductRepository }) {
  return async function deleteProduct(input: DeleteProductInput) {
    const product = await deps.products.findById(input.productId);
    if (!product) {
      throw new Error("Product not found.");
    }
    if (product.storeId !== input.storeId) {
      throw new Error("Product does not belong to this store.");
    }

    return deps.products.delete(input.productId);
  };
}
