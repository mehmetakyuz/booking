import { ProductInput } from "./types";

// Product IDs already carry their family prefix (e.g. "A:386917708"). These
// helpers match by prefix and never add another prefix.

export type ProductPrefix = "A:" | "C:" | "F:" | "L:" | "S:" | "CE:";

export function stripProductsByPrefix(
  products: ProductInput[] | undefined,
  prefix: ProductPrefix,
): ProductInput[] {
  return (products ?? []).filter((p) => !p.id.startsWith(prefix));
}

// Replace the single product in a family (accommodation/flight/car) with one.
export function replaceProductFamily(
  products: ProductInput[] | undefined,
  prefix: ProductPrefix,
  next: ProductInput | null,
): ProductInput[] {
  const kept = stripProductsByPrefix(products, prefix);
  return next ? [...kept, next] : kept;
}

// Leisure groups allow one selection per group. We key by the group's date so
// switching a variation within an activity replaces the prior pick for that day.
export function upsertProduct(
  products: ProductInput[] | undefined,
  next: ProductInput,
): ProductInput[] {
  const list = products ?? [];
  const idx = list.findIndex((p) => p.id === next.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = next;
    return copy;
  }
  return [...list, next];
}

export function removeProductById(
  products: ProductInput[] | undefined,
  id: string,
): ProductInput[] {
  return (products ?? []).filter((p) => p.id !== id);
}

export function findProductByPrefix(
  products: ProductInput[] | undefined,
  prefix: ProductPrefix,
): ProductInput | undefined {
  return (products ?? []).find((p) => p.id.startsWith(prefix));
}
