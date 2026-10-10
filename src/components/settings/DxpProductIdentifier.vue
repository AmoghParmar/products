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
        :placeholder="translate('primary identifier')"
        :value="productIdentificationPref.primaryId"
        @ion-change="updatePref('primaryId', $event.detail.value)"
      >
        <ion-select-option
          v-for="option in productIdentificationOptions"
          :key="option.goodIdentificationTypeId"
          :value="option.goodIdentificationTypeId"
        >
          {{ optionLabel(option) }}
        </ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item lines="none" :disabled="!canUpdate">
      <ion-select
        :label="translate('Secondary')"
        interface="popover"
        :placeholder="translate('secondary identifier')"
        :value="productIdentificationPref.secondaryId"
        @ion-change="updatePref('secondaryId', $event.detail.value)"
      >
        <ion-select-option
          v-for="option in productIdentificationOptions"
          :key="option.goodIdentificationTypeId"
          :value="option.goodIdentificationTypeId"
        >
          {{ optionLabel(option) }}
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
        <ion-thumbnail slot="start">
          <DxpShopifyImg size="small" :src="sampleProduct.mainImageUrl" />
        </ion-thumbnail>
        <!-- Shown the way product rows show it: without the primary identifier a row shows the product
             name. A missing identifier is named, so it is not mistaken for a value. -->
        <ion-label>
          {{ samplePrimary || sampleName }}
          <p v-if="sampleSecondary">
            {{ sampleSecondary }}
          </p>
          <p v-if="!samplePrimary">
            {{ translate("No {identifier} on this product, so rows show its name.", { identifier: identifierLabel(productIdentificationPref.primaryId) }) }}
          </p>
          <p v-if="productIdentificationPref.secondaryId && !sampleSecondary">
            {{ translate("No {identifier} on this product.", { identifier: identifierLabel(productIdentificationPref.secondaryId) }) }}
          </p>
        </ion-label>
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
import { DxpShopifyImg, translate } from "@common"
import {
  IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonItem, IonLabel, IonSelect,
  IonSelectOption, IonThumbnail
} from "@ionic/vue"
import { shuffleOutline } from "ionicons/icons"
import { computed, onMounted } from "vue"
import Actions from "@/authorization/actions"
import { productDisplayName } from "@/domain/normalize/product"
import {
  type ProductIdentificationOption, type ProductIdentificationPref, productIdentifierValue
} from "@/domain/product/identification"
import { useProductIdentificationStore } from "@/store/productIdentification"
import { useUserStore } from "@/store/user"

const userStore = useUserStore()
const productIdentificationStore = useProductIdentificationStore()

const productStoreId = computed(() => userStore.getCurrentProductStore?.productStoreId || "")
const productIdentificationPref = computed(() => productIdentificationStore.getProductIdentificationPref)
const productIdentificationOptions = computed(() => productIdentificationStore.getProductIdentificationOptions)
const sampleProduct = computed(() => productIdentificationStore.getCurrentSampleProduct as Record<string, any> | null)
const canUpdate = computed(() => Boolean(productStoreId.value) && userStore.hasPermission(Actions.APP_PRODUCT_IDENTIFIER_UPDATE))
const samplePrimary = computed(() => productIdentifierValue(productIdentificationPref.value.primaryId, sampleProduct.value))
const sampleSecondary = computed(() => productIdentifierValue(productIdentificationPref.value.secondaryId, sampleProduct.value))
const sampleName = computed(() => sampleProduct.value ? productDisplayName(sampleProduct.value as { productId: string }) : "")

onMounted(() => {
  productIdentificationStore.prepareProductIdentifierOptions()
  productIdentificationStore.fetchProductIdentificationPref(productStoreId.value)
  productIdentificationStore.fetchSampleProducts()
})

function optionLabel(option: ProductIdentificationOption) {
  return option.description ? translate(option.description) : option.goodIdentificationTypeId
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
