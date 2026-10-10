<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('dismiss')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ translate("Resolve") }} {{ rule?.label }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('dismiss')">
            {{ translate("Close") }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="group">
        <ion-list-header>
          <ion-label>
            <code>{{ group.value }}</code> · {{ group.products.length }} {{ translate("products") }}
          </ion-label>
        </ion-list-header>

        <ion-item
          v-for="draft in drafts"
          :key="draft.productId"
          lines="full"
        >
          <!-- Duplicates can share the very identifier rows lead with, so the product ID is added when
               the identifier setting does not already show it. -->
          <ProductIdentity
            v-slot="{ identity }"
            :product="productById(draft.productId) ?? { productId: draft.productId }"
          >
            <p v-if="identity.primary !== draft.productId && identity.secondary !== draft.productId">
              {{ draft.productId }}
            </p>
            <p v-if="createdLabel(draft.productId)">
              {{ createdLabel(draft.productId) }}
            </p>
            <ion-input
              :value="draft.value"
              :label="rule?.label"
              label-placement="stacked"
              :helper-text="draft.value === draft.original ? translate('Unchanged') : `${translate('Was')} ${draft.original}`"
              @ion-input="updateDraft(draft.productId, $event.detail.value ?? '')"
            />
          </ProductIdentity>
        </ion-item>
      </ion-list>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          :disabled="!changedCount || saving"
          @click="save"
        >
          <ion-spinner
            v-if="saving"
            name="crescent"
          />
          <template v-else>
            {{ translate("Save") }} {{ changedCount }} {{ changedCount === 1 ? translate("change") : translate("changes") }}
          </template>
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonInput, IonItem, IonLabel, IonList, IonListHeader,
  IonModal, IonSpinner, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref, watch } from "vue"
import ProductIdentity from "@/components/ProductIdentity.vue"
import type { DuplicateDraft, DuplicateGroup, QualityRule } from "@/domain/types/quality"

const props = defineProps<{
  isOpen: boolean
  rule: QualityRule | null
  group: DuplicateGroup | null
  saving: boolean
}>()

const emit = defineEmits<{
  (event: "save", changes: DuplicateDraft[]): void
  (event: "dismiss"): void
}>()

const drafts = ref<DuplicateDraft[]>([])

watch(
  () => props.group,
  (group) => {
    drafts.value = (group?.products ?? []).map((product) => {
      const original = props.rule?.solrField === "upc" ? product.upc : product.sku

      return { productId: product.productId, original, value: original }
    })
  },
  { immediate: true }
)

const changedDrafts = computed(() => drafts.value.filter((draft) => draft.value.trim() && draft.value.trim() !== draft.original))
const changedCount = computed(() => changedDrafts.value.length)

const productById = (productId: string) => props.group?.products.find((product) => product.productId === productId)
const createdLabel = (productId: string) => {
  const created = productById(productId)?.createdDate

  return created ? translate("Created {date}", { date: new Date(created).toLocaleDateString() }) : ""
}

const updateDraft = (productId: string, value: string) => {
  drafts.value = drafts.value.map((draft) => (draft.productId === productId ? { ...draft, value } : draft))
}

const save = () => emit("save", changedDrafts.value)
</script>
