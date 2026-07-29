import { z } from "zod";
import type { ProductRepository } from "./ports";

export const updateProductSchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().max(3).optional().nullable(),
  inventory: z.coerce.number().int().min(0).optional().nullable(),
  imageUrl: z.string().url().max(1000).optional().nullable(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export function makeUpdateProduct(deps: { products: ProductRepository }) {
  return async function updateProduct(input: UpdateProductInput) {
    const product = await deps.products.findById(input.productId);
    if (!product) {
      throw new Error("Product not found.");
    }
    if (product.storeId !== input.storeId) {
      throw new Error("Product does not belong to this store.");
    }

    return deps.products.update(input.productId, {
      title: input.title,
      description: input.description,
      price: input.price,
      currency: input.currency,
      inventory: input.inventory,
      imageUrl: input.imageUrl,
    });
  };
}
