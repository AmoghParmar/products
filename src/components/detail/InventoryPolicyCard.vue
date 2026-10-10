<template>
  <CardSection :title="translate('Inventory policy')">
    <div class="toggle-row">
      <ion-item lines="none" class="ion-border-end">
        <ion-toggle
          v-model="draft.returnable"
          :disabled="!canEdit"
        >
          {{ translate("Returnable") }}
        </ion-toggle>
      </ion-item>
      <ion-item lines="none">
        <ion-toggle
          v-model="draft.taxable"
          :disabled="!canEdit"
        >
          {{ translate("Taxable") }}
        </ion-toggle>
      </ion-item>
    </div>

    <div class="subs-head">
      <span class="subs-title">
        <ion-icon :icon="swapHorizontalOutline" />
        {{ translate("Substitutes") }}
      </span>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        @click="$emit('addSubstitute')"
      >
        {{ translate("Add") }}
      </ion-button>
    </div>

    <div
      v-if="substitutes.length"
      class="subs-grid"
    >
      <AssociationItem
        v-for="assoc in substitutes"
        :key="`${assoc.relatedProductId}-${assoc.fromDate}`"
        :association="assoc"
        :product="documentFor(assoc.relatedProductId)"
        :can-edit="canEdit"
        @expire="$emit('expireSubstitute', assoc)"
        @reactivate="$emit('reactivateSubstitute', assoc)"
      />
    </div>
    <p
      v-else
      class="subs-empty"
    >
      {{ translate("No substitutes linked") }}
    </p>

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
import { IonButton, IonIcon, IonItem, IonToggle } from "@ionic/vue"
import { swapHorizontalOutline } from "ionicons/icons"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import { useProductDocuments } from "@/composables/useProductDocuments"
import type { ProductAssociation } from "@/domain/types/product"
import AssociationItem from "./AssociationItem.vue"

const props = withDefaults(defineProps<{
  draft: {
    returnable: boolean
    taxable: boolean
    chargeShipping: boolean
  }
  substitutes: ProductAssociation[]
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canEdit?: boolean
}>(), {
  canEdit: true
})

defineEmits<{
  (event: "save"): void
  (event: "reset"): void
  (event: "addSubstitute"): void
  (event: "expireSubstitute", assoc: ProductAssociation): void
  (event: "reactivateSubstitute", assoc: ProductAssociation): void
}>()

// One Solr lookup for the card's related products, so they show the product identifier setting.
const { documentFor } = useProductDocuments(() => (props.substitutes).map((assoc) => assoc.relatedProductId))
</script>

<style scoped>
.toggle-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.toggle-row ion-item {
  --padding-start: 0;
}

.subs-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.subs-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.subs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.subs-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
}

.ion-border-end {
  border-right: 1px solid;
}
</style>
