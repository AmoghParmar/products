<template>
  <CardSection :title="translate('Display')">
    <div class="grid-4">
      <ion-input
        v-model="draft.productName"
        :label="translate('Name')"
        label-placement="stacked"
        :disabled="!canEdit"
        fill="outline"
      />
      <ion-input
        v-model="draft.internalName"
        :label="translate('Internal name')"
        label-placement="stacked"
        :helper-text="duplicateHint"
        :disabled="!canEdit"
        fill="outline"
      />
      <ion-input
        v-model="draft.brandName"
        :label="translate('Brand name')"
        label-placement="stacked"
        :disabled="!canEdit"
        fill="outline"
      />
      <ion-select
        v-model="draft.productTypeId"
        :label="translate('Type')"
        label-placement="stacked"
        interface="popover"
        :disabled="!canEdit"
        fill="outline"
      >
        <ion-select-option
          v-for="option in productTypes"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </ion-select-option>
      </ion-select>
    </div>
    <div class="grid-desc">
      <ion-textarea
        v-model="draft.description"
        :label="translate('Desc')"
        label-placement="stacked"
        auto-grow
        :disabled="!canEdit"
        fill="outline"
      />
      <ion-textarea
        v-model="draft.longDescription"
        :label="translate('Long desc')"
        label-placement="stacked"
        auto-grow
        :disabled="!canEdit"
        fill="outline"
      />
    </div>

    <template v-if="draft.productTypeId === 'MARKETING_PKG_PICK'">
      <div class="comp-head">
        <span class="comp-title">
          <ion-icon :icon="cubeOutline" />
          {{ translate("Components") }}
        </span>
        <ion-button
          v-if="canEdit"
          fill="clear"
          size="small"
          @click="$emit('addComponent')"
        >
          {{ translate("Add") }}
        </ion-button>
      </div>

      <div
        v-if="components && components.length"
        class="comp-grid"
      >
        <AssociationItem
          v-for="assoc in components"
          :key="`${assoc.relatedProductId}-${assoc.fromDate}`"
          :association="assoc"
          :product="documentFor(assoc.relatedProductId)"
          show-quantity
          :can-edit="canEdit"
          @expire="$emit('expireComponent', assoc)"
          @reactivate="$emit('reactivateComponent', assoc)"
        />
      </div>
      <p
        v-else
        class="comp-empty"
      >
        {{ translate("No components linked") }}
      </p>
    </template>

    <template #footer>
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :can-save="canEdit"
        :stale-under-edit="staleUnderEdit"
        @save="$emit('save')"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, IonTextarea } from "@ionic/vue"
import { cubeOutline } from "ionicons/icons"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import { useProductDocuments } from "@/composables/useProductDocuments"
import type { CatalogOption, ProductAssociation } from "@/domain/types/product"
import AssociationItem from "./AssociationItem.vue"

const props = withDefaults(defineProps<{
  draft: {
    productName: string
    internalName: string
    brandName: string
    productTypeId: string
    description: string
    longDescription: string
  }
  productTypes: CatalogOption[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canEdit?: boolean
  duplicateHint?: string
  components?: ProductAssociation[]
}>(), {
  canEdit: true,
  duplicateHint: ""
})

defineEmits<{
  (event: "save"): void
  (event: "reset"): void
  (event: "addComponent"): void
  (event: "expireComponent", assoc: ProductAssociation): void
  (event: "reactivateComponent", assoc: ProductAssociation): void
}>()

// One Solr lookup for the card's related products, so they show the product identifier setting.
const { documentFor } = useProductDocuments(() => (props.components ?? []).map((assoc) => assoc.relatedProductId))
</script>

<style scoped>
.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.grid-desc {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 720px) {
  .grid-desc {
    grid-template-columns: 1fr;
  }
}

.comp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.comp-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.comp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.comp-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
}
</style>
