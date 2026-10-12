<template>
  <div class="variant-strip">
    <p class="strip-label">
      {{ variants.length }} {{ variants.length === 1 ? translate("variant") : translate("variants") }}
    </p>
    <div class="strip-scroll">
      <button
        v-for="variant in variants"
        :key="variant.productId"
        type="button"
        class="variant-chip"
        :class="{ selected: variant.productId === selectedVariantId }"
        @click="$emit('select', variant.productId)"
      >
        <ion-thumbnail class="variant-thumb">
          <DxpShopifyImg
            :src="variant.imageUrl"
            size="small"
          />
        </ion-thumbnail>
        <!-- The same primary and secondary identifiers as every product list (Settings > Product identifier). -->
        <span class="variant-name">{{ identityOf(variant.product).primary }}</span>
        <span
          v-if="identityOf(variant.product).secondary"
          class="variant-sku"
        >{{ identityOf(variant.product).secondary }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DxpShopifyImg, translate } from "@common"
import { IonThumbnail } from "@ionic/vue"
import { useProductIdentity } from "@/composables/useProductIdentity"
import type { FamilyVariant } from "@/domain/product/family"

defineProps<{
  variants: FamilyVariant[]
  selectedVariantId: string
}>()

defineEmits<{ (event: "select", productId: string): void }>()

const { identityOf } = useProductIdentity()
</script>

<style scoped>
.variant-strip {
  padding: 8px 16px 0;
}

.strip-label {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.strip-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.variant-chip {
  flex: 0 0 auto;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--ion-color-step-150, #e2e2e6);
  border-radius: 8px;
  background: var(--ion-background-color, #fff);
  cursor: pointer;
  text-align: center;
}

.variant-chip.selected {
  border-color: var(--ion-color-primary);
  box-shadow: inset 0 0 0 1px var(--ion-color-primary);
}

.variant-thumb {
  --size: 64px;
  --border-radius: 6px;
}

.variant-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.variant-sku {
  font-size: 11px;
  color: var(--ion-color-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
