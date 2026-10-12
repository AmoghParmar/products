<template>
  <CardSection
    ref="cardRef"
    :title="translate('Shopify Shop Products')"
  >
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        :disabled="saving"
        @click="openEditor()"
      >
        <ion-icon
          slot="start"
          :icon="addOutline"
        />
        {{ translate("Add") }}
      </ion-button>
    </template>

    <!-- Rows use @common's .list-item grid, as the calendar and the Order Manager find pages do: the
         shop, the two Shopify IDs (desktop), the live Shopify figures (tablet and up), and the actions.
         Once the card is on screen each link is checked against Shopify. -->
    <div class="shopify-shop-products">
      <div
        v-for="row in shopifyShopProducts"
        :key="shopifyLinkKey(row)"
        class="list-item shopify-shop-product-row"
      >
        <ion-item lines="none">
          <ion-label>
            {{ shopName(row.shopId) }}
            <p>{{ row.shopId }}</p>
            <ion-note
              v-if="issueText(row)"
              color="warning"
            >
              {{ issueText(row) }}
            </ion-note>
          </ion-label>
        </ion-item>
        <!-- Each value sits in an ion-item, like the shop column, so it takes the item's text color
           rather than the card's muted one, which made values dimmer than their own labels. -->
        <ion-item
          class="shopify-id-column"
          lines="none"
        >
          <ion-label class="ion-text-center">
            {{ row.shopifyProductId || "-" }}
            <p>{{ translate("Shopify product ID") }}</p>
          </ion-label>
        </ion-item>
        <ion-item
          class="shopify-id-column"
          lines="none"
        >
          <ion-label class="ion-text-center">
            {{ row.shopifyInventoryItemId || "-" }}
            <p>{{ translate("Shopify inventory ID") }}</p>
          </ion-label>
        </ion-item>
        <ion-item
          class="tablet"
          lines="none"
        >
          <ion-label class="ion-text-center">
            <ion-skeleton-text
              v-if="isChecking"
              animated
            />
            <template v-else>
              {{ countText(checkFor(row)?.orders30) }}
            </template>
            <p>{{ translate("Orders, last 30 days") }}</p>
          </ion-label>
        </ion-item>
        <ion-item
          class="tablet"
          lines="none"
        >
          <ion-label class="ion-text-center">
            <ion-skeleton-text
              v-if="isChecking"
              animated
            />
            <template v-else>
              {{ countText(checkFor(row)?.inventory) }}
            </template>
            <p>{{ translate("Shopify inventory") }}</p>
          </ion-label>
        </ion-item>
        <div>
          <ion-button
            v-if="shopifyAdminUrl(row)"
            fill="clear"
            :href="shopifyAdminUrl(row)"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="translate('Open on Shopify')"
            :title="translate('Open on Shopify')"
          >
            <ion-icon
              slot="icon-only"
              :icon="openOutline"
            />
          </ion-button>
          <template v-if="canEdit">
            <ion-button
              v-if="checkFor(row)?.suggestion"
              fill="clear"
              color="warning"
              :aria-label="translate('Review Shopify values')"
              :title="translate('Review Shopify values')"
              :disabled="saving"
              @click="openEditor(row, checkFor(row)?.suggestion ?? undefined)"
            >
              <ion-icon
                slot="icon-only"
                :icon="syncOutline"
              />
            </ion-button>
            <ion-button
              fill="clear"
              :aria-label="translate('Edit')"
              :disabled="saving"
              @click="openEditor(row)"
            >
              <ion-icon
                slot="icon-only"
                :icon="pencilOutline"
              />
            </ion-button>
            <ion-button
              fill="clear"
              color="danger"
              :aria-label="translate('Remove')"
              :disabled="saving"
              @click="$emit('remove', { shopId: row.shopId, shopifyProductId: row.shopifyProductId })"
            >
              <ion-icon
                slot="icon-only"
                :icon="closeOutline"
              />
            </ion-button>
          </template>
        </div>
      </div>
    </div>

    <ion-item
      v-if="!shopifyShopProducts.length"
      lines="none"
    >
      <ion-label>{{ translate("No Shopify shops linked") }}</ion-label>
    </ion-item>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonIcon, IonItem, IonLabel, IonNote, IonSkeletonText, modalController } from "@ionic/vue"
import { useQuery } from "@tanstack/vue-query"
import { addOutline, closeOutline, openOutline, pencilOutline, syncOutline } from "ionicons/icons"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import CardSection from "@/components/common/CardSection.vue"
import ShopifyShopProductModal from "@/components/detail/ShopifyShopProductModal.vue"
import { type ListingCheckIssue, type ListingCheckProduct, type ListingCheckSuggestion, type ShopifyListingCheck, shopifyLinkKey } from "@/domain/shopify/listingCheck"
import type { ShopifyShopProduct } from "@/domain/types/product"
import { shopifyShopsOptions } from "@/queries/catalog"
import { shopifyListingChecksOptions } from "@/queries/productDetail"

type ShopifyShopProductPayload = { shopId: string; shopifyProductId: string; shopifyInventoryItemId: string }

const props = withDefaults(defineProps<{
  shopifyShopProducts: ShopifyShopProduct[]
  saving: boolean
  /** The product being edited, for the live Shopify check. */
  productId: string
  product: ListingCheckProduct
  /** False while the product's own data is loading, when `product` is still a placeholder: a check or an
   *  edit then would look the Shopify ID up as the wrong kind of product. */
  productReady?: boolean
  canEdit?: boolean
}>(), {
  productReady: true,
  canEdit: true
})

const emit = defineEmits<{
  (event: "upsert", payload: ShopifyShopProductPayload): void
  (event: "replace", change: { from: ShopifyShopProduct; to: ShopifyShopProductPayload }): void
  (event: "remove", key: { shopId: string; shopifyProductId: string }): void
}>()

const shopsQuery = useQuery(shopifyShopsOptions())
const shops = computed(() => shopsQuery.data.value ?? [])

function shopName(shopId: string) {
  return shops.value.find((shop) => shop.shopId === shopId)?.name || shopId
}

// ---- live Shopify check, started the first time the card is on screen ----
const cardRef = ref()
const isVisible = ref(false)
let observer: IntersectionObserver | undefined

onMounted(() => {
  const element = cardRef.value?.$el as Element | undefined
  if(!element) {return}

  observer = new IntersectionObserver((entries) => {
    if(entries.some((entry) => entry.isIntersecting)) {
      isVisible.value = true
      observer?.disconnect()
    }
  })
  observer.observe(element)
})
onBeforeUnmount(() => observer?.disconnect())

const checksQuery = useQuery(computed(() => shopifyListingChecksOptions({
  productId: props.productId,
  product: props.product,
  links: props.shopifyShopProducts,
  shops: shops.value,
  enabled: isVisible.value && props.productReady
})))
const isChecking = computed(() => checksQuery.isFetching.value && !checksQuery.isPlaceholderData.value && !checksQuery.data.value)

// Checks are kept per link (shop plus Shopify ID), since a product can have several links to one shop.
function checkFor(link: ShopifyShopProduct): ShopifyListingCheck | undefined {
  const result = checksQuery.data.value?.[shopifyLinkKey(link)]

  return result && !("error" in result) ? result : undefined
}

const ISSUE_TEXT: Record<ListingCheckIssue, string> = {
  missing: "No Shopify ID saved",
  notFound: "Not found on Shopify",
  inventoryMismatch: "Inventory ID differs on Shopify"
}

function issueText(link: ShopifyShopProduct) {
  const result = checksQuery.data.value?.[shopifyLinkKey(link)]
  if(!result) {return ""}
  if("error" in result) {return translate("Could not check Shopify")}

  return result.issue ? translate(ISSUE_TEXT[result.issue]) : ""
}

// Shopify admin for a mapping that validated: the shop's myshopify domain redirects into admin.shopify.com.
function shopifyAdminUrl(link: ShopifyShopProduct) {
  const adminPath = checkFor(link)?.adminPath
  const domain = shops.value.find((shop) => shop.shopId === link.shopId)?.domain

  return adminPath && domain ? `https://${domain}/admin/${adminPath}` : ""
}

function countText(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "-"
}

// Adding, editing and reviewing Shopify's values share one modal: without a row it adds a link, and
// with a suggestion it starts from the values found on Shopify.
let isEditorOpen = false
async function openEditor(link?: ShopifyShopProduct, suggested?: ListingCheckSuggestion) {
  if(!props.canEdit || !props.productReady || isEditorOpen) {return}

  isEditorOpen = true
  try {
    const modal = await modalController.create({
      component: ShopifyShopProductModal,
      componentProps: { shops: shops.value, productId: props.productId, product: props.product, link, suggested }
    })
    await modal.present()
    const { data, role } = await modal.onWillDismiss<{ links: ShopifyShopProductPayload[] }>()
    if(role !== "confirm" || !data?.links.length) {return}

    // Editing can change the Shopify ID, which is part of the link's key, so it replaces the link.
    if(link) {emit("replace", { from: link, to: data.links[0] })} else {data.links.forEach((payload) => emit("upsert", payload))}
  } finally {
    isEditorOpen = false
  }
}
</script>

<style scoped>
/* Columns follow the card's own width, which the detail layout varies, rather than the window's: shop,
   the two live Shopify figures and the actions always; the two Shopify IDs only when the card has room
   for six unwrapped columns (they stay in the edit modal). */
.shopify-shop-products {
  container-type: inline-size;
}

.shopify-shop-product-row {
  --columns-desktop: 4;
  --columns-tablet: 4;
  border-block-start: var(--border-medium);
}

.shopify-shop-product-row > .shopify-id-column {
  display: none;
}

@container (min-width: 1000px) {
  .shopify-shop-product-row {
    --columns-desktop: 6;
    --columns-tablet: 6;
  }

  .shopify-shop-product-row > .shopify-id-column {
    display: unset;
  }
}

/* A centered grid cell would shrink each column's item to its narrowest content and wrap its label. */
.shopify-shop-product-row > ion-item {
  width: 100%;
}
</style>
