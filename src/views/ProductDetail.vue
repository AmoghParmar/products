<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/products" />
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Product details") }}</ion-title>
        <ion-progress-bar
          v-if="coreLoading"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef">
      <ErrorState
        v-if="coreError"
        :title="translate('Product detail failed')"
        :message="coreErrorText"
        @retry="refetchCore"
      />

      <template v-else>
        <ProductHero
          :core="core"
          :family-anchor="heroFamilyAnchor"
          :product-types="productTypes"
          @edit="scrollToDisplay"
          @edit-image="onEditImageUrl"
        />

        <!-- family navigator: pick a variant by its feature combo (Color/Size) when feature data
             exists, else a thumbnail strip; a standalone product edits its own features -->
        <FeatureSelector
          :options="featureOptions"
          :selected="selectedVariantSelection"
          :show-add-variant="canAddVariant"
          @select="selectByFeature"
          @add-variant="addVariantModalOpen = true"
        />
        <VariantStrip
          :variants="variants"
          :selected-variant-id="selectedVariantId"
          @select="selectVariant"
        />
        <FeaturesSection
          :family-axes="familyFeatureAxes"
          :applied-feature-ids="appliedFeatureIds"
          :feature-types="featureTypes"
          :can-apply-features="canApplyFeatures"
          :can-remove-features="canRemoveFeatures"
          @toggle="onToggleFeature"
          @create-value="onCreateFeatureValue"
        />

        <ion-segment
          ref="segmentRef"
          v-if="hasParent"
          :value="segment"
          class="edit-segment"
          @ion-change="setSegment(($event.detail.value as 'parent' | 'variant') ?? 'variant')"
        >
          <ion-segment-button value="parent">
            <ion-label>{{ translate("Edit parent") }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="variant">
            <ion-label>{{ translate("Edit variant") }}</ion-label>
          </ion-segment-button>
        </ion-segment>

        <DisplayCard
          ref="displayCardRef"
          :draft="editor.display.draft"
          :product-types="productTypes"
          :dirty="editor.display.dirty.value || stagedComponents.length > 0"
          :saving="editor.saving.value"
          :stale-under-edit="editor.display.staleUnderEdit.value"
          :components="[...associationGroups.components, ...stagedComponentAssociations]"
          :can-edit="canEditProduct"
          @save="onSaveDisplayWithComponents"
          @reset="editor.display.reset"
          @add-component="openPicker('display-component')"
          @expire-component="onExpireOrRemoveComponent"
          @reactivate-component="onReactivateAssociation"
        />

        <ComponentsCard
          v-if="isKit"
          :components="associationGroups.components"
          :can-edit="canEditProduct"
          @add-component="openPicker('component')"
          @expire-component="onExpireAssociation"
          @reactivate-component="onReactivateAssociation"
        />

        <IdentificationsCard
          :product-id="editingProductId"
          :identifications="identifications"
          :identification-types="identificationTypes"
          :can-edit="canEditProduct"
          @add="onAddIdentification"
          @update-value="onUpdateIdentification"
          @expire="onExpireIdentification"
        />

        <DatesCard
          :draft="editor.dates.draft"
          :can-copy-from-parent="segment === 'variant' && hasParent"
          :dirty="editor.dates.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.dates.staleUnderEdit.value"
          :can-edit="canEditProduct"
          @save="saveDates"
          @reset="editor.dates.reset"
          @copy-from-parent="copyDatesFromParent"
        />

        <TagsCard
          :anchor-tags="anchorTags"
          :variant-tags="selectedVariantTags"
          :has-parent="hasParent"
          :segment="segment"
          :can-edit="canEditProduct"
          @add-tag="onAddTag"
          @remove-tag="onRemoveTag"
          @add-variant-tag="onAddVariantTag"
          @remove-variant-tag="onRemoveVariantTag"
        />

        <CategoriesCard
          :categories="categories"
          :can-edit="canEditProduct"
          @add="onAddCategory"
          @expire="onExpireCategory"
        />

        <PricesCard
          :rows="priceRows"
          :draft="priceDraft.draft"
          :dirty="priceDraft.dirty.value"
          :saving="pricesSaving"
          :stale-under-edit="priceDraft.staleUnderEdit.value"
          :can-copy-from-parent="segment === 'variant' && hasParent"
          :can-edit="canEditProduct"
          @save="onSavePrices"
          @reset="resetPrices"
          @copy-from-parent="onCopyPricesFromParent"
        />

        <ShopifyShopProductsCard
          :shopify-shop-products="shopifyShopProducts"
          :product-id="editingProductId"
          :product="shopifyListingProduct"
          :saving="shopifyMutations.upsert.isPending.value || shopifyMutations.remove.isPending.value"
          :can-edit="canEditProduct"
          @upsert="onUpsertShopifyShopProduct"
          @replace="onReplaceShopifyShopProduct"
          @remove="onRemoveShopifyShopProduct"
        />

        <InventoryPolicyCard
          :draft="editor.policy.draft"
          :substitutes="[...associationGroups.substitutes, ...stagedSubstituteAssociations]"
          :dirty="editor.policy.dirty.value || stagedSubstitutes.length > 0"
          :saving="editor.saving.value"
          :stale-under-edit="editor.policy.staleUnderEdit.value"
          :can-edit="canEditProduct"
          @save="onSavePolicyWithSubstitutes"
          @reset="onResetPolicy"
          @add-substitute="openPicker('substitute')"
          @expire-substitute="onExpireOrRemoveSubstitute"
          @reactivate-substitute="onReactivateAssociation"
        />

        <ShippingHandlingCard
          :draft="editor.shipping.draft"
          :box-types="boxTypes"
          :length-uoms="lengthUoms"
          :weight-uoms="weightUoms"
          :can-copy-from-parent="segment === 'variant' && hasParent"
          :dirty="editor.shipping.dirty.value"
          :saving="editor.saving.value"
          :stale-under-edit="editor.shipping.staleUnderEdit.value"
          :can-edit="canEditProduct"
          @save="saveShipping"
          @reset="editor.shipping.reset"
          @copy-from-parent="copyShippingFromParent"
        />

        <HistoryCard
          :entries="audit"
          :identification-type-labels="identificationTypeLabels"
        />

        <AddVariantModal
          :is-open="addVariantModalOpen"
          :feature-axes="uncoveredFeatureAxes"
          :parent-product-id="parentProductId"
          @created="onVariantCreated"
          @dismiss="addVariantModalOpen = false"
        />

        <ImageUrlModal
          :is-open="imageUrlModalOpen"
          :value="core?.imageUrl ?? ''"
          :saving="imageUrlSaving"
          @save="onSaveImageUrl"
          @dismiss="imageUrlModalOpen = false"
        />

        <ProductPicker
          :is-open="picker !== null"
          :title="picker === 'substitute' ? translate('Add substitute') : translate('Add components')"
          :exclude-product-ids="excludedPickerIds"
          @select="onPickProduct"
          @dismiss="picker = null"
        />
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBackButton, IonButtons, IonContent, IonHeader, IonLabel, IonMenuButton, IonPage, IonProgressBar, IonSegment,
  IonSegmentButton, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref, toRef, watch, type ComponentPublicInstance } from "vue"
import { onBeforeRouteLeave } from "vue-router"
import { useQuery, useQueryClient } from "@tanstack/vue-query"
import { qk } from "@/queries/keys"
import { translate } from "@common"
import ErrorState from "@/components/ErrorState.vue"
import ProductHero from "@/components/detail/ProductHero.vue"
import VariantStrip from "@/components/detail/VariantStrip.vue"
import FeatureSelector from "@/components/detail/FeatureSelector.vue"
import IdentificationsCard from "@/components/detail/IdentificationsCard.vue"
import FeaturesSection from "@/components/detail/FeaturesSection.vue"
import DisplayCard from "@/components/detail/DisplayCard.vue"
import DatesCard from "@/components/detail/DatesCard.vue"
import ComponentsCard from "@/components/detail/ComponentsCard.vue"
import InventoryPolicyCard from "@/components/detail/InventoryPolicyCard.vue"
import ShippingHandlingCard from "@/components/detail/ShippingHandlingCard.vue"
import HistoryCard from "@/components/detail/HistoryCard.vue"
import TagsCard from "@/components/detail/TagsCard.vue"
import CategoriesCard from "@/components/detail/CategoriesCard.vue"
import PricesCard from "@/components/detail/PricesCard.vue"
import ShopifyShopProductsCard from "@/components/detail/ShopifyShopProductsCard.vue"
import ProductPicker from "@/components/detail/ProductPicker.vue"
import AddVariantModal from "@/components/detail/AddVariantModal.vue"
import ImageUrlModal from "@/components/detail/ImageUrlModal.vue"
import { errorMessage } from "@/api/http"
import { useProductDetailData } from "@/composables/useProductDetailData"
import { useProductEditor } from "@/composables/useProductEditor"
import { useIdentificationMutations } from "@/mutations/useIdentificationMutations"
import { useAssociationMutations } from "@/mutations/useAssociationMutations"
import { useFeatureMutations } from "@/mutations/useFeatureMutations"
import { useTagMutations } from "@/mutations/useTagMutations"
import { useCategoryMutations } from "@/mutations/useCategoryMutations"
import { type ShopifyLinkKey, type ShopifyLinkPayload, useShopifyShopProductMutations } from "@/mutations/useShopifyShopProductMutations"
import { triggerSolrIndex, updateProductFields } from "@/api/pim"
import { useToast } from "@/composables/useToast"
import { featureTypesOptions, identificationTypesOptions, lengthUomOptions, weightUomOptions } from "@/queries/catalog"
import { productCoreOptions } from "@/queries/productDetail"
import { useCardDraft } from "@/composables/useCardDraft"
import { ASSOC_TYPE } from "@/domain/normalize/association"
import { FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import { productDisplayName } from "@/domain/normalize/product"
import { DEFAULT_PRICE_PURPOSE, type PriceRow, activePricesForRow, priceRowsForStoreGroup, purposeForNewPrice } from "@/domain/product/prices"
import type { FeatureAxis, ProductAssociation, ProductCategory, ProductCategoryMembership, ProductCore, ProductFeatureApplication, ProductPrice, ProductSummary } from "@/domain/types/product"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"
import { useUserStore } from "@/store/user"
import Actions from "@/authorization/actions"

const props = defineProps<{ productId: string }>()
const toast = useToast()
const userStore = useUserStore()

const canEditProduct = computed(() => userStore.hasPermission(Actions.APP_PRODUCT_UPDATE))
const canApplyFeatures = computed(() => userStore.hasPermission(Actions.APP_FEATURE_UPDATE))
const canRemoveFeatures = computed(() => userStore.hasPermission(Actions.APP_FEATURE_REMOVE))

const contentRef = ref<ComponentPublicInstance | null>(null)
const segmentRef = ref<ComponentPublicInstance | null>(null)
const displayCardRef = ref<ComponentPublicInstance | null>(null)

const currentProductStore = computed(() => useUserStore().getCurrentProductStore)

const scrollToDisplay = async () => {
  // scroll to the segment when it's visible (product has variants), otherwise the DisplayCard
  const target = segmentRef.value ?? displayCardRef.value
  const el = (target as any)?.$el as HTMLElement | undefined
  const content = (contentRef.value as any)?.$el as HTMLIonContentElement | undefined
  if(!el || !content) {return}
  const scrollEl = await content.getScrollElement()
  const offset = el.getBoundingClientRect().top - content.getBoundingClientRect().top + scrollEl.scrollTop
  content.scrollToPoint(0, offset, 400)
}

const detail = useProductDetailData(toRef(props, "productId"))
const {
  editingProductId, parentProductId, segment, setSegment, hasParent,
  variants, selectedVariantId, selectVariant,
  featureOptions, hasFeatureSelection, selectedVariantSelection, selectByFeature,
  core, coreLoading, coreError, coreErrorValue, refetchCore,
  identifications, associationGroups,
  familyFeatureAxes, editingFeatureAxes, featureFamilyId,
  audit, productTypes, boxTypes,
  anchorTags, selectedVariantTags,
  categories,
  prices,
  shopifyShopProducts
} = detail

const editor = useProductEditor(editingProductId, core, parentProductId)
const heroFamilyAnchor = computed(() => hasParent.value && core.value?.productId === parentProductId.value)

const identificationMutations = useIdentificationMutations(() => editingProductId.value, () => parentProductId.value)
const associationMutations = useAssociationMutations(() => editingProductId.value, () => parentProductId.value)
const categoryMutations = useCategoryMutations(() => editingProductId.value, () => parentProductId.value)
const shopifyMutations = useShopifyShopProductMutations(() => editingProductId.value, () => parentProductId.value)

// ---------- prices ----------
// A price belongs to a store group, not a single store. Only the prices that already exist for the
// selected store's group are shown, one per price type and currency; none can be added here.
const storeCurrencyUomId = computed(() => currentProductStore.value.defaultCurrencyUomId || currentProductStore.value.currencyUomId)
const copiedPriceRows = ref<PriceRow[]>([])
const storeGroupPriceRows = computed(() => priceRowsForStoreGroup(prices.value, currentProductStore.value.primaryStoreGroupId, storeCurrencyUomId.value))
const priceRows = computed(() => {
  const base = storeGroupPriceRows.value
  const baseKeys = new Set(base.map((row) => row.key))
  const additions = copiedPriceRows.value.filter((row) => !baseKeys.has(row.key))

  return [...base, ...additions]
})

const expirePricePayload = (price: ProductPrice, thruDate: string) => ({
  productPriceTypeId: price.productPriceTypeId,
  currencyUomId: price.currencyUomId,
  productPricePurposeId: price.productPricePurposeId || DEFAULT_PRICE_PURPOSE,
  productStoreId: price.productStoreId || currentProductStore.value.productStoreId,
  productStoreGroupId: price.productStoreGroupId || currentProductStore.value.primaryStoreGroupId,
  fromDate: price.fromDate,
  thruDate
})

const priceSource = computed(() => {
  const entries = storeGroupPriceRows.value.map((row) => [row.key, row.price.price.toString()])

  return Object.fromEntries(entries) as Record<string, string>
})

const priceDraft = useCardDraft(priceSource)
const pricesSaving = ref(false)

const resetPrices = () => {
  priceDraft.reset()
  copiedPriceRows.value = []
}

// When switching between parent and variant, force-reset the draft so stale edits
// from the previous product don't keep dirty=true on the new one.
watch(editingProductId, () => resetPrices())

const onSavePrices = async () => {
  if(!canEditProduct.value) {return}
  if(pricesSaving.value) {return}
  pricesSaving.value = true
  try {
    const now = new Date().toISOString()
    const productStoreGroupId = currentProductStore.value.primaryStoreGroupId

    // Only shown prices are edited: each changed one is retired and replaced, keeping its purpose.
    const pricePayload = priceRows.value.flatMap((row) => {
      const draftVal = (priceDraft.draft[row.key] ?? "").trim()
      if(!draftVal || draftVal === (priceSource.value[row.key] ?? "").trim()) {return []}

      const replacedPrices = activePricesForRow(prices.value, row.productPriceTypeId, row.currencyUomId, productStoreGroupId)

      return [
        ...replacedPrices.map((price) => expirePricePayload(price, now)),
        {
          productPriceTypeId: row.productPriceTypeId,
          currencyUomId: row.currencyUomId,
          price: Number(draftVal),
          productPricePurposeId: purposeForNewPrice(replacedPrices.length ? replacedPrices : [row.price]),
          productStoreId: currentProductStore.value.productStoreId,
          productStoreGroupId
        }
      ]
    })

    if(!pricePayload.length) {return}

    await updateProductFields(editingProductId.value, { prices: pricePayload })

    triggerSolrIndex(editingProductId.value, { indexVariants: false })
    copiedPriceRows.value = []
    await queryClient.invalidateQueries({ queryKey: qk.product.core(editingProductId.value) })
    toast.success(translate("Prices saved"))
  } catch(error) {
    toast.error(error, translate("Could not save prices"))
  } finally {
    pricesSaving.value = false
  }
}

const onCopyPricesFromParent = async () => {
  if(!canEditProduct.value) {return}
  if(!parentProductId.value) {return}
  const parent = await queryClient.ensureQueryData(productCoreOptions(parentProductId.value))
  const parentRows = priceRowsForStoreGroup(parent.prices, currentProductStore.value.primaryStoreGroupId, storeCurrencyUomId.value)
  if(!parentRows.length) {
    toast.error(null, translate("Parent product has no prices in this store group."))

    return
  }
  copiedPriceRows.value = parentRows
  for(const parentRow of parentRows) {
    priceDraft.draft[parentRow.key] = parentRow.price.price.toString()
  }
}

// tags on the anchor (virtual) product
const tagMutations = useTagMutations(() => parentProductId.value, { parentProductId: () => parentProductId.value })
// tags on the selected variant — uses family cache path
const variantTagMutations = useTagMutations(() => selectedVariantId.value, { anchorProductId: () => parentProductId.value, parentProductId: () => parentProductId.value })

// ---------- tags ----------
const onAddTag = (tag: string) => {
  if(!canEditProduct.value) {return}
  tagMutations.add.mutateAsync(tag).catch((error) => toast.error(error, translate("Could not add tag")))
}
const onRemoveTag = (tag: string) => {
  if(!canEditProduct.value) {return}
  tagMutations.remove.mutateAsync(tag).catch((error) => toast.error(error, translate("Could not remove tag")))
}
const onAddVariantTag = (tag: string) => {
  if(!canEditProduct.value) {return}
  variantTagMutations.add.mutateAsync(tag).catch((error) => toast.error(error, translate("Could not add tag")))
}
const onRemoveVariantTag = (tag: string) => {
  if(!canEditProduct.value) {return}
  variantTagMutations.remove.mutateAsync(tag).catch((error) => toast.error(error, translate("Could not remove tag")))
}

// ---------- categories ----------
const onAddCategory = (cat: ProductCategory) => {
  if(!canEditProduct.value) {return}
  categoryMutations.add
    .mutateAsync({ productCategoryId: cat.productCategoryId, categoryName: cat.categoryName })
    .catch((error) => toast.error(error, translate("Could not add category")))
}
const onExpireCategory = (mem: ProductCategoryMembership) => {
  if(!canEditProduct.value) {return}
  categoryMutations.expire
    .mutateAsync({ productCategoryId: mem.productCategoryId, fromDate: mem.fromDate })
    .catch((error) => toast.error(error, translate("Could not remove category")))
}

// ---------- shopify shop products ----------
// What the live Shopify check needs: a variant is matched by its SKU, a virtual through one of its variants.
const shopifyListingProduct = computed(() => ({
  sku: identifications.value.find((row) => row.active && row.goodIdentificationTypeId === "SKU")?.idValue ?? "",
  isVirtual: Boolean(core.value?.isVirtual),
  childSku: variants.value.find((variant) => variant.sku)?.sku ?? ""
}))
const onUpsertShopifyShopProduct = (payload: ShopifyLinkPayload) => {
  if(!canEditProduct.value) {return}
  shopifyMutations.upsert.mutateAsync(payload).catch((error) => toast.error(error, translate("Could not save Shopify shop product")))
}
const onReplaceShopifyShopProduct = (change: { from: ShopifyLinkKey; to: ShopifyLinkPayload }) => {
  if(!canEditProduct.value) {return}
  shopifyMutations.replace.mutateAsync(change).catch((error) => toast.error(error, translate("Could not save Shopify shop product")))
}
const onRemoveShopifyShopProduct = (key: ShopifyLinkKey) => {
  if(!canEditProduct.value) {return}
  shopifyMutations.remove.mutateAsync(key).catch((error) => toast.error(error, translate("Could not remove Shopify shop product")))
}
// feature edits apply to whichever family member is being edited
const featureMutations = useFeatureMutations(() => editingProductId.value, () => parentProductId.value)
// "new value" chips extend the family's selectable axes on the parent
const familyFeatureMutations = useFeatureMutations(() => featureFamilyId.value, () => parentProductId.value)

const identificationTypesQuery = useQuery(identificationTypesOptions())
const featureTypesQuery = useQuery(featureTypesOptions())
const lengthUomsQuery = useQuery(lengthUomOptions())
const weightUomsQuery = useQuery(weightUomOptions())
const identificationTypes = computed(() => identificationTypesQuery.data.value ?? [])
// Labels for the history: the type list, plus the descriptions this product's own identifications carry
// (SKU, for one, is not in the type list).
const identificationTypeLabels = computed<Record<string, string>>(() => ({
  ...Object.fromEntries(identifications.value.map((row) => [row.goodIdentificationTypeId, row.typeDescription || row.goodIdentificationTypeId])),
  ...Object.fromEntries(identificationTypes.value.map((option) => [option.id, option.label]))
}))
const featureTypes = computed(() => featureTypesQuery.data.value ?? [])
const lengthUoms = computed(() => lengthUomsQuery.data.value ?? [])
const weightUoms = computed(() => weightUomsQuery.data.value ?? [])

const coreErrorText = computed(() => errorMessage(coreErrorValue.value, translate("Could not load this product")))

const imageUrlModalOpen = ref(false)
const imageUrlSaving = ref(false)

const onEditImageUrl = () => {
  imageUrlModalOpen.value = true
}

const setCachedProductImage = (productId: string, imageUrl: string) => {
  queryClient.setQueryData<ProductCore | undefined>(qk.product.core(productId), (product: ProductCore | undefined) =>
    product ? { ...product, imageUrl } : product)
  queryClient.setQueryData<ProductSummary | null | undefined>(qk.product.solr(productId), (product: ProductSummary | null | undefined) =>
    product ? { ...product, imageUrl } : product)
  queryClient.setQueryData<ProductSummary[] | undefined>(qk.product.family(parentProductId.value), (members: ProductSummary[] | undefined) =>
    members?.map((member) => member.productId === productId ? { ...member, imageUrl } : member))
}

const onSaveImageUrl = async (imageUrl: string) => {
  if(imageUrl === (core.value?.imageUrl ?? "")) {return}
  imageUrlSaving.value = true

  try {
    const productId = editingProductId.value
    await updateProductFields(productId, { detailImageUrl: imageUrl })
    triggerSolrIndex(productId, { indexVariants: false })
    setCachedProductImage(productId, imageUrl)
    await queryClient.invalidateQueries({ queryKey: qk.product.core(productId) })
    // Mark family and workbench queries as stale without triggering an immediate
    // refetch — the optimistic update from setCachedProductImage keeps the UI
    // current until the next natural refetch (e.g. on navigation).
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.product.family(parentProductId.value), refetchType: "none" }),
      queryClient.invalidateQueries({ queryKey: qk.products.all, refetchType: "active" })
    ])
    imageUrlModalOpen.value = false
    toast.success(translate("Saved"))
  } catch(error) {
    toast.error(error, translate("Could not save image URL"))
  } finally {
    imageUrlSaving.value = false
  }
}

const isKit = computed(() => {
  const typeId = core.value?.productTypeId ?? ""
  return typeId.startsWith("MARKETING_PKG") && typeId !== "MARKETING_PKG_PICK"
})

const saveDates = () => {
  if(canEditProduct.value) {editor.saveDates()}
}
const saveShipping = () => {
  if(canEditProduct.value) {editor.saveShipping()}
}
const copyDatesFromParent = () => {
  if(canEditProduct.value) {editor.copyFromParent("dates")}
}
const copyShippingFromParent = () => {
  if(canEditProduct.value) {editor.copyFromParent("shipping")}
}

// ---------- identifications ----------
const onAddIdentification = (payload: IdentificationCreate) => {
  if(!canEditProduct.value) {return}
  identificationMutations.add.mutateAsync(payload).catch((error) => toast.error(error, translate("Could not add identification")))
}
const onUpdateIdentification = (payload: { key: IdentificationKey; idValue: string }) => {
  if(!canEditProduct.value) {return}
  identificationMutations.update.mutateAsync(payload).catch((error) => toast.error(error, translate("Could not update identification")))
}
const onExpireIdentification = (key: IdentificationKey) => {
  if(!canEditProduct.value) {return}
  identificationMutations.expire.mutateAsync(key).catch((error) => toast.error(error, translate("Could not expire identification")))
}

// ---------- features ----------
const appliedFeatureIds = computed(() => new Set(editingFeatureAxes.value.flatMap((axis: FeatureAxis) => axis.applications.map((appl) => appl.productFeatureId))))

const onToggleFeature = (payload: { axis: FeatureAxis; application: ProductFeatureApplication; applied: boolean }) => {
  if(payload.applied && !canRemoveFeatures.value) {return}
  if(!payload.applied && !canApplyFeatures.value) {return}

  const editingParent = segment.value === "parent" || !hasParent.value
  const applType = editingParent ? FEATURE_APPL_TYPE.selectable : FEATURE_APPL_TYPE.standard
  if(payload.applied) {
    // const existing = editingFeatureAxes.value
    //   .flatMap((axis: FeatureAxis) => axis.applications)
    //   .find((appl: ProductFeatureApplication) => appl.productFeatureId === payload.application.productFeatureId)
    // console.log('existing', existing)
    // if(!existing) {return}
    featureMutations.remove
      .mutateAsync({ productId: parentProductId.value, productFeatureId: payload.application.productFeatureId, fromDate: payload.application.fromDate })
      .catch((error) => toast.error(error, translate("Could not remove feature")))
  } else {
    featureMutations.apply
      .mutateAsync({
        productFeatureId: payload.application.productFeatureId,
        productFeatureApplTypeId: applType,
        description: payload.application.description,
        featureTypeId: payload.axis.featureTypeId,
        featureTypeDescription: payload.axis.featureTypeDescription
      })
      .catch((error) => toast.error(error, translate("Could not apply feature")))
  }
}

const onCreateFeatureValue = (payload: { featureTypeId: string; description: string }) => {
  if(!canApplyFeatures.value) {return}

  familyFeatureMutations.createAndApply
    .mutateAsync({
      productFeatureTypeId: payload.featureTypeId,
      description: payload.description,
      productFeatureApplTypeId: FEATURE_APPL_TYPE.selectable
    })
    .then(() => toast.success(`${payload.description} ${translate("added")}`))
    .catch((error) => toast.error(error, translate("Could not add feature")))
}

// ---------- add variant from feature combination ----------
const addVariantModalOpen = ref(false)
const queryClient = useQueryClient()

/**
 * Compute all uncovered feature combinations using the Cartesian product of the parent's
 * selectable feature axes, then exclude every combination already represented by an existing
 * variant (matched via FamilyVariant.selection which maps featureTypeDescription → value).
 *
 * From the uncovered set, derive which individual feature values are still "useful" (i.e.
 * they participate in at least one uncovered combination) and return a filtered FeatureAxis[]
 * containing only those values.  If every combination is already covered the result is [].
 */
const uncoveredFeatureAxes = computed(() => {
  if(!familyFeatureAxes.value.length) {return []}

  // featureOptions (Solr-derived) axis keys exactly match variant.selection keys — both come
  // from parsing featureValues tokens.  familyFeatureAxes (OMS-derived) featureTypeDescription
  // may differ in casing or format.  Bridge them by value-description overlap:
  // ProductFeature.description is the same in both OMS and Solr, so finding a featureOptions
  // entry that shares at least one value description reliably maps the OMS axis to its Solr key.
  const featureOptionsByValues = featureOptions.value.map((opt) => ({
    solrKey: opt.axis,
    valueSet: new Set(opt.values)
  }))

  const getSolrKey = (axis: (typeof familyFeatureAxes.value)[0]): string => {
    const appDescriptions = axis.applications.map((a) => a.description)
    const match = featureOptionsByValues.find((opt) =>
      appDescriptions.some((d) => opt.valueSet.has(d))
    )

    // Fall back to OMS featureTypeDescription for axes with no existing variants yet
    return match?.solrKey ?? axis.featureTypeDescription
  }

  // Pair each OMS axis with its Solr-consistent key
  const axisWithKeys = familyFeatureAxes.value.map((axis) => ({
    featureAxis: axis,
    solrKey: getSolrKey(axis)
  }))

  // Cartesian product over all possible (solrKey, values) pairs
  const possibleAxes = axisWithKeys.map(({ featureAxis, solrKey }) => ({
    key: solrKey,
    values: featureAxis.applications.map((a) => a.description)
  }))

  const cartesian = (axes: typeof possibleAxes): Record<string, string>[] => {
    if(!axes.length) {return [{}]}
    const [first, ...rest] = axes
    const restCombos = cartesian(rest)

    return first.values.flatMap((v) => restCombos.map((c) => ({ ...c, [first.key]: v })))
  }

  const allCombos = cartesian(possibleAxes)

  // Coverage check — uses the same Solr keys as variant.selection
  const isCovered = (combo: Record<string, string>) =>
    variants.value.some((variant) =>
      Object.entries(combo).every(([key, value]) => variant.selection[key] === value)
    )

  const uncovered = allCombos.filter((combo) => !isCovered(combo))
  if(!uncovered.length) {return []}

  // Collect which values per Solr key appear in at least one uncovered combination
  const validByKey = new Map<string, Set<string>>()
  for(const combo of uncovered) {
    for(const [key, value] of Object.entries(combo)) {
      if(!validByKey.has(key)) {validByKey.set(key, new Set())}
      validByKey.get(key)!.add(value)
    }
  }

  // Map back to FeatureAxis[], keeping only applications that participate in uncovered combos
  return axisWithKeys
    .map(({ featureAxis, solrKey }) => ({
      ...featureAxis,
      applications: featureAxis.applications.filter(
        (appl) => validByKey.get(solrKey)?.has(appl.description) ?? false
      )
    }))
    .filter((axis) => axis.applications.length > 0)
})

// Show "Add variant" only on the Edit parent tab (virtual product level) when uncovered combos exist
const canAddVariant = computed(
  () => segment.value === "parent" && hasParent.value && uncoveredFeatureAxes.value.length > 0
)

const onVariantCreated = async (productId: string) => {
  addVariantModalOpen.value = false
  await queryClient.invalidateQueries({ queryKey: qk.product.family(parentProductId.value) })
  selectVariant(productId)
  toast.success(translate("Variant created"))
}

// ---------- associations (substitutes + kit components) ----------
const picker = ref<null | "substitute" | "component" | "display-component">(null)

const openPicker = (type: "substitute" | "component" | "display-component") => {
  if(canEditProduct.value) {picker.value = type}
}

// Components staged inside DisplayCard (MARKETING_PKG_PICK) — saved only on footer Save
const stagedComponents = ref<Array<{ product: ProductSummary; quantity: number }>>([])

const stagedComponentAssociations = computed<ProductAssociation[]>(() =>
  stagedComponents.value.map(({ product, quantity }) => ({
    productId: editingProductId.value,
    productIdTo: product.productId,
    productAssocTypeId: ASSOC_TYPE.component,
    fromDate: "",
    thruDate: undefined,
    active: true,
    direction: "outgoing" as const,
    sequenceNum: null,
    quantity,
    scrapFactor: null,
    instruction: "",
    reason: "",
    relatedProductId: product.productId,
    relatedName: productDisplayName(product),
    relatedSku: product.sku,
    relatedImageUrl: product.imageUrl
  }))
)

// Substitutes staged inside InventoryPolicyCard — saved only on footer Save
const stagedSubstitutes = ref<Array<{ product: ProductSummary; quantity: number }>>([])

const stagedSubstituteAssociations = computed<ProductAssociation[]>(() =>
  stagedSubstitutes.value.map(({ product, quantity }) => ({
    productId: editingProductId.value,
    productIdTo: product.productId,
    productAssocTypeId: ASSOC_TYPE.substitute,
    fromDate: "",
    thruDate: undefined,
    active: true,
    direction: "outgoing" as const,
    sequenceNum: null,
    quantity,
    scrapFactor: null,
    instruction: "",
    reason: "",
    relatedProductId: product.productId,
    relatedName: productDisplayName(product),
    relatedSku: product.sku,
    relatedImageUrl: product.imageUrl
  }))
)

const excludedPickerIds = computed(() => [
  editingProductId.value,
  ...associationGroups.value.substitutes.map((assoc: ProductAssociation) => assoc.relatedProductId),
  ...associationGroups.value.components.map((assoc: ProductAssociation) => assoc.relatedProductId),
  ...stagedComponents.value.map(({ product }) => product.productId),
  ...stagedSubstitutes.value.map(({ product }) => product.productId)
])

const onPickProduct = (items: Array<{ product: ProductSummary; quantity: number }>) => {
  if(!canEditProduct.value) {
    picker.value = null

    return
  }

  if(picker.value === "display-component") {
    picker.value = null
    for(const item of items) { stagedComponents.value.push(item) }
    return
  }
  if(picker.value === "substitute") {
    picker.value = null
    for(const item of items) { stagedSubstitutes.value.push(item) }
    return
  }
  // kit component — save immediately
  picker.value = null
  for(const { product, quantity } of items) {
    associationMutations.add
      .mutateAsync({
        productIdTo: product.productId,
        productAssocTypeId: ASSOC_TYPE.component,
        quantity,
        relatedName: productDisplayName(product),
        relatedSku: product.sku,
        relatedImageUrl: product.imageUrl
      })
      .catch((error) => toast.error(error, translate("Could not add link")))
  }
  toast.success(translate("Link(s) added"))
}

// Save display fields first, then flush staged components as associations
const onSaveDisplayWithComponents = async () => {
  if(!canEditProduct.value) {return}
  await editor.saveDisplay()
  const toCreate = [...stagedComponents.value]
  stagedComponents.value = []
  for(const { product, quantity } of toCreate) {
    await associationMutations.add
      .mutateAsync({
        productIdTo: product.productId,
        productAssocTypeId: ASSOC_TYPE.component,
        quantity,
        relatedName: productDisplayName(product),
        relatedSku: product.sku,
        relatedImageUrl: product.imageUrl
      })
      .catch((error) => toast.error(error, translate("Could not add component")))
  }
}

// Save policy fields first, then flush staged substitutes
const onSavePolicyWithSubstitutes = async () => {
  if(!canEditProduct.value) {return}
  await editor.savePolicy()
  const toCreate = [...stagedSubstitutes.value]
  stagedSubstitutes.value = []
  for(const { product } of toCreate) {
    await associationMutations.add
      .mutateAsync({
        productIdTo: product.productId,
        productAssocTypeId: ASSOC_TYPE.substitute,
        relatedName: productDisplayName(product),
        relatedSku: product.sku,
        relatedImageUrl: product.imageUrl
      })
      .catch((error) => toast.error(error, translate("Could not add substitute")))
  }
}

const onResetPolicy = () => {
  editor.policy.reset()
  stagedSubstitutes.value = []
}

const assocKey = (assoc: ProductAssociation) => ({
  productIdTo: assoc.productIdTo,
  productAssocTypeId: assoc.productAssocTypeId,
  fromDate: assoc.fromDate
})

const onExpireAssociation = (assoc: ProductAssociation) => {
  if(!canEditProduct.value) {return}

  associationMutations.expire
    .mutateAsync({ key: assocKey(assoc) })
    .catch((error) => toast.error(error, translate("Could not expire link")))
}

// For DisplayCard components: remove staged items locally; expire already-saved ones via API
const onExpireOrRemoveComponent = (assoc: ProductAssociation) => {
  const stagedIdx = stagedComponents.value.findIndex(({ product }) => product.productId === assoc.relatedProductId)
  if(stagedIdx !== -1) {
    stagedComponents.value.splice(stagedIdx, 1)
    return
  }
  onExpireAssociation(assoc)
}

// For InventoryPolicyCard substitutes: remove staged items locally; expire already-saved ones via API
const onExpireOrRemoveSubstitute = (assoc: ProductAssociation) => {
  const stagedIdx = stagedSubstitutes.value.findIndex(({ product }) => product.productId === assoc.relatedProductId)
  if(stagedIdx !== -1) {
    stagedSubstitutes.value.splice(stagedIdx, 1)
    return
  }
  onExpireAssociation(assoc)
}

const onReactivateAssociation = (assoc: ProductAssociation) => {
  if(!canEditProduct.value) {return}

  associationMutations.reactivate
    .mutateAsync(assocKey(assoc))
    .catch((error) => toast.error(error, translate("Could not reactivate link")))
}

// ---------- unsaved-changes guard ----------
onBeforeRouteLeave(async () => {
  if(!editor.anyDirty.value) {return true}
  const alert = await alertController.create({
    header: translate("Discard changes?"),
    message: translate("You have unsaved edits on this product."),
    buttons: [
      { text: translate("Keep editing"), role: "cancel" },
      { text: translate("Discard"), role: "destructive" }
    ]
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()

  return role === "destructive"
})
</script>

<style scoped>
.edit-segment {
  max-width: 320px;
  margin: 8px 16px;
}
</style>
