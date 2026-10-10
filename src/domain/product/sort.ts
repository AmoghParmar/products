import type { ProductSortOption } from "../types/product"

export interface ProductSortChoice {
  label: string
  value: ProductSortOption
}

/** Workbench sort choices in menu order; labels are translation keys. */
export const PRODUCT_SORT_CHOICES: ProductSortChoice[] = [
  { label: "Newest introduced", value: "IntroducedDesc" },
  { label: "Oldest introduced", value: "IntroducedAsc" },
  { label: "Recently updated", value: "UpdatedDesc" },
  { label: "Least recently updated", value: "UpdatedAsc" },
  { label: "Product family", value: "Family" },
  { label: "Name A–Z", value: "NameAsc" },
  { label: "Name Z–A", value: "NameDesc" },
  { label: "SKU A–Z", value: "SkuAsc" },
  { label: "SKU Z–A", value: "SkuDesc" },
  { label: "Price: high to low", value: "PriceDesc" },
  { label: "Price: low to high", value: "PriceAsc" }
]
