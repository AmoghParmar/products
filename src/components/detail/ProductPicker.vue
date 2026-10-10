<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          :value="term"
          :placeholder="translate('Product ID, SKU, name')"
          :debounce="300"
          @ion-input="term = $event.detail.value ?? ''"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list>
        <ion-item
          v-for="product in candidates"
          :key="product.productId"
          button
          @click="toggle(product)"
        >
          <ion-checkbox
            slot="start"
            :checked="selectedMap.has(product.productId)"
            style="pointer-events: none"
          />
          <ProductIdentity :product="product" />
          <ion-input
            v-if="selectedMap.has(product.productId)"
            slot="end"
            :value="quantities.get(product.productId) ?? 1"
            type="number"
            min="1"
            fill="outline"
            :label="translate('Qty')"
            label-placement="stacked"
            class="qty-input"
            @click.stop
            @ion-input="setQty(product.productId, $event.detail.value)"
          />
        </ion-item>
      </ion-list>

      <EmptyState
        v-if="!isLoading && !candidates.length"
        :title="translate('No matches')"
        :message="translate('Try a different search')"
      />

      <ion-fab
        slot="fixed"
        vertical="bottom"
        horizontal="end"
      >
        <ion-fab-button
          :disabled="!selectedMap.size"
          @click="confirm"
        >
          <ion-icon :icon="checkmarkOutline" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton,
  IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonSearchbar,
  IonTitle, IonToolbar
} from "@ionic/vue"
import { useQuery } from "@tanstack/vue-query"
import { checkmarkOutline } from "ionicons/icons"
import { computed, reactive, ref, watch } from "vue"
import { runProductSolrQuery, solrDocs } from "@/api/solr"
import EmptyState from "@/components/EmptyState.vue"
import ProductIdentity from "@/components/ProductIdentity.vue"
import { normalizeProductSummary } from "@/domain/normalize/product"
import { productSearchQueryText } from "@/domain/solr/productQuery"
import type { ProductSummary } from "@/domain/types/product"

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    excludeProductIds?: string[]
  }>(),
  { excludeProductIds: () => [] }
)

const emit = defineEmits<{
  (event: "select", items: Array<{ product: ProductSummary; quantity: number }>): void
  (event: "dismiss"): void
}>()

const term = ref("")
const selectedMap = reactive(new Map<string, ProductSummary>())
const quantities = reactive(new Map<string, number>())

watch(() => props.isOpen, (open) => {
  if(!open) {return}
  term.value = ""
  selectedMap.clear()
  quantities.clear()
})

const toggle = (product: ProductSummary) => {
  if(selectedMap.has(product.productId)) {
    selectedMap.delete(product.productId)
    quantities.delete(product.productId)
  } else {
    selectedMap.set(product.productId, product)
    quantities.set(product.productId, 1)
  }
}

const setQty = (productId: string, raw: string | null | undefined) => {
  const n = Number(raw)
  quantities.set(productId, n >= 1 ? n : 1)
}

const confirm = () => {
  if(!selectedMap.size) {return}
  const items = Array.from(selectedMap.values()).map((product) => ({
    product,
    quantity: quantities.get(product.productId) ?? 1
  }))
  emit("select", items)
}

const pickerQuery = useQuery({
  queryKey: computed(() => ["productPicker", term.value] as const),
  queryFn: async () => {
    const response = await runProductSolrQuery({
      query: productSearchQueryText(term.value),
      filter: ["docType:PRODUCT"],
      limit: 25,
      sort: "productName asc",
      params: {
        "defType": "edismax",
        "q.op": "OR",
        "qf": "productId groupId parentProductName productName internalName sku"
      }
    })

    return solrDocs(response).map(normalizeProductSummary)
  },
  enabled: computed(() => props.isOpen),
  staleTime: 30_000
})

const candidates = computed(() => {
  const excluded = new Set(props.excludeProductIds)

  return (pickerQuery.data.value ?? []).filter((p) => !excluded.has(p.productId))
})

const isLoading = pickerQuery.isLoading
</script>

<style scoped>
.qty-input {
  max-width: 90px;
}
</style>
