import { describe, expect, it } from "vitest";
import {
  stripProductsByPrefix,
  replaceProductFamily,
  upsertProduct,
  removeProductById,
  findProductByPrefix,
} from "@/lib/booking/products";

const products = [
  { id: "A:1" },
  { id: "F:2" },
  { id: "L:3" },
  { id: "L:4" },
];

describe("stripProductsByPrefix", () => {
  it("removes only the matching family", () => {
    expect(stripProductsByPrefix(products, "L:")).toEqual([
      { id: "A:1" },
      { id: "F:2" },
    ]);
  });

  it("treats undefined products as empty", () => {
    expect(stripProductsByPrefix(undefined, "A:")).toEqual([]);
  });
});

describe("replaceProductFamily", () => {
  it("replaces the single product of a family", () => {
    expect(replaceProductFamily(products, "F:", { id: "F:9" })).toEqual([
      { id: "A:1" },
      { id: "L:3" },
      { id: "L:4" },
      { id: "F:9" },
    ]);
  });

  it("removes the family when next is null", () => {
    expect(replaceProductFamily(products, "A:", null)).toEqual([
      { id: "F:2" },
      { id: "L:3" },
      { id: "L:4" },
    ]);
  });
});

describe("upsertProduct", () => {
  it("updates an existing product in place", () => {
    const next = { id: "L:3", options: [{ id: "x" }] };
    expect(upsertProduct(products, next)).toEqual([
      { id: "A:1" },
      { id: "F:2" },
      next,
      { id: "L:4" },
    ]);
  });

  it("appends a new product", () => {
    expect(upsertProduct(products, { id: "C:7" })).toEqual([
      ...products,
      { id: "C:7" },
    ]);
  });

  it("treats undefined products as empty", () => {
    expect(upsertProduct(undefined, { id: "C:7" })).toEqual([{ id: "C:7" }]);
  });
});

describe("removeProductById", () => {
  it("removes by exact id", () => {
    expect(removeProductById(products, "L:3")).toEqual([
      { id: "A:1" },
      { id: "F:2" },
      { id: "L:4" },
    ]);
  });

  it("treats undefined products as empty", () => {
    expect(removeProductById(undefined, "L:3")).toEqual([]);
  });
});

describe("findProductByPrefix", () => {
  it("finds the first product in a family", () => {
    expect(findProductByPrefix(products, "L:")).toEqual({ id: "L:3" });
  });

  it("returns undefined when none match or input is empty", () => {
    expect(findProductByPrefix(products, "C:")).toBeUndefined();
    expect(findProductByPrefix(undefined, "A:")).toBeUndefined();
  });
});
