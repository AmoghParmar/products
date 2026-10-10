<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product workbench") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/products/create">
            <ion-icon
              slot="icon-only"
              :icon="addOutline"
            />
          </ion-button>
        </ion-buttons>
        <ion-progress-bar
          v-if="isFetching && !isLoading"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <WorkbenchFilters
        v-model:query-string="queryString"
        v-model:product-type-id="productTypeId"
        v-model:product-store-id="productStoreId"
        v-model:product-kind="productKind"
        :tags="tags"
        :product-types="productTypes"
        :product-stores="productStores"
        @open-tags="isTagModalOpen = true"
        @clear="clearFilters"
      />

      <div
        v-if="tags.length"
        class="active-tags"
      >
        <ion-chip
          v-for="tag in tags"
          :key="tag"
          outline
          @click="toggleTag(tag)"
        >
          <ion-label>{{ tag }}</ion-label>
          <ion-icon :icon="closeOutline" />
        </ion-chip>
      </div>

      <ion-list v-if="!isError">
        <ion-list-header>
          <!-- ion-list-header lays out its children in its own shadow DOM, so this div holds the layout. -->
          <div class="results-header">
            <span class="results-header-start">
              <ion-checkbox
                v-if="selectMode"
                :checked="allLoadedSelected"
                :indeterminate="someLoadedSelected && !allLoadedSelected"
                :aria-label="translate('Select all loaded products')"
                @ion-change="toggleLoadedSelection($event.detail.checked)"
              />
            </span>
            <ion-label>
              <ion-skeleton-text
                v-if="isLoading"
                animated
                class="results-header-skeleton"
              />
              <template v-else>
                {{ resultsLabel }}
              </template>
            </ion-label>
            <div class="results-header-controls">
              <SortPopover
                v-model="sort"
                :options="sortChoices"
                trigger-id="workbench-sort-trigger"
              />
              <ion-button
                v-if="products.length || selectMode"
                fill="clear"
                size="small"
                @click="toggleSelectMode"
              >
                {{ selectMode ? translate("Done") : translate("Select") }}
              </ion-button>
            </div>
          </div>
        </ion-list-header>

        <template v-if="isLoading">
          <ion-item
            v-for="i in 6"
            :key="i"
            lines="full"
          >
            <ion-thumbnail slot="start">
              <ion-skeleton-text animated />
            </ion-thumbnail>
            <ion-label>
              <h2>
                <ion-skeleton-text
                  animated
                  style="width: 50%"
                />
              </h2>
              <p>
                <ion-skeleton-text
                  animated
                  style="width: 30%"
                />
              </p>
            </ion-label>
          </ion-item>
        </template>

        <template v-else>
          <ProductRow
            v-for="product in products"
            :key="product.productId"
            :product="product"
            :router-link="familyRouteFor(product)"
            :variant-counts="groupIdFacets"
            :spark="rowSales[product.productId]"
            :spark-max="rowSalesMax"
            :select-mode="selectMode"
            :selected="selectedProductIds.includes(product.productId)"
            @selection-change="setProductSelection(product.productId, $event)"
          />
          <EmptyState
            v-if="!products.length"
            :title="translate('No products found')"
            :message="translate('Try adjusting the search or filters')"
          />
        </template>
      </ion-list>

      <ErrorState
        v-else
        :title="translate('Could not load products')"
        :message="errorText"
        @retry="refetch"
      />

      <ion-infinite-scroll
        :disabled="!hasNextPage"
        @ion-infinite="onInfinite"
      >
        <ion-infinite-scroll-content
          loading-spinner="crescent"
          :loading-text="translate('Loading more products')"
        />
      </ion-infinite-scroll>

      <TagFilterModal
        :is-open="isTagModalOpen"
        :facets="tagFacets"
        :selected="tags"
        @toggle="toggleTag"
        @dismiss="isTagModalOpen = false"
      />

      <AddTagModal
        :is-open="isAddTagModalOpen"
        :facets="tagFacets"
        @add="onTagSelected"
        @dismiss="isAddTagModalOpen = false"
      />
    </ion-content>

    <ion-footer v-if="selectMode">
      <ion-toolbar>
        <ion-title size="small">
          {{ translate("{count} selected", { count: selectedProductIds.length }) }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            fill="outline"
            :disabled="!selectedProductIds.length"
            @click="isAddTagModalOpen = true"
          >
            {{ translate("Add tag") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInfiniteScroll,
  IonInfiniteScrollContent, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonProgressBar,
  IonSkeletonText, IonThumbnail, IonTitle, IonToolbar, loadingController
} from "@ionic/vue"
import { addOutline, closeOutline } from "ionicons/icons"
import { computed, ref, watch } from "vue"
import { errorMessage } from "@/api/http"
import { addProductKeyword, triggerSolrIndex } from "@/api/pim"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import SortPopover from "@/components/SortPopover.vue"
import AddTagModal from "@/components/workbench/AddTagModal.vue"
import ProductRow from "@/components/workbench/ProductRow.vue"
import TagFilterModal from "@/components/workbench/TagFilterModal.vue"
import WorkbenchFilters from "@/components/workbench/WorkbenchFilters.vue"
import { useProductWorkbench } from "@/composables/useProductWorkbench"
import { useToast } from "@/composables/useToast"
import { familyRouteFor } from "@/domain/product/family"

const {
  queryString, productTypeId, productKind, groupIdFacets, productStoreId, tags,
  clearFilters, toggleTag,
  sort, sortChoices,
  products, rowSales, rowSalesMax, total, isLoading, isFetching, isError, error, hasNextPage, loadMore, refetch,
  tagFacets, productTypes, productStores
} = useProductWorkbench()

const isTagModalOpen = ref(false)
const isAddTagModalOpen = ref(false)
const selectMode = ref(false)
const selectedProductIds = ref<string[]>([])
const toast = useToast()

const resultsLabel = computed(() => total.value
  ? translate("{shown} of {count} matching products", { shown: products.value.length, count: total.value })
  : translate("0 results"))
const errorText = computed(() => errorMessage(error.value, translate("Search is unavailable")))

const loadedProductIds = computed(() => products.value.map((product) => product.productId))
const allLoadedSelected = computed(() => loadedProductIds.value.length > 0 && loadedProductIds.value.every((productId) => selectedProductIds.value.includes(productId)))
const someLoadedSelected = computed(() => loadedProductIds.value.some((productId) => selectedProductIds.value.includes(productId)))

// Selection covers the loaded rows: a new search, filter or sort drops what is no longer shown.
watch(loadedProductIds, (current) => {
  const shown = new Set(current)
  selectedProductIds.value = selectedProductIds.value.filter((productId) => shown.has(productId))
})

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if(!selectMode.value) {selectedProductIds.value = []}
}

function exitSelectMode() {
  selectMode.value = false
  selectedProductIds.value = []
}

function toggleLoadedSelection(checked: boolean) {
  selectedProductIds.value = checked ? [...loadedProductIds.value] : []
}

function setProductSelection(productId: string, checked: boolean) {
  if(checked) {
    if(!selectedProductIds.value.includes(productId)) {selectedProductIds.value = [...selectedProductIds.value, productId]}

    return
  }
  selectedProductIds.value = selectedProductIds.value.filter((selectedId) => selectedId !== productId)
}

const onInfinite = (event: CustomEvent) => loadMore(() => (event.target as HTMLIonInfiniteScrollElement).complete())

const onTagSelected = async (selectedTags: string[]) => {
  isAddTagModalOpen.value = false
  const ids = [...selectedProductIds.value]
  let failed = 0
  for(const productId of ids) {
    let productFailed = false
    for(const tag of selectedTags) {
      try {
        await addProductKeyword(productId, tag)
      } catch {
        productFailed = true
      }
    }
    if(productFailed) {failed++}
    triggerSolrIndex(productId)
  }
  if(failed) {
    toast.error(null, translate("Could not add tags to {failed} of {count} products", { failed, count: ids.length }))
  } else {
    toast.success(translate("Added tags to {count} products", { count: ids.length }))
  }
  exitSelectMode()

  const loading = await loadingController.create({ message: translate("Updating products...") })
  await loading.present()
  await new Promise((resolve) => setTimeout(resolve, 3000))
  await refetch()
  await loading.dismiss()
}
</script>

<style scoped>
.active-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 16px;
}

/* Count, then sort and Select. At phone width the controls wrap below the count. */
.results-header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacer-xs);
  width: 100%;
}

.results-header ion-label {
  flex: 1 1 auto;
}

.results-header-controls {
  align-items: center;
  display: flex;
  margin-inline-start: auto;
}

.results-header-start {
  display: flex;
  min-width: 24px;
}

.results-header-skeleton {
  width: 40%;
}
</style>
