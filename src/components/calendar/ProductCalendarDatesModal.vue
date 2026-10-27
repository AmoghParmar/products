<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button :aria-label="translate('Close')" @click="close">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content>
    <ion-list v-if="!isBulk">
      <ion-item lines="full">
        <ion-thumbnail slot="start">
          <DxpShopifyImg :src="items[0].imageUrl" size="small" />
        </ion-thumbnail>
        <ion-label>
          {{ items[0].primary }}
          <p v-if="items[0].secondary">
            {{ items[0].secondary }}
          </p>
        </ion-label>
      </ion-item>
    </ion-list>
    <ion-list v-else>
      <ion-item lines="full">
        <ion-label>
          <p>{{ translate("Only the dates you change are updated on each product.") }}</p>
        </ion-label>
      </ion-item>
    </ion-list>

    <ion-list>
      <ion-item v-for="field in PRODUCT_CALENDAR_DATE_FIELDS" :key="field">
        <ion-label>
          {{ translate(PRODUCT_CALENDAR_DATE_LABELS[field]) }}
          <p v-if="!isBulk && field in drafts">
            {{ translate("Was {date}", { date: originalLabel(field) }) }}
          </p>
        </ion-label>
        <ion-button :id="triggerId(field)" slot="end" fill="outline" size="small">
          {{ valueLabel(field) }}
        </ion-button>
        <ion-button
          v-if="canClear(field)"
          slot="end"
          fill="clear"
          color="medium"
          :aria-label="translate('Clear date')"
          @click="clearDate(field)"
        >
          <ion-icon slot="icon-only" :icon="closeCircleOutline" />
        </ion-button>
        <ion-button
          v-if="field in drafts"
          slot="end"
          fill="clear"
          color="medium"
          :aria-label="translate('Undo change')"
          @click="delete drafts[field]"
        >
          <ion-icon slot="icon-only" :icon="arrowUndoOutline" />
        </ion-button>
      </ion-item>
    </ion-list>

    <ion-popover v-for="field in PRODUCT_CALENDAR_DATE_FIELDS" :key="field" :trigger="triggerId(field)">
      <ion-datetime
        presentation="date"
        :value="calendarDateInputValue(effectiveValue(field))"
        :show-default-buttons="true"
        @ion-change="pickDate(field, $event.detail.value)"
      />
    </ion-popover>

    <ion-fab slot="fixed" vertical="bottom" horizontal="end">
      <ion-fab-button :disabled="!hasChanges || saving" :aria-label="translate('Save')" @click="save">
        <ion-spinner v-if="saving" name="crescent" />
        <ion-icon v-else :icon="saveOutline" />
      </ion-fab-button>
    </ion-fab>
  </ion-content>
</template>

<script setup lang="ts">
import { DxpShopifyImg, commonUtil, logger, translate } from "@common"
import {
  IonButton, IonButtons, IonContent, IonDatetime, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonPopover, IonSpinner, IonThumbnail, IonTitle, IonToolbar, modalController
} from "@ionic/vue"
import { arrowUndoOutline, closeCircleOutline, closeOutline, saveOutline } from "ionicons/icons"
import { computed, ref, useId } from "vue"
import { type ProductCalendarDateChanges, storeProductCalendarDates } from "@/api/productCalendar"
import {
  PRODUCT_CALENDAR_DATE_FIELDS, PRODUCT_CALENDAR_DATE_LABELS, type ProductCalendarDateField, type ProductCalendarDatesItem,
  calendarDateFromInput, calendarDateInputValue, formatCalendarDate, parseCalendarDate
} from "@/domain/product/calendar"
import { showToast } from "@/utils"

const props = defineProps<{
  productStoreId: string
  items: ProductCalendarDatesItem[]
}>()

const SAVE_BATCH_SIZE = 10
// Popover triggers are looked up by id in the document, so each open modal needs its own ids.
const instanceId = useId()

// A field is in drafts only once it changes: epoch millis sets it, null clears it.
const drafts = ref<ProductCalendarDateChanges>({})
const saving = ref(false)

const isBulk = computed(() => props.items.length > 1)
const title = computed(() => isBulk.value
  ? translate("Edit dates for {count} products", { count: props.items.length })
  : translate("Edit calendar dates"))
const hasChanges = computed(() => Object.keys(drafts.value).length > 0)

function triggerId(field: ProductCalendarDateField) {
  return `calendar-date-${instanceId}-${field}`
}

function originalValue(field: ProductCalendarDateField) {
  return isBulk.value ? null : props.items[0].dates[field]
}

function effectiveValue(field: ProductCalendarDateField) {
  return field in drafts.value ? drafts.value[field] : originalValue(field)
}

function originalLabel(field: ProductCalendarDateField) {
  return parseCalendarDate(originalValue(field)) ? formatCalendarDate(originalValue(field)) : translate("Not set")
}

function valueLabel(field: ProductCalendarDateField) {
  if(isBulk.value && !(field in drafts.value)) {return translate("No change")}
  const value = effectiveValue(field)

  return parseCalendarDate(value) ? formatCalendarDate(value) : translate("Not set")
}

function canClear(field: ProductCalendarDateField) {
  return isBulk.value ? drafts.value[field] !== null : Boolean(parseCalendarDate(effectiveValue(field)))
}

// The datetime's default Done and Cancel buttons close the popover around it themselves.
function pickDate(field: ProductCalendarDateField, value: unknown) {
  if(typeof value !== "string") {return}
  if(!isBulk.value && calendarDateInputValue(originalValue(field)) === value) {
    delete drafts.value[field]

    return
  }
  drafts.value[field] = calendarDateFromInput(value)
}

function clearDate(field: ProductCalendarDateField) {
  // Clearing a date the product never had is no change at all.
  if(!isBulk.value && !parseCalendarDate(originalValue(field))) {
    delete drafts.value[field]

    return
  }
  drafts.value[field] = null
}

function close() {
  modalController.dismiss(undefined, "cancel")
}

async function save() {
  const changes = { ...drafts.value }
  const results: PromiseSettledResult<unknown>[] = []
  saving.value = true
  try {
    for(let index = 0; index < props.items.length; index += SAVE_BATCH_SIZE) {
      const batch = props.items.slice(index, index + SAVE_BATCH_SIZE)
      results.push(...await Promise.allSettled(batch.map((item) => storeProductCalendarDates(props.productStoreId, item.productId, changes))))
    }
  } finally {
    saving.value = false
  }

  let updated = 0
  let failedReason: any = undefined
  for(const result of results) {
    if(result.status === "fulfilled") {
      updated++
    } else if(!failedReason) {
      failedReason = result.reason
    }
  }
  if(!updated) {
    const serverError = commonUtil.getErrorMessage(failedReason)
    logger.error("Unable to update calendar dates", failedReason)
    await showToast(`${translate("Unable to update calendar dates.")} ${serverError}`)

    return
  }
  if(updated < props.items.length) {
    await showToast(translate("Updated {updated} of {count} products.", { updated, count: props.items.length }))
  } else {
    await showToast(isBulk.value ? translate("Updated dates for {count} products.", { count: updated }) : translate("Calendar dates updated."))
  }
  modalController.dismiss({ updated }, "confirm")
}
</script>
