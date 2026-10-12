<template>
  <CardSection :title="translate('Change history')">
    <ion-list v-if="entries.length">
      <ion-item
        v-for="entry in entries.slice(0, shown)"
        :key="entry.id"
      >
        <ion-label>
          {{ subjectText(entry) }}
          <p>{{ changeText(entry) }}</p>
        </ion-label>
        <ion-label
          slot="end"
          class="ion-text-end"
        >
          <p :title="absoluteTime(entry.changedDate)">
            {{ relativeTime(entry.changedDate) }}
          </p>
          <p>{{ entry.changedByName || entry.changedByUserId || translate("System") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
    <ion-item
      v-else
      lines="none"
    >
      <ion-label class="ion-text-wrap">
        {{ translate("No recorded changes yet") }}
        <p>{{ translate("Changes to identifier values and facility settings are recorded here.") }}</p>
      </ion-label>
    </ion-item>
    <ion-button
      v-if="entries.length > shown"
      fill="clear"
      size="small"
      @click="shown += pageSize"
    >
      {{ translate("Show more") }}
    </ion-button>
  </CardSection>
</template>

<script setup lang="ts">
import { translate } from "@common"
import { IonButton, IonItem, IonLabel, IonList } from "@ionic/vue"
import { useQuery } from "@tanstack/vue-query"
import { DateTime } from "luxon"
import { computed, ref } from "vue"
import CardSection from "@/components/common/CardSection.vue"
import { PRODUCT_FACILITY_FIELD_LABELS, historyChange, historySubject } from "@/domain/product/history"
import type { ProductHistoryEntry } from "@/domain/types/product"
import { facilityNamesOptions } from "@/queries/catalog"

const props = withDefaults(defineProps<{
  entries: ProductHistoryEntry[]
  /** Identification type descriptions by type ID (SKU, UPCA, ...). */
  identificationTypeLabels?: Record<string, string>
}>(), {
  identificationTypeLabels: () => ({})
})

const pageSize = 10
const shown = ref(pageSize)

// Facility settings name the facility by ID; look up the names of the ones this history mentions.
const facilityIds = computed(() => props.entries.flatMap((entry) => {
  const subject = historySubject(entry)

  return subject.kind === "facility" ? [subject.facilityId] : []
}))
const facilityNamesQuery = useQuery(computed(() => facilityNamesOptions(facilityIds.value)))

function subjectText(entry: ProductHistoryEntry) {
  const subject = historySubject(entry)

  if(subject.kind === "identification") {return props.identificationTypeLabels[subject.identificationTypeId] || subject.identificationTypeId}
  if(subject.kind === "facility") {
    return translate("{setting} at {facility}", {
      setting: translate(PRODUCT_FACILITY_FIELD_LABELS[subject.field] ?? subject.field),
      facility: facilityNamesQuery.data.value?.[subject.facilityId] || subject.facilityId
    })
  }

  return `${subject.entity} ${subject.field}`
}

function changeText(entry: ProductHistoryEntry) {
  const change = historyChange(entry)

  if(change.kind === "set") {return translate("Set to {value}", { value: translate(change.to) })}
  if(change.kind === "cleared") {return translate("Cleared, was {value}", { value: translate(change.from) })}

  return translate("{from} to {to}", { from: translate(change.from), to: translate(change.to) })
}

function relativeTime(iso: string) {
  return iso ? DateTime.fromISO(iso).toRelative() ?? "" : ""
}

function absoluteTime(iso: string) {
  return iso ? DateTime.fromISO(iso).toLocaleString(DateTime.DATETIME_MED) : ""
}
</script>
