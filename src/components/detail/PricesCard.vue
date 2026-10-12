<template>
  <CardSection :title="translate('Prices')">
    <template #action>
      <ion-button
        v-if="canCopyFromParent && canEdit"
        fill="clear"
        size="small"
        @click="$emit('copyFromParent')"
      >
        {{ translate("Copy from parent") }}
      </ion-button>
    </template>

    <p
      v-if="!rows.length"
      class="ion-text-center"
    >
      {{ translate("No prices in this store group.") }}
    </p>

    <div
      v-else
      class="prices-grid"
    >
      <ion-input
        v-for="row in rows"
        :key="row.key"
        v-model="draft[row.key]"
        :label="`${translate(priceTypeLabel(row.productPriceTypeId))} (${row.currencyUomId})`"
        label-placement="stacked"
        fill="outline"
        type="number"
        min="0"
        :disabled="!canEdit"
        :class="{ 'ion-invalid': touched && errors[row.key], 'ion-touched': touched }"
        :error-text="errors[row.key]"
        @ion-blur="touched && validate()"
      />
    </div>

    <template
      v-if="rows.length"
      #footer
    >
      <SaveFooter
        :dirty="dirty"
        :saving="saving"
        :can-save="canEdit"
        :stale-under-edit="staleUnderEdit"
        @save="onSave"
        @reset="$emit('reset')"
      />
    </template>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonInput } from "@ionic/vue"
import { ref } from "vue"
import CardSection from "@/components/common/CardSection.vue"
import SaveFooter from "@/components/common/SaveFooter.vue"
import { type PriceRow, priceTypeLabel } from "@/domain/product/prices"

const props = withDefaults(defineProps<{
  /** The prices that exist for the store group, plus any copied from the parent and not yet saved.
   *  A saved price stays until it is replaced. */
  rows: PriceRow[]
  /** One value per row, keyed by row key. */
  draft: Record<string, string>
  dirty: boolean
  saving: boolean
  staleUnderEdit: boolean
  canCopyFromParent?: boolean
  canEdit?: boolean
}>(), {
  canEdit: true
})

const emit = defineEmits<{
  (event: "save"): void
  (event: "reset"): void
  (event: "copyFromParent"): void
}>()

const touched = ref(false)
const errors = ref<Record<string, string>>({})

// A shown price is always replaced by another price, never cleared, so each needs a positive number.
const priceError = (value: string | undefined) => {
  const text = (value ?? "").trim()
  if(!text) {return translate("Enter a price")}

  return !isNaN(Number(text)) && Number(text) > 0 ? "" : translate("Must be a positive number")
}

const validate = (): boolean => {
  touched.value = true
  const errs: Record<string, string> = {}
  for(const row of props.rows) {
    const error = priceError(props.draft[row.key])
    if(error) {errs[row.key] = error}
  }
  errors.value = errs

  return Object.keys(errs).length === 0
}

const onSave = () => {
  if(!props.canEdit) {return}
  if(!validate()) {return}
  emit("save")
}
</script>

<style scoped>
.prices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
</style>
