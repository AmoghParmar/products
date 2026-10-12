<template>
  <!-- The product block of every product list, placed inside an ion-item: image, then the preferred
       primary and secondary identifiers. The default slot adds lines under them (badges, notes). -->
  <ion-thumbnail slot="start">
    <DxpShopifyImg
      :src="imageUrl"
      size="small"
    />
  </ion-thumbnail>
  <ion-label>
    {{ identity.primary }}
    <p v-if="identity.secondary">
      {{ identity.secondary }}
    </p>
    <slot :identity="identity" />
  </ion-label>
</template>

<script setup lang="ts">
import { DxpShopifyImg } from "@common"
import { IonLabel, IonThumbnail } from "@ionic/vue"
import { computed } from "vue"
import { useProductIdentity } from "@/composables/useProductIdentity"

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** A Solr product document, a ProductSummary, or any record with productId and identifier fields. */
  product?: object | null
}>()

const { identityOf } = useProductIdentity()
const identity = computed(() => identityOf(props.product))
// Solr documents carry mainImageUrl; ProductSummary rows and other records carry imageUrl.
const imageUrl = computed(() => {
  const record = (props.product ?? {}) as Record<string, unknown>

  return String(record.imageUrl || record.mainImageUrl || "")
})
</script>
