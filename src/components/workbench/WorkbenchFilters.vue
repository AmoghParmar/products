<template>
  <SearchFilterCard
    :model-value="queryString"
    :placeholder="translate('Product ID, SKU, UPC, name')"
    :debounce="300"
    @update:model-value="$emit('update:queryString', $event)"
    @clear="$emit('clear')"
  >
    <ion-select
      :value="productTypeId"
      :label="translate('Product type')"
      label-placement="stacked"
      fill="outline"
      interface="popover"
      @ion-change="$emit('update:productTypeId', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All types") }}
      </ion-select-option>
      <ion-select-option
        v-for="option in productTypes"
        :key="option.id"
        :value="option.id"
      >
        {{ option.label }}
      </ion-select-option>
    </ion-select>

    <ion-select
      :value="productStoreId"
      :label="translate('Product store')"
      label-placement="stacked"
      fill="outline"
      interface="popover"
      @ion-change="$emit('update:productStoreId', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All stores") }}
      </ion-select-option>
      <ion-select-option
        v-for="option in productStores"
        :key="option.id"
        :value="option.id"
      >
        {{ option.label }}
      </ion-select-option>
    </ion-select>

    <ion-select
      :value="productKind"
      :label="translate('Virtual/variant')"
      label-placement="stacked"
      fill="outline"
      interface="popover"
      @ion-change="$emit('update:productKind', $event.detail.value)"
    >
      <ion-select-option value="All">
        {{ translate("All products") }}
      </ion-select-option>
      <ion-select-option value="Virtuals">
        {{ translate("Virtuals") }}
      </ion-select-option>
      <ion-select-option value="Variants">
        {{ translate("Variants") }}
      </ion-select-option>
    </ion-select>

    <ion-input
      class="tag-filter-trigger"
      :label="translate('Tags')"
      label-placement="stacked"
      fill="outline"
      :value="tagsLabel"
      readonly
      @click="$emit('openTags')"
      @keydown.enter="$emit('openTags')"
    >
      <ion-icon
        slot="end"
        :icon="chevronDownOutline"
        color="medium"
        aria-hidden="true"
      />
    </ion-input>
  </SearchFilterCard>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonIcon, IonInput, IonSelect, IonSelectOption } from "@ionic/vue"
import { chevronDownOutline } from "ionicons/icons"
import { computed } from "vue"
import SearchFilterCard from "@/components/SearchFilterCard.vue"
import type { CatalogOption, ProductKind } from "@/domain/types/product"

const props = defineProps<{
  queryString: string
  productTypeId: string
  productStoreId: string
  productKind: ProductKind
  tags: string[]
  productTypes: CatalogOption[]
  productStores: CatalogOption[]
}>()

defineEmits<{
  (event: "update:queryString", value: string): void
  (event: "update:productTypeId", value: string): void
  (event: "update:productStoreId", value: string): void
  (event: "update:productKind", value: ProductKind): void
  (event: "openTags"): void
  (event: "clear"): void
}>()

const tagsLabel = computed(() =>
  props.tags.length ? translate("{count} tags selected", { count: props.tags.length }) : translate("All tags"))
</script>

<style scoped>
.tag-filter-trigger {
  cursor: pointer;
}
</style>
