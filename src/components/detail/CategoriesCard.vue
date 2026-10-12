<template>
  <CardSection :title="translate('Categories')">
    <div
      v-if="activeCategories.length"
    >
      <ion-chip v-for="cat in activeCategories" :key="cat.productCategoryId" outline>
        {{ cat.categoryName || cat.productCategoryId }}
        <ion-icon v-if="canEdit" :icon="closeOutline" @click="$emit('expire', cat)" />
      </ion-chip>
    </div>
    <p
      v-else
      class="cat-empty"
    >
      {{ translate("No categories linked") }}
    </p>

    <div
      v-if="canEdit"
      class="cat-footer"
    >
      <ion-button
        fill="clear"
        size="small"
        @click="openPicker"
      >
        <ion-icon
          slot="start"
          :icon="createOutline"
        />
        {{ translate("Edit categories") }}
      </ion-button>
    </div>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonChip, IonIcon, modalController } from "@ionic/vue"
import { closeOutline, createOutline } from "ionicons/icons"
import { computed } from "vue"
import CardSection from "@/components/common/CardSection.vue"
import type { CategoryPickerResult, ProductCategory, ProductCategoryMembership } from "@/domain/types/product"
import CategoryPicker from "./CategoryPicker.vue"

const props = withDefaults(defineProps<{
  categories: ProductCategoryMembership[]
  canEdit?: boolean
}>(), {
  canEdit: true
})

const emit = defineEmits<{
  (event: "add", category: ProductCategory): void
  (event: "expire", membership: ProductCategoryMembership): void
}>()

const activeCategories = computed(() => props.categories.filter((c) => c.active))

// One picker for adding and removing: current categories start checked; saving adds the newly
// checked ones and removes the unchecked ones.
let isPickerOpen = false
async function openPicker() {
  if(!props.canEdit || isPickerOpen) {return}

  isPickerOpen = true
  try {
    const modal = await modalController.create({
      component: CategoryPicker,
      componentProps: { selectedCategoryIds: activeCategories.value.map((c) => c.productCategoryId) }
    })
    await modal.present()
    const { data, role } = await modal.onWillDismiss<CategoryPickerResult>()
    if(role !== "confirm" || !data) {return}

    data.added.forEach((category) => emit("add", category))
    activeCategories.value
      .filter((membership) => data.removedCategoryIds.includes(membership.productCategoryId))
      .forEach((membership) => emit("expire", membership))
  } finally {
    isPickerOpen = false
  }
}
</script>

<style scoped>
.cat-item {
  border: 1px solid var(--ion-color-step-150, #e2e2e6);
  border-radius: 8px;
  --inner-border-width: 0;
}

.cat-empty {
  color: var(--ion-color-medium);
  font-size: 13px;
  margin: 0 0 8px;
}

.cat-footer {
  margin-top: 8px;
}
</style>
