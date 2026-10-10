<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button
          :aria-label="translate('Close')"
          @click="close"
        >
          <ion-icon
            slot="icon-only"
            :icon="closeOutline"
          />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate("Categories") }}</ion-title>
    </ion-toolbar>
    <ion-toolbar>
      <ion-searchbar
        :value="term"
        :placeholder="translate('Search categories')"
        :debounce="300"
        @ion-input="term = $event.detail.value ?? ''"
      />
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <!-- The whole row toggles; the checkbox in slot="start" shows the state. Categories the product
         is already in start checked, and unchecking one removes it on save. -->
    <ion-list>
      <ion-item
        v-for="category in candidates"
        :key="category.productCategoryId"
        button
        :detail="false"
        @click="toggle(category)"
      >
        <ion-checkbox
          slot="start"
          :checked="selected.has(category.productCategoryId)"
          :aria-label="category.categoryName || category.productCategoryId"
          @click.stop
          @keydown.stop
          @ion-change="setSelected(category, $event.detail.checked)"
        />
        <ion-label>
          {{ category.categoryName || category.productCategoryId }}
          <p v-if="category.description">
            {{ category.description }}
          </p>
          <p>{{ category.productCategoryId }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <EmptyState
      v-if="!isLoading && !candidates.length"
      :title="translate('No categories found')"
      :message="translate('Try a different search term')"
    />

    <ion-fab
      slot="fixed"
      vertical="bottom"
      horizontal="end"
    >
      <ion-fab-button
        :disabled="!hasChanges"
        :aria-label="translate('Save')"
        @click="save"
      >
        <ion-icon :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCheckbox, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList,
  IonSearchbar, IonTitle, IonToolbar, modalController
} from "@ionic/vue"
import { useQuery } from "@tanstack/vue-query"
import { closeOutline, saveOutline } from "ionicons/icons"
import { computed, ref, watch } from "vue"
import { fetchProductCategories } from "@/api/pim"
import EmptyState from "@/components/EmptyState.vue"
import type { CategoryPickerResult, ProductCategory } from "@/domain/types/product"

const props = defineProps<{
  /** Categories the product is in now; they start checked. */
  selectedCategoryIds: string[]
}>()

const term = ref("")
const selected = ref(new Set(props.selectedCategoryIds))
// Every category seen in a search, so a checked one can be saved after the search text changes.
const seen = new Map<string, ProductCategory>()

const searchQuery = useQuery({
  queryKey: computed(() => ["categorySearch", term.value] as const),
  queryFn: () => fetchProductCategories(term.value),
  staleTime: 30_000
})

const candidates = computed(() => searchQuery.data.value ?? [])
watch(candidates, (categories) => categories.forEach((category) => seen.set(category.productCategoryId, category)), { immediate: true })
const isLoading = searchQuery.isLoading

const initial = new Set(props.selectedCategoryIds)
const added = computed(() => [...selected.value].filter((id) => !initial.has(id)))
const removedCategoryIds = computed(() => [...initial].filter((id) => !selected.value.has(id)))
const hasChanges = computed(() => added.value.length > 0 || removedCategoryIds.value.length > 0)

function setSelected(category: ProductCategory, checked: boolean) {
  const next = new Set(selected.value)
  if(checked) {next.add(category.productCategoryId)} else {next.delete(category.productCategoryId)}
  selected.value = next
}

function toggle(category: ProductCategory) {
  setSelected(category, !selected.value.has(category.productCategoryId))
}

function close() {
  modalController.dismiss(undefined, "cancel")
}

function save() {
  const result: CategoryPickerResult = {
    added: added.value.map((id) => seen.get(id) ?? { productCategoryId: id, categoryName: id, description: "" }),
    removedCategoryIds: removedCategoryIds.value
  }
  modalController.dismiss(result, "confirm")
}
</script>

<style scoped>
/* Room under the last category so the save button never covers it, as in the other apps' modals. */
ion-content {
  --padding-bottom: var(--spacer-2xl);
}
</style>
