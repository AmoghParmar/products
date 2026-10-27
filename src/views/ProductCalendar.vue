<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product calendar") }}</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="loading" @click="refresh">
            <ion-icon slot="icon-only" :icon="refreshOutline" />
          </ion-button>
        </ion-buttons>
        <ion-progress-bar v-if="loading" type="indeterminate" />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <EmptyState
        v-if="!calendarProductStoreId"
        :title="translate('No product store selected')"
        :message="translate('Choose a product store to manage product calendar dates.')"
      />

      <template v-else>
        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>{{ translate("Shopify metafield mappings") }}</ion-card-subtitle>
            <ion-card-title>{{ translate("{count} active calendar mappings", { count: activeCalendarMappings.length }) }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            {{ translate("Manage lifecycle date metafield mappings in Company Product Sync.") }}
          </ion-card-content>
          <ion-button v-if="mappingManagementHref" fill="clear" :href="mappingManagementHref" target="_blank" rel="noopener noreferrer">
            {{ translate("Manage Shopify mappings") }}
            <ion-icon slot="end" :icon="openOutline" />
          </ion-button>
        </ion-card>

        <SearchFilterCard
          :model-value="search"
          :placeholder="translate('Search by product name or ID')"
          :debounce="300"
          @update:model-value="search = $event"
        />

        <ion-list>
          <ion-list-header>
            <ion-checkbox
              v-if="selectMode"
              class="ion-margin-end"
              :checked="allLoadedSelected"
              :indeterminate="selectedIds.size > 0 && !allLoadedSelected"
              :aria-label="translate('Select all loaded products')"
              @ion-change="selectAllLoaded($event.detail.checked)"
            />
            <ion-label>
              <p class="overline">
                {{ calendarProductStoreId }}
              </p>
              {{ resultsLabel }}
              <p>{{ translate("ProductStore-scoped lifecycle dates used by ATP rules.") }}</p>
            </ion-label>
            <ion-button v-if="rows.length" fill="clear" size="small" @click="toggleSelectMode">
              {{ selectMode ? translate("Done") : translate("Select") }}
            </ion-button>
          </ion-list-header>

          <div
            v-for="row in rows"
            :key="`${row.productStoreId}:${row.productId}`"
            class="list-item calendar-row"
            role="button"
            tabindex="0"
            @click="activateRow(row)"
            @keydown.enter.prevent="activateRow(row)"
            @keydown.space.prevent="activateRow(row)"
          >
            <ion-item lines="none">
              <ion-checkbox
                v-if="selectMode"
                slot="start"
                :checked="selectedIds.has(productIdOf(row))"
                :aria-label="translate('Select product')"
                @click.stop
                @keydown.stop
                @ion-change="setSelected(productIdOf(row), $event.detail.checked)"
              />
              <ProductIdentity :product="productOf(row) ?? row" />
            </ion-item>
            <ion-label
              v-for="(field, index) in PRODUCT_CALENDAR_DATE_FIELDS"
              :key="field"
              :class="index < PRODUCT_CALENDAR_DATE_FIELDS.length - 1 ? 'tablet' : 'ion-text-end'"
            >
              {{ formatCalendarDate(row[field]) }}
              <p>{{ translate(PRODUCT_CALENDAR_DATE_LABELS[field]) }}</p>
            </ion-label>
          </div>

          <ion-item v-if="!isLoading && !isError && !rows.length" lines="none">
            <ion-label>{{ translate("No calendar rows match the current search.") }}</ion-label>
          </ion-item>
        </ion-list>

        <ErrorState
          v-if="isError"
          :title="translate('Unable to load product calendar.')"
          :message="calendarErrorText"
          @retry="calendarQuery.refetch()"
        />

        <ion-infinite-scroll :disabled="!hasNextPage" @ion-infinite="loadMore">
          <ion-infinite-scroll-content loading-spinner="crescent" />
        </ion-infinite-scroll>
      </template>
    </ion-content>

    <ion-footer v-if="selectMode">
      <ion-toolbar>
        <ion-title size="small">
          {{ translate("{count} selected", { count: selectedIds.size }) }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button fill="outline" :disabled="!selectedIds.size" @click="openDatesEditor(selectedRows)">
            {{ translate("Edit dates") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { commonUtil, logger, translate } from "@common"
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCheckbox,
  IonContent, IonFooter, IonHeader, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent, IonItem, IonLabel, IonList,
  IonListHeader, IonMenuButton, IonPage, IonProgressBar, IonTitle, IonToolbar, modalController
} from "@ionic/vue"
import { useInfiniteQuery, useQueryClient } from "@tanstack/vue-query"
import { openOutline, refreshOutline } from "ionicons/icons"
import { computed, ref, watch } from "vue"
import { useRoute } from "vue-router"
import { errorMessage } from "@/api/http"
import { fetchProductCalendarMappings, fetchProductStoreShops } from "@/api/productCalendar"
import ProductCalendarDatesModal from "@/components/calendar/ProductCalendarDatesModal.vue"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import ProductIdentity from "@/components/ProductIdentity.vue"
import SearchFilterCard from "@/components/SearchFilterCard.vue"
import { useProductIdentity } from "@/composables/useProductIdentity"
import {
  PRODUCT_CALENDAR_DATE_FIELDS, PRODUCT_CALENDAR_DATE_LABELS, type ProductCalendarDatesItem, formatCalendarDate
} from "@/domain/product/calendar"
import { qk } from "@/queries/keys"
import { productCalendarOptions } from "@/queries/productCalendar"
import { useUserStore } from "@/store/user"
import { showToast } from "@/utils"
import { getActiveCalendarMappings, getCalendarMappingManagementHref } from "@/utils/productCalendarMappings"

type CalendarRow = Record<string, unknown>

const route = useRoute()
const userStore = useUserStore()
const { identityOf } = useProductIdentity()
const queryClient = useQueryClient()
const shops = ref<Record<string, any>[]>([])
const mappings = ref<Record<string, any>[]>([])
const mappingsLoading = ref(false)
const search = ref("")
const selectMode = ref(false)
const selectedIds = ref(new Set<string>())

const calendarProductStoreId = computed(() => {
  const requestedProductStoreId = route.query.productStoreId
  if(typeof requestedProductStoreId === "string" && requestedProductStoreId) {return requestedProductStoreId}

  return userStore.getCurrentProductStore?.productStoreId || ""
})
const activeCalendarMappings = computed(() => getActiveCalendarMappings(shops.value, mappings.value))
const mappingManagementHref = computed(() => getCalendarMappingManagementHref(shops.value))

const calendarQuery = useInfiniteQuery(computed(() => productCalendarOptions(calendarProductStoreId.value, search.value.trim())))
const { hasNextPage, isError, isLoading } = calendarQuery
const pages = computed(() => calendarQuery.data.value?.pages ?? [])
const rows = computed(() => pages.value.flatMap((page) => page.rows))
const productsById = computed<Record<string, Record<string, unknown>>>(() => Object.assign({}, ...pages.value.map((page) => page.products)))
const totalCount = computed(() => pages.value[0]?.totalCount ?? null)
const resultsLabel = computed(() => totalCount.value === null
  ? translate("Calendar dates")
  : translate("{shown} of {count} products", { shown: rows.value.length, count: totalCount.value }))
const calendarErrorText = computed(() => errorMessage(calendarQuery.error.value, translate("Unable to load product calendar.")))
const loading = computed(() => mappingsLoading.value || (calendarQuery.isFetching.value && !calendarQuery.isFetchingNextPage.value))

const allLoadedSelected = computed(() => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.has(productIdOf(row))))
const selectedRows = computed(() => rows.value.filter((row) => selectedIds.value.has(productIdOf(row))))

function productIdOf(row: CalendarRow) {
  return String(row.productId ?? "")
}

function productOf(row: CalendarRow) {
  return productsById.value[productIdOf(row)]
}

function imageOf(row: CalendarRow) {
  return String(productOf(row)?.mainImageUrl ?? "")
}


function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if(!selectMode.value) {selectedIds.value = new Set()}
}

function setSelected(productId: string, checked: boolean) {
  const next = new Set(selectedIds.value)
  if(checked) {next.add(productId)} else {next.delete(productId)}
  selectedIds.value = next
}

function selectAllLoaded(checked: boolean) {
  selectedIds.value = checked ? new Set(rows.value.map(productIdOf)) : new Set()
}

function activateRow(row: CalendarRow) {
  if(selectMode.value) {
    setSelected(productIdOf(row), !selectedIds.value.has(productIdOf(row)))

    return
  }
  openDatesEditor([row])
}

function toDatesItem(row: CalendarRow): ProductCalendarDatesItem {
  // The Solr document when the lookup found one, else the calendar row (product ID and name).
  const { primary, secondary } = identityOf(productOf(row) ?? row)

  return {
    productId: productIdOf(row),
    primary,
    secondary,
    imageUrl: imageOf(row),
    dates: Object.fromEntries(PRODUCT_CALENDAR_DATE_FIELDS.map((field) => [field, row[field]]))
  }
}

// One editor at a time: a quick second tap on a row must not stack another modal.
let isEditorOpen = false

async function openDatesEditor(targetRows: CalendarRow[]) {
  if(!targetRows.length || isEditorOpen) {return}

  isEditorOpen = true
  try {
    const modal = await modalController.create({
      component: ProductCalendarDatesModal,
      componentProps: { productStoreId: calendarProductStoreId.value, items: targetRows.map(toDatesItem) }
    })
    await modal.present()
    const { data, role } = await modal.onWillDismiss()
    if(role !== "confirm" || !data?.updated) {return}

    if(selectMode.value) {toggleSelectMode()}
    await queryClient.invalidateQueries({ queryKey: qk.productCalendar.store(calendarProductStoreId.value) })
  } finally {
    isEditorOpen = false
  }
}

async function loadMappings() {
  const productStoreId = calendarProductStoreId.value
  if(!productStoreId) {
    shops.value = []
    mappings.value = []

    return
  }

  mappingsLoading.value = true
  try {
    const [productStoreShops, calendarMappings] = await Promise.all([
      fetchProductStoreShops(productStoreId),
      fetchProductCalendarMappings()
    ])
    shops.value = productStoreShops
    mappings.value = calendarMappings
  } catch(err) {
    shops.value = []
    mappings.value = []
    const serverError = commonUtil.getErrorMessage(err);
    logger.error(err);
    await showToast(`${translate("Unable to load Shopify metafield mappings.")} ${serverError}`)
  } finally {
    mappingsLoading.value = false
  }
}

function refresh() {
  calendarQuery.refetch()
  loadMappings()
}

async function loadMore(event: CustomEvent) {
  try {
    if(calendarQuery.hasNextPage.value && !calendarQuery.isFetchingNextPage.value) {await calendarQuery.fetchNextPage()}
  } finally {
    (event.target as HTMLIonInfiniteScrollElement).complete()
  }
}

// A new search or store replaces the rows; keep only selections that are still on screen.
watch(rows, (current) => {
  if(!selectedIds.value.size) {return}
  const visible = new Set(current.map(productIdOf))
  selectedIds.value = new Set([...selectedIds.value].filter((productId) => visible.has(productId)))
})

watch(calendarProductStoreId, loadMappings, { immediate: true })
</script>

<style scoped>
/* Row grid from @common's .list-item, sized like the Order Manager find-page rows:
   product plus four dates, with the middle dates from tablet width up. */
.calendar-row {
  --columns-desktop: 5;
  --columns-tablet: 5;
  border-block-start: var(--border-medium);
  padding-inline-end: var(--spacer-sm);
}
</style>
