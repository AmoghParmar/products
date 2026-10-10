<template>
  <CardSection :title="translate('Components')">
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="outline"
        size="small"
        @click="$emit('addComponent')"
      >
        {{ translate("Add components") }}
      </ion-button>
    </template>

    <div
      v-if="components.length"
      class="components-grid"
    >
      <AssociationItem
        v-for="assoc in components"
        :key="`${assoc.relatedProductId}-${assoc.fromDate}`"
        :association="assoc"
        :product="documentFor(assoc.relatedProductId)"
        :can-edit="canEdit"
        show-quantity
        @expire="$emit('expireComponent', assoc)"
        @reactivate="$emit('reactivateComponent', assoc)"
      />
    </div>
    <p
      v-else
      class="components-empty"
    >
      {{ translate("No components yet — a kit needs at least one") }}
    </p>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton } from "@ionic/vue"
import CardSection from "@/components/common/CardSection.vue"
import { useProductDocuments } from "@/composables/useProductDocuments"
import type { ProductAssociation } from "@/domain/types/product"
import AssociationItem from "./AssociationItem.vue"

const props = withDefaults(defineProps<{
  components: ProductAssociation[]
  canEdit?: boolean
}>(), {
  canEdit: true
})

defineEmits<{
  (event: "addComponent"): void
  (event: "expireComponent", assoc: ProductAssociation): void
  (event: "reactivateComponent", assoc: ProductAssociation): void
}>()

// One Solr lookup for the card's related products, so they show the product identifier setting.
const { documentFor } = useProductDocuments(() => (props.components).map((assoc) => assoc.relatedProductId))
</script>

<style scoped>
.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
}

.components-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
}
</style>
