<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ translate("Missing values") }}</ion-title>
        <ion-progress-bar
          v-if="coverageLoading || drillLoading"
          type="indeterminate"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>{{ translate("Catalog coverage") }}</ion-card-subtitle>
          <p class="hint">
            {{ translate("Where your catalog has holes, worst first. Pick a gap to see the products and fix them.") }}
          </p>
        </ion-card-header>
        <ion-card-content>
          <ErrorState
            v-if="coverageError"
            :title="translate('Could not load coverage')"
            :message="translate('The product index is unavailable')"
            @retry="refetchCoverage"
          />
          <div
            v-else
            class="coverage-grid"
          >
            <CoverageTile
              v-for="entry in coverageByRule"
              :key="entry.rule.id"
              :rule="entry.rule"
              :coverage="entry.coverage"
              :active="activeRule?.id === entry.rule.id"
              @select="selectRule(entry.rule)"
            />
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-content class="lookup-row">
          <ion-input
            v-model="lookupInput"
            :label="translate('Look up another field')"
            label-placement="stacked"
            :placeholder="translate('e.g. brandName, upc, mainImageUrl')"
            @keyup.enter="lookupField(lookupInput)"
          />
          <ion-button
            fill="outline"
            @click="lookupField(lookupInput)"
          >
            {{ translate("Look up") }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-list v-if="activeRule">
        <ion-list-header>
          <ion-label>
            {{ missingTotal }} {{ scopeLabel }} {{ translate("missing") }} <code>{{ activeRule.label }}</code>
          </ion-label>
        </ion-list-header>
        <ProductRow
          v-for="product in missingProducts"
          :key="product.productId"
          :product="product"
          :router-link="familyRouteFor(product)"
          :spark="rowSales[product.productId]"
          :spark-max="rowSalesMax"
        />
        <EmptyState
          v-if="!drillLoading && !missingProducts.length"
          :title="translate('Nothing missing')"
          :message="`${translate('All eligible products have')} ${activeRule.label}`"
        />
      </ion-list>

      <ion-infinite-scroll
        :disabled="!activeRule || !hasNextPage"
        @ion-infinite="onInfinite"
      >
        <ion-infinite-scroll-content loading-spinner="crescent" />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { translate } from "@common"
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonContent, IonHeader,
  IonInfiniteScroll, IonInfiniteScrollContent, IonInput, IonLabel, IonList, IonListHeader, IonMenuButton,
  IonPage, IonProgressBar, IonTitle, IonToolbar
} from "@ionic/vue"
import { computed, ref } from "vue"
import EmptyState from "@/components/EmptyState.vue"
import ErrorState from "@/components/ErrorState.vue"
import CoverageTile from "@/components/quality/CoverageTile.vue"
import ProductRow from "@/components/workbench/ProductRow.vue"
import { useMissingValues } from "@/composables/useDataQuality"
import { useRowSales } from "@/composables/useRowSales"
import { familyRouteFor } from "@/domain/product/family"

const {
  coverageByRule, coverageLoading, coverageError, refetchCoverage,
  activeRule, selectRule, lookupField,
  missingProducts, missingTotal, drillLoading, hasNextPage, loadMore
} = useMissingValues()

// The same 30-day sales as the workbench rows, so the best sellers missing a value stand out.
const { rowSales, rowSalesMax } = useRowSales(() => missingProducts.value.map((product) => product.productId))

const lookupInput = ref("")

const scopeLabel = computed(() => {
  if(activeRule.value?.scope === "variants") {return translate("variants")}
  if(activeRule.value?.scope === "virtuals") {return translate("virtuals")}

  return translate("products")
})

const onInfinite = (event: CustomEvent) => loadMore(() => (event.target as any)?.complete())
</script>

<style scoped>
.coverage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.coverage-grid ion-card {
  margin: 0;
}

.lookup-row {
  display: flex;
  gap: 12px;
  align-items: end;
}

.hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}
</style>
