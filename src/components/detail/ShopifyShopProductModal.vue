<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button
          :aria-label="translate('Close')"
          @click="close"
        >
          <ion-icon
            slot="icon-only"
            :icon="closeOutline"
          />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ link ? translate("Edit Shopify shop product") : translate("Add Shopify shop product") }}</ion-title>
    </ion-toolbar>
    <!-- Adding offers two ways in, as the company app's metafield picker does: pick from Shopify, or type an ID. -->
    <ion-toolbar v-if="!link">
      <ion-segment v-model="mode">
        <ion-segment-button value="search">
          <ion-label>{{ translate("From Shopify") }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="manual">
          <ion-label>{{ translate("Enter manually") }}</ion-label>
        </ion-segment-button>
      </ion-segment>
    </ion-toolbar>
    <ion-toolbar v-if="mode === 'search'">
      <ion-searchbar
        :value="term"
        :debounce="400"
        :placeholder="product.isVirtual ? translate('Search Shopify products') : translate('Search Shopify variants')"
        @ion-input="term = $event.detail.value ?? ''"
      />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list>
      <ion-item>
        <ion-select
          v-model="shopId"
          :label="translate('Shop')"
          interface="popover"
          :placeholder="translate('Select shop')"
          :disabled="Boolean(link)"
        >
          <ion-select-option
            v-for="shop in shopChoices"
            :key="shop.shopId"
            :value="shop.shopId"
          >
            {{ shop.name }}
          </ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>

    <template v-if="mode === 'search'">
      <ion-list v-if="candidatesQuery.isFetching.value">
        <ion-item lines="none">
          <ion-spinner
            slot="start"
            name="crescent"
          />
          <ion-label>{{ translate("Searching Shopify") }}</ion-label>
        </ion-item>
      </ion-list>
      <ion-list v-else-if="candidatesQuery.isError.value">
        <ion-item lines="none">
          <ion-label
            class="ion-text-wrap"
            color="danger"
          >
            {{ translate("Could not search Shopify") }}
          </ion-label>
          <ion-button
            slot="end"
            fill="clear"
            @click="candidatesQuery.refetch()"
          >
            {{ translate("Check again") }}
          </ion-button>
        </ion-item>
      </ion-list>
      <ion-list v-else>
        <!-- The whole row toggles; IDs already linked (here or to another product) cannot be picked. -->
        <ion-item
          v-for="candidate in candidates"
          :key="candidate.shopifyProductId"
          button
          :detail="false"
          :disabled="Boolean(ownerOf(candidate))"
          @click="toggleCandidate(candidate)"
        >
          <ion-checkbox
            slot="start"
            :checked="ownerOf(candidate) === productId || selectedIds.has(candidate.shopifyProductId)"
            :aria-label="candidate.title || candidate.shopifyProductId"
            @click.stop
            @keydown.stop
            @ion-change="setCandidate(candidate, $event.detail.checked)"
          />
          <ion-label>
            {{ candidate.title || candidate.shopifyProductId }}
            <p v-if="candidate.sku">
              {{ candidate.sku }}
            </p>
            <p>{{ candidate.shopifyProductId }}</p>
            <p v-if="ownerOf(candidate)">
              <ion-text :color="ownerOf(candidate) === productId ? 'medium' : 'danger'">
                {{ ownerOf(candidate) === productId
                  ? translate("Already linked to this product")
                  : translate("Linked to {product}", { product: ownerLabel(ownerOf(candidate)) }) }}
              </ion-text>
            </p>
          </ion-label>
          <ion-note
            v-if="candidate.inventory !== null"
            slot="end"
          >
            {{ translate("{count} available", { count: candidate.inventory.toLocaleString() }) }}
          </ion-note>
        </ion-item>
        <ion-item
          v-if="term.trim() && !candidates.length"
          lines="none"
        >
          <ion-label>{{ translate("No matches on Shopify") }}</ion-label>
        </ion-item>
      </ion-list>
    </template>

    <template v-else>
      <ion-list v-if="suggested && link">
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <p>
              {{ translate("These are the values Shopify has for this product. Saved: product {productId}, inventory {inventoryItemId}.", {
                productId: link.shopifyProductId || "-",
                inventoryItemId: link.shopifyInventoryItemId || "-"
              }) }}
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
      <!-- Outlined inputs sit in padded content rather than in an ion-item, whose wrapper can clip the
           outline label. -->
      <div class="ion-padding">
        <ion-input
          v-model="form.shopifyProductId"
          :class="{ 'ion-margin-bottom': !product.isVirtual }"
          :label="translate('Shopify product ID')"
          label-placement="floating"
          fill="outline"
          inputmode="numeric"
          clear-input
        />
        <ion-input
          v-if="!product.isVirtual"
          v-model="form.shopifyInventoryItemId"
          :label="translate('Shopify inventory ID')"
          label-placement="floating"
          fill="outline"
          inputmode="numeric"
          clear-input
        />
      </div>
      <ion-list>
        <!-- Always rendered, so a check swaps its text instead of adding or removing a row. -->
        <ion-item lines="none">
          <ion-spinner
            v-if="status.checking"
            slot="start"
            name="crescent"
          />
          <ion-icon
            v-else
            slot="start"
            :icon="status.icon"
            :color="status.tone"
          />
          <ion-label class="ion-text-wrap">
            {{ status.message }}
            <p v-if="status.detail">
              {{ status.detail }}
            </p>
          </ion-label>
          <ion-button
            v-if="status.inventoryItemId"
            slot="end"
            fill="clear"
            @click="form.shopifyInventoryItemId = status.inventoryItemId"
          >
            {{ translate("Use Shopify's") }}
          </ion-button>
        </ion-item>
        <!-- The product that already owns the ID, so the user can see what it is and go fix it there. -->
        <ion-item
          v-if="blockingOwnerId"
          lines="none"
        >
          <ProductIdentity :product="documentFor(blockingOwnerId) ?? { productId: blockingOwnerId }">
            <p>{{ translate("Product {productId}", { productId: blockingOwnerId }) }}</p>
          </ProductIdentity>
          <ion-button
            slot="end"
            fill="clear"
            :href="ownerHref(blockingOwnerId)"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="translate('Open product')"
            :title="translate('Open product')"
          >
            <ion-icon
              slot="icon-only"
              :icon="openOutline"
            />
          </ion-button>
        </ion-item>
        <ion-item
          v-if="status.needsAcknowledgement"
          lines="none"
        >
          <ion-checkbox
            v-model="acknowledged"
            label-placement="end"
            justify="start"
          >
            <div class="ion-text-wrap">
              {{ translate("Save anyway; this link may not sync until Shopify has this ID.") }}
            </div>
          </ion-checkbox>
        </ion-item>
      </ion-list>
    </template>

    <ion-fab
      slot="fixed"
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button
        :disabled="!canSave"
        :aria-label="translate('Save')"
        @click="save"
      >
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
  IonList, IonNote, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle,
  IonToolbar, modalController
} from "@ionic/vue"
import { useQuery } from "@tanstack/vue-query"
import { alertCircleOutline, checkmarkCircleOutline, closeCircleOutline, closeOutline, informationCircleOutline, openOutline, saveOutline } from "ionicons/icons"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import ProductIdentity from "@/components/ProductIdentity.vue"
import { useProductDocuments } from "@/composables/useProductDocuments"
import { useProductIdentity } from "@/composables/useProductIdentity"
import { normalizeProductSummary } from "@/domain/normalize/product"
import { familyRouteFor } from "@/domain/product/family"
import { type ShopifyLinkCandidate, defaultCandidateSearch } from "@/domain/shopify/linkCandidates"
import type { ListingCheckProduct } from "@/domain/shopify/listingCheck"
import type { ShopifyShop, ShopifyShopProduct } from "@/domain/types/product"
import { shopifyLinkCandidatesOptions, shopifyLinkValidationOptions } from "@/queries/productDetail"

const props = defineProps<{
  shops: ShopifyShop[]
  productId: string
  product: ListingCheckProduct
  /** The link being edited; absent when adding one. */
  link?: ShopifyShopProduct
  /** Values found on Shopify for the link, which the form starts from. */
  suggested?: { shopifyProductId: string; shopifyInventoryItemId: string }
}>()

const mode = ref<"search" | "manual">(props.link ? "manual" : "search")
const shopId = ref(props.link?.shopId ?? props.shops[0]?.shopId ?? "")
const shopChoices = computed(() => props.link && !props.shops.some((shop) => shop.shopId === props.link?.shopId)
  ? [{ shopId: props.link.shopId, name: props.link.shopId, domain: "", remoteId: "" }]
  : props.shops)
const remoteId = computed(() => props.shops.find((shop) => shop.shopId === shopId.value)?.remoteId ?? "")

// ---- From Shopify ----
const term = ref(defaultCandidateSearch(props.product))
const selectedIds = ref(new Set<string>())
const candidatesQuery = useQuery(computed(() => ({
  ...shopifyLinkCandidatesOptions({ shopId: shopId.value, remoteId: remoteId.value, product: props.product, term: term.value }),
  enabled: mode.value === "search" && Boolean(shopId.value && remoteId.value && term.value.trim())
})))
const candidates = computed(() => candidatesQuery.data.value?.candidates ?? [])
const selectedCandidates = computed(() => candidates.value.filter((candidate) => selectedIds.value.has(candidate.shopifyProductId)))

function ownerOf(candidate: ShopifyLinkCandidate) {
  return candidatesQuery.data.value?.owners[candidate.shopifyProductId] ?? ""
}

function setCandidate(candidate: ShopifyLinkCandidate, checked: boolean) {
  if(ownerOf(candidate)) {return}
  const next = new Set(selectedIds.value)
  if(checked) {next.add(candidate.shopifyProductId)} else {next.delete(candidate.shopifyProductId)}
  selectedIds.value = next
}

function toggleCandidate(candidate: ShopifyLinkCandidate) {
  setCandidate(candidate, !selectedIds.value.has(candidate.shopifyProductId))
}

// A different shop or search is a different list; picks from the old one no longer apply.
watch([shopId, term], () => { selectedIds.value = new Set() })

// ---- Enter manually ----
const form = ref({
  shopifyProductId: props.suggested?.shopifyProductId ?? props.link?.shopifyProductId ?? "",
  shopifyInventoryItemId: props.suggested?.shopifyInventoryItemId ?? props.link?.shopifyInventoryItemId ?? ""
})
const acknowledged = ref(false)
const typedId = computed(() => String(form.value.shopifyProductId ?? "").trim())
const typedInventoryId = computed(() => String(form.value.shopifyInventoryItemId ?? "").trim())

// An inventory ID filled in from Shopify belongs to the ID it was looked up for.
const autoFilledInventoryId = ref("")

// Shopify is asked once typing pauses, not on every keystroke.
const checkedId = ref(typedId.value)
let checkTimer: ReturnType<typeof setTimeout> | undefined
watch(typedId, (id) => {
  acknowledged.value = false
  if(autoFilledInventoryId.value && typedInventoryId.value === autoFilledInventoryId.value) {form.value.shopifyInventoryItemId = ""}
  autoFilledInventoryId.value = ""
  if(checkTimer) {clearTimeout(checkTimer)}
  checkTimer = setTimeout(() => { checkedId.value = id }, 500)
})

const validationQuery = useQuery(computed(() => ({
  ...shopifyLinkValidationOptions({ shopId: shopId.value, remoteId: remoteId.value, product: props.product, shopifyProductId: checkedId.value }),
  enabled: mode.value === "manual" && Boolean(shopId.value && remoteId.value && /^\d+$/.test(checkedId.value))
})))

// The link being edited keeps its own key; any other existing key is a conflict.
const isOwnKey = computed(() => Boolean(props.link) && props.link?.shopId === shopId.value && props.link?.shopifyProductId === typedId.value)

interface ManualStatus {
  checking: boolean
  icon: string
  /** Ionic color name for the status icon. */
  tone: string
  message: string
  detail: string
  blocked: boolean
  needsAcknowledgement: boolean
  verified: boolean
  inventoryItemId: string
}

const status = computed<ManualStatus>(() => {
  const base: ManualStatus = {
    checking: false, icon: informationCircleOutline, tone: "medium", message: "", detail: "",
    blocked: false, needsAcknowledgement: false, verified: false, inventoryItemId: ""
  }

  if(!typedId.value) {return { ...base, message: translate("Enter the Shopify ID to check it on Shopify."), blocked: true }}
  if(!/^\d+$/.test(typedId.value)) {return { ...base, icon: alertCircleOutline, tone: "warning", message: translate("Shopify IDs are numbers."), blocked: true }}
  if(!remoteId.value) {
    return { ...base, icon: alertCircleOutline, tone: "warning", message: translate("This shop has no Shopify connection to check against."), needsAcknowledgement: true }
  }
  if(checkedId.value !== typedId.value || validationQuery.isFetching.value) {return { ...base, checking: true, message: translate("Checking Shopify"), blocked: true }}
  if(validationQuery.isError.value) {
    return { ...base, icon: alertCircleOutline, tone: "warning", message: translate("Could not check Shopify."), needsAcknowledgement: true }
  }

  const result = validationQuery.data.value
  if(!result) {return { ...base, checking: true, message: translate("Checking Shopify"), blocked: true }}

  // A Shopify ID belongs to one product per shop; saving it here would move it off its product.
  if(result.ownerProductId && !isOwnKey.value) {
    return result.ownerProductId === props.productId
      ? { ...base, icon: closeCircleOutline, tone: "danger", message: translate("This product is already linked to this Shopify ID on this shop."), blocked: true }
      : {
        ...base,
        icon: closeCircleOutline,
        tone: "danger",
        message: translate("Linked to another product on this shop."),
        detail: translate("A Shopify ID can be linked to one product only. Unlink it there first."),
        blocked: true
      }
  }

  if(!result.found) {
    return { ...base, icon: alertCircleOutline, tone: "warning", message: translate("Not found on Shopify."), needsAcknowledgement: true }
  }

  const figures = translate("{orders} orders in the last 30 days, {inventory} available on Shopify.", {
    orders: result.orders30 === null ? "-" : result.orders30.toLocaleString(),
    inventory: result.inventory === null ? "-" : result.inventory.toLocaleString()
  })
  const inventoryDiffers = Boolean(result.shopifyInventoryItemId) && result.shopifyInventoryItemId !== typedInventoryId.value

  return {
    ...base,
    icon: checkmarkCircleOutline,
    tone: "success",
    message: result.title || translate("Found on Shopify"),
    detail: inventoryDiffers ? `${figures} ${translate("Shopify's inventory ID is {id}.", { id: result.shopifyInventoryItemId })}` : figures,
    verified: true,
    inventoryItemId: inventoryDiffers ? result.shopifyInventoryItemId : ""
  }
})

// A usable found variant fills in its inventory item when none is typed yet.
watch(() => status.value.verified, (verified) => {
  const result = validationQuery.data.value
  if(verified && result?.shopifyInventoryItemId && !typedInventoryId.value) {
    form.value.shopifyInventoryItemId = result.shopifyInventoryItemId
    autoFilledInventoryId.value = result.shopifyInventoryItemId
  }
})

// ---- the products that already own Shopify IDs, shown with their identity rather than a bare ID ----
const router = useRouter()
const { identityOf } = useProductIdentity()
const blockingOwnerId = computed(() => {
  const owner = validationQuery.data.value?.ownerProductId ?? ""

  return mode.value === "manual" && status.value.blocked && owner && owner !== props.productId && !isOwnKey.value ? owner : ""
})
const ownerIds = computed(() => {
  const ids = new Set(Object.values(candidatesQuery.data.value?.owners ?? {}))
  if(blockingOwnerId.value) {ids.add(blockingOwnerId.value)}
  ids.delete(props.productId)

  return [...ids]
})
const { documentFor } = useProductDocuments(ownerIds)

function ownerLabel(ownerProductId: string) {
  const { primary, secondary } = identityOf(documentFor(ownerProductId) ?? { productId: ownerProductId })
  const name = secondary ? `${primary}, ${secondary}` : primary

  return name === ownerProductId ? ownerProductId : `${name} (${ownerProductId})`
}

// Opens the owning product in a new tab, so this modal and its unsaved input stay as they are.
function ownerHref(ownerProductId: string) {
  const document = documentFor(ownerProductId)
  const route = document ? familyRouteFor(normalizeProductSummary(document)) : { path: `/products/${ownerProductId}` }

  return router.resolve(route).href
}

const manualChanged = computed(() => !props.link ||
  typedId.value !== props.link.shopifyProductId || typedInventoryId.value !== props.link.shopifyInventoryItemId)

const canSave = computed(() => {
  if(!shopId.value) {return false}
  if(mode.value === "search") {return selectedCandidates.value.length > 0}

  return manualChanged.value && !status.value.blocked && (status.value.verified || (status.value.needsAcknowledgement && acknowledged.value))
})

function close() {
  modalController.dismiss(undefined, "cancel")
}

function save() {
  const links = mode.value === "search"
    ? selectedCandidates.value.map((candidate) => ({
      shopId: shopId.value,
      shopifyProductId: candidate.shopifyProductId,
      shopifyInventoryItemId: candidate.shopifyInventoryItemId
    }))
    : [{ shopId: shopId.value, shopifyProductId: typedId.value, shopifyInventoryItemId: typedInventoryId.value }]

  modalController.dismiss({ links }, "confirm")
}
</script>

<style scoped>
/* Room under the last row so the save button never covers it, as in the other apps' modals. */
ion-content {
  --padding-bottom: var(--spacer-2xl);
}
</style>
