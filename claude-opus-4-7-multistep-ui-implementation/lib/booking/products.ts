import { ProductInput } from "./types";

export type ProductPrefix = "A:" | "C:" | "F:" | "L:" | "S:";

// IDs already include their family prefix (e.g. "A:386918317"). Match by prefix,
// never re-prefix.
export function stripProductsByPrefix(
  products: ProductInput[],
  prefix: ProductPrefix,
): ProductInput[] {
  return products.filter((p) => !p.id.startsWith(prefix));
}

// Replace the single selected member of a one-at-a-time family (A:/C:/F:).
export function replaceFamily(
  products: ProductInput[],
  prefix: ProductPrefix,
  next: ProductInput | null,
): ProductInput[] {
  const without = stripProductsByPrefix(products, prefix);
  return next ? [...without, next] : without;
}

// Leisure: one selection per leisure group. Groups are identified by the
// product `group` field so multiple distinct activities can coexist.
export function setLeisureForGroup(
  products: ProductInput[],
  group: string,
  next: ProductInput | null,
): ProductInput[] {
  const without = products.filter(
    (p) => !(p.id.startsWith("L:") && p.group === group),
  );
  return next ? [...without, { ...next, group }] : without;
}

export function findProductByPrefix(
  products: ProductInput[],
  prefix: ProductPrefix,
): ProductInput | undefined {
  return products.find((p) => p.id.startsWith(prefix));
}

export function hasLeisureForGroup(
  products: ProductInput[],
  group: string,
): boolean {
  return products.some((p) => p.id.startsWith("L:") && p.group === group);
}

export function getLeisureIdForGroup(
  products: ProductInput[],
  group: string,
): string | undefined {
  return products.find((p) => p.id.startsWith("L:") && p.group === group)?.id;
}
