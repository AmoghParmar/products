<template>
  <ion-item
    lines="none"
    class="assoc-item"
  >
    <!-- The Solr document when the card found one; until then the association's own name and image. -->
    <ProductIdentity :product="product ?? fallbackProduct">
      <p v-if="quantityLabel">
        {{ quantityLabel }}
      </p>
      <ion-note
        v-if="expiryLabel"
        color="warning"
      >
        {{ expiryLabel }}
      </ion-note>
    </ProductIdentity>
    <ion-button
      v-if="canEdit && association.active"
      slot="end"
      fill="clear"
      color="danger"
      size="small"
      @click="$emit('expire')"
    >
      {{ translate("Expire") }}
    </ion-button>
    <ion-button
      v-else-if="canEdit"
      slot="end"
      fill="clear"
      size="small"
      @click="$emit('reactivate')"
    >
      {{ translate("Reactivate") }}
    </ion-button>
  </ion-item>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonItem, IonNote } from "@ionic/vue"
import { computed } from "vue"
import ProductIdentity from "@/components/ProductIdentity.vue"
import { expiresInDays } from "@/domain/normalize/association"
import type { ProductAssociation } from "@/domain/types/product"

const props = withDefaults(defineProps<{
  association: ProductAssociation
  /** The related product's Solr document, for the product identifier setting. */
  product?: Record<string, unknown>
  canEdit?: boolean
  showQuantity?: boolean
}>(), {
  product: undefined,
  canEdit: true,
  showQuantity: false
})

defineEmits<{
  (event: "expire"): void
  (event: "reactivate"): void
}>()

const fallbackProduct = computed(() => ({
  productId: props.association.relatedProductId,
  productName: props.association.relatedName,
  imageUrl: props.association.relatedImageUrl
}))

const quantityLabel = computed(() => props.showQuantity && props.association.quantity
  ? translate("Quantity {quantity}", { quantity: props.association.quantity })
  : "")

const expiryLabel = computed(() => {
  const days = expiresInDays(props.association)
  if(days === null) {return ""}
  if(days === 0) {return translate("Expired")}

  return `${translate("expires in")} ${days} ${days === 1 ? translate("day") : translate("days")}`
})
</script>

<style scoped>
.assoc-item {
  border: 1px solid var(--ion-color-step-150, #e2e2e6);
  border-radius: 8px;
  --inner-border-width: 0;
}
</style>
