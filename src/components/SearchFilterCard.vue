<template>
  <ion-card>
    <ion-card-content class="search-filter-card-content">
      <ion-searchbar
        class="ion-no-padding"
        :value="modelValue"
        :placeholder="placeholder"
        :debounce="debounce"
        @ion-input="updateSearch"
      />

      <template v-if="$slots.default">
        <div class="search-filter-grid">
          <slot />
        </div>
        <ion-button
          class="search-filter-clear"
          fill="clear"
          size="small"
          @click="$emit('clear')"
        >
          {{ translate("Clear filters") }}
        </ion-button>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonSearchbar
} from "@ionic/vue"

defineProps<{
  modelValue: string
  placeholder: string
  debounce?: number
}>()

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void
  (event: "clear"): void
}>()

function updateSearch(event: CustomEvent) {
  emit("update:modelValue", event.detail.value || "")
}
</script>

<style scoped>
/* Same layout as the Order Manager find pages: search on top, then a uniform grid of
   stacked outline filters that wraps on its own, with "Clear filters" at the end. */
.search-filter-card-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacer-sm);
  padding: var(--spacer-sm);
}

.search-filter-grid {
  display: grid;
  gap: var(--spacer-sm);
  grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
}

.search-filter-grid :slotted(ion-select),
.search-filter-grid :slotted(ion-input) {
  min-width: 0;
  width: 100%;
}

.search-filter-clear {
  align-self: flex-end;
}
</style>
