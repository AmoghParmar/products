<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>
        {{ translate("Product identifier") }}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {{ translate("Choosing a product identifier allows you to view products with your preferred identifiers.") }}
    </ion-card-content>

    <ion-item :disabled="!canUpdate">
      <ion-select
        :label="translate('Primary')"
        interface="popover"
        :interface-options="{ cssClass: 'product-identifier-popover', size: 'auto' }"
        :placeholder="translate('primary identifier')"
        :value="productIdentificationPref.primaryId"
        :selected-text="identifierLabel(productIdentificationPref.primaryId)"
        @ion-change="updatePref('primaryId', $event.detail.value)"
      >
        <ion-select-option
          v-for="option in productIdentificationOptions"
          :key="option.goodIdentificationTypeId"
          :value="option.goodIdentificationTypeId"
        >
          {{ optionLabelWithCoverage(option) }}
        </ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none" :disabled="!canUpdate">
      <ion-select
        :label="translate('Secondary')"
        interface="popover"
        :interface-options="{ cssClass: 'product-identifier-popover', size: 'auto' }"
        :placeholder="translate('secondary identifier')"
        :value="productIdentificationPref.secondaryId"
        :selected-text="productIdentificationPref.secondaryId ? identifierLabel(productIdentificationPref.secondaryId) : translate('None')"
        @ion-change="updatePref('secondaryId', $event.detail.value)"
      >
        <ion-select-option
          v-for="option in productIdentificationOptions"
          :key="option.goodIdentificationTypeId"
          :value="option.goodIdentificationTypeId"
        >
          {{ optionLabelWithCoverage(option) }}
        </ion-select-option>
        <ion-select-option value="">
          {{ translate("None") }}
        </ion-select-option>
      </ion-select>
    </ion-item>

    <template v-if="sampleProduct">
      <ion-item lines="full" color="light">
        <ion-label color="medium">
          {{ translate("Preview product identifier") }}
        </ion-label>
      </ion-item>
      <ion-item lines="none">
        <!-- The same block every product list uses. A missing identifier is named, so it is not
             mistaken for a value. -->
        <ProductIdentity
          v-slot="{ identity }"
          :product="sampleProduct"
        >
          <p v-if="identity.primaryMissing">
            {{ translate("No {identifier} on this product, so rows show its name.", { identifier: identifierLabel(productIdentificationPref.primaryId) }) }}
          </p>
          <p v-if="identity.secondaryMissing">
            {{ translate("No {identifier} on this product.", { identifier: identifierLabel(productIdentificationPref.secondaryId) }) }}
          </p>
        </ProductIdentity>
        <ion-button
          slot="end"
          size="default"
          fill="clear"
          :aria-label="translate('Shuffle')"
          :title="translate('Shuffle')"
          @click="productIdentificationStore.shuffleProduct()"
        >
          <ion-icon slot="icon-only" :icon="shuffleOutline" />
        </ion-button>
      </ion-item>
    </template>
  </ion-card>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonSelect,
  IonSelectOption
} from "@ionic/vue"
import { shuffleOutline } from "ionicons/icons"
import { computed, onMounted } from "vue"
import Actions from "@/authorization/actions"
import ProductIdentity from "@/components/ProductIdentity.vue"
import {
  type ProductIdentificationOption, type ProductIdentificationPref
} from "@/domain/product/identification"
import { useProductIdentificationStore } from "@/store/productIdentification"
import { useUserStore } from "@/store/user"

const userStore = useUserStore()
const productIdentificationStore = useProductIdentificationStore()

const productStoreId = computed(() => userStore.getCurrentProductStore?.productStoreId || "")
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
const productIdentificationOptions = computed(() => productIdentificationStore.getProductIdentificationOptions)
const identifierCoverage = computed(() => productIdentificationStore.getIdentifierCoverage)
const sampleProduct = computed(() => productIdentificationStore.getCurrentSampleProduct as Record<string, any> | null)
const canUpdate = computed(() => Boolean(productStoreId.value) && userStore.hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE))

onMounted(() => {
  productIdentificationStore.prepareProductIdentifierOptions()
  productIdentificationStore.fetchProductIdentificationPref(productStoreId.value)
  productIdentificationStore.fetchSampleProducts()
})

function optionLabel(option: ProductIdentificationOption) {
  return option.description ? translate(option.description) : option.goodIdentificationTypeId
}

// The choices list how many products have each identifier, so one that no product has is visible
// before it is chosen. The closed select shows the name alone (selected-text).
function optionLabelWithCoverage(option: ProductIdentificationOption) {
  const count = identifierCoverage.value[option.goodIdentificationTypeId]
  if(count === undefined) {return optionLabel(option)}

  return count
    ? translate("{identifier} ({count} products)", { identifier: optionLabel(option), count: count.toLocaleString() })
    : translate("{identifier} (no products)", { identifier: optionLabel(option) })
}

function identifierLabel(identifierId: string) {
  const option = productIdentificationOptions.value.find((candidate) => candidate.goodIdentificationTypeId === identifierId)

  return option ? optionLabel(option) : identifierId
}

function updatePref(key: keyof ProductIdentificationPref, value: string) {
  if(productIdentificationPref.value[key] === value) {return}

  productIdentificationStore.setProductIdentificationPref(productStoreId.value, { ...productIdentificationPref.value, [key]: value })
}
</script>

<style>
/* Not scoped: the popover renders outside this component. The choices carry product counts, so the
   popover takes their width instead of truncating them (as Order Routing's inventory sort does). */
ion-popover.product-identifier-popover {
  --width: max-content;
  --max-width: calc(100vw - var(--spacer-base) - var(--spacer-base));
}
</style>
