<template>
  <CardSection :title="translate('Product identifications')">
    <template #action>
      <ion-button
        v-if="canEdit"
        fill="clear"
        size="small"
        @click="modalOpen = true"
      >
        {{ translate("Edit") }}
      </ion-button>
    </template>

    <ion-list>
      <ion-item>
        <ion-label>{{ translate("Product ID") }}</ion-label>
        <ion-label slot="end">
          {{ productId }}
        </ion-label>
      </ion-item>

      <ion-item
        v-for="row in activeRows"
        :key="rowKey(row)"
      >
        <ion-label>{{ row.typeDescription }}</ion-label>
        <ion-label slot="end">
          {{ row.idValue }}
        </ion-label>
      </ion-item>
    </ion-list>

    <IdentificationsModal
      :is-open="modalOpen"
      :product-id="productId"
      :identifications="identifications"
      :identification-types="identificationTypes"
      @add="$emit('add', $event)"
      @update-value="$emit('updateValue', $event)"
      @expire="$emit('expire', $event)"
      @dismiss="modalOpen = false"
    />
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonItem, IonLabel, IonList } from "@ionic/vue"
import { computed, ref } from "vue"
import CardSection from "@/components/common/CardSection.vue"
import type { IdentificationCreate, IdentificationKey } from "@/domain/types/pim"
import type { CatalogOption, ProductIdentification } from "@/domain/types/product"
import IdentificationsModal from "./IdentificationsModal.vue"

const props = withDefaults(defineProps<{
  productId: string
  identifications: ProductIdentification[]
  identificationTypes: CatalogOption[]
  canEdit?: boolean
}>(), {
  canEdit: true
})

defineEmits<{
  (event: "add", payload: IdentificationCreate): void
  (event: "updateValue", payload: { key: IdentificationKey; idValue: string }): void
  (event: "expire", key: IdentificationKey): void
}>()

const modalOpen = ref(false)
const activeRows = computed(() => props.identifications.filter((row) => row.active))
const rowKey = (row: ProductIdentification) => `${row.goodIdentificationTypeId}|${row.fromDate}`
</script>
