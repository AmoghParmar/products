import { useInfiniteQuery, useQuery } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed, watch } from "vue"
import { useRowSales } from "@/composables/useRowSales"
import { PRODUCT_SORT_CHOICES } from "@/domain/product/sort"
import { DEFAULT_PRODUCT_SORT, isPriceSort, listPriceField } from "@/domain/solr/productQuery"
import { productStoresOptions, productTypesOptions } from "@/queries/catalog"
import { groupIdFacetsOptions, tagFacetsOptions, workbenchSearchOptions } from "@/queries/products"
import { useUserStore } from "@/store/user"
import { useWorkbenchStore } from "@/stores/workbench"

/** Page facade for the workbench: wires filter state (Pinia) to the search/facet queries (TanStack)
 *  and exposes exactly what the view renders. Views import THIS, never api/queries directly. */
export function useProductWorkbench() {
  const workbench = useWorkbenchStore()
  const userStore = useUserStore()
  const { queryString, productTypeId, productKind, productStoreId, tags, groupIds, sort } = storeToRefs(workbench)

  // Prices are indexed per store group and currency: the filtered store's, or the app's current store.
  const priceStore = computed(() => productStoreId.value === "All"
    ? userStore.getCurrentProductStore
    : (userStore.getUserProfile?.stores ?? []).find((store: any) => store.productStoreId === productStoreId.value))
  const priceField = computed(() => listPriceField(
    priceStore.value?.primaryStoreGroupId,
    priceStore.value?.defaultCurrencyUomId || priceStore.value?.currencyUomId
  ))
  const sortChoices = computed(() => PRODUCT_SORT_CHOICES.filter((choice) => priceField.value || !isPriceSort(choice.value)))
  // A price sort with no store price to sort by shows, and runs, as the default order; so does a sort
  // saved before the choices were renamed ("Alphabet", "Updated", "Created").
  const activeSort = computed(() => {
    if(!PRODUCT_SORT_CHOICES.some((choice) => choice.value === sort.value)) {return DEFAULT_PRODUCT_SORT}

    return isPriceSort(sort.value) && !priceField.value ? DEFAULT_PRODUCT_SORT : sort.value
  })
  // Save the order that is shown: otherwise the old one stays saved, can't be cleared (picking the
  // already-checked choice changes nothing), and returns on its own when a store price appears.
  watch(activeSort, (value) => {
    if(sort.value !== value) {sort.value = value}
  }, { immediate: true })

  const searchParams = computed(() => ({
    ...workbench.searchParams,
    sort: activeSort.value,
    ...(isPriceSort(activeSort.value) ? { priceField: priceField.value } : {})
  }))

  const searchQuery = useInfiniteQuery(computed(() => workbenchSearchOptions(searchParams.value)))
  const tagFacetsQuery = useQuery(computed(() => tagFacetsOptions(workbench.searchParams)))
  const productTypesQuery = useQuery(productTypesOptions())
  const productStoresQuery = useQuery(productStoresOptions())

  const groupIdFacetsQuery = useQuery(computed(() => groupIdFacetsOptions(workbench.searchParams)))

  const products = computed(() => searchQuery.data.value?.pages.flatMap((page) => page.products) ?? [])
  const visibleProductIds = computed(() => products.value.map((product) => product.productId))
  const { rowSales, rowSalesMax } = useRowSales(visibleProductIds)
  const total = computed(() => searchQuery.data.value?.pages[0]?.total ?? 0)

  const loadMore = async (done: () => void) => {
    try {
      if(searchQuery.hasNextPage.value && !searchQuery.isFetchingNextPage.value) {
        await searchQuery.fetchNextPage()
      }
    } finally {
      done()
    }
  }

  return {
    // filter state (v-model targets)
    queryString, productTypeId, productKind, productStoreId, tags, groupIds,
    clearFilters: () => workbench.clearFilters(),
    toggleTag: (tag: string) => workbench.toggleTag(tag),
    toggleGroupId: (groupId: string) => workbench.toggleGroupId(groupId),

    // sort
    sort: computed({ get: () => activeSort.value, set: (value) => { sort.value = value } }),
    sortChoices,

    // results
    products, rowSales, rowSalesMax, total,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    error: searchQuery.error,
    hasNextPage: searchQuery.hasNextPage,
    loadMore,
    refetch: () => searchQuery.refetch(),

    // facets + reference data
    tagFacets: computed(() => tagFacetsQuery.data.value ?? []),
    groupIdFacets: computed(() => groupIdFacetsQuery.data.value ?? {}),
    productTypes: computed(() => productTypesQuery.data.value ?? []),
    productStores: computed(() => productStoresQuery.data.value ?? [])
  }
}
