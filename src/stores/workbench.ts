import { defineStore } from "pinia"
import { DEFAULT_PRODUCT_SORT } from "@/domain/solr/productQuery"
import type { ProductKind, ProductSearchParams, ProductSortOption } from "@/domain/types/product"

/** Workbench UI state ONLY (filters and sort). Results live in the TanStack cache — the filter
 *  object this store produces is the search query key. Persisted so a reload keeps the working set. */
export const useWorkbenchStore = defineStore("workbench", {
  state: () => ({
    queryString: "",
    productTypeId: "FINISHED_GOOD",
    productKind: "All" as ProductKind,
    productStoreId: "All",
    tags: [] as string[],
    groupIds: [] as string[],
    sort: DEFAULT_PRODUCT_SORT as ProductSortOption,
    pageSize: 25
  }),
  getters: {
    searchParams(state): ProductSearchParams {
      return {
        queryString: state.queryString.trim(),
        productTypeId: state.productTypeId,
        productKind: state.productKind,
        productStoreId: state.productStoreId,
        tags: [...state.tags],
        groupIds: [...state.groupIds],
        sort: state.sort,
        pageSize: state.pageSize
      }
    }
  },
  actions: {
    toggleTag(tag: string) {
      this.tags = this.tags.includes(tag) ? this.tags.filter((existing) => existing !== tag) : [...this.tags, tag]
    },
    toggleGroupId(groupId: string) {
      this.groupIds = this.groupIds.includes(groupId)
        ? this.groupIds.filter((existing) => existing !== groupId)
        : [...this.groupIds, groupId]
    },
    clearFilters() {
      this.queryString = ""
      this.productTypeId = "FINISHED_GOOD"
      this.productKind = "All"
      this.productStoreId = "All"
      this.tags = []
      this.groupIds = []
      this.sort = DEFAULT_PRODUCT_SORT
    }
  },
  persist: { pick: ["queryString", "productTypeId", "productKind", "productStoreId", "tags", "sort"] }
})
