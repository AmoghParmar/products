<template>
  <!-- Same control as the Order Manager find pages: the current sort as a button, the choices in a popover. -->
  <ion-button
    :id="triggerId"
    fill="clear"
    size="small"
  >
    {{ selectedLabel }}
  </ion-button>
  <ion-popover
    :trigger="triggerId"
    trigger-action="click"
    dismiss-on-select
  >
    <ion-content>
      <ion-list>
        <ion-radio-group
          :value="modelValue"
          @ion-change="$emit('update:modelValue', $event.detail.value)"
        >
          <ion-item
            v-for="option in options"
            :key="option.value"
            lines="none"
          >
            <ion-radio
              :value="option.value"
              justify="start"
              label-placement="end"
            >
              {{ translate(option.label) }}
            </ion-radio>
          </ion-item>
        </ion-radio-group>
      </ion-list>
    </ion-content>
  </ion-popover>
</template>

<script setup lang="ts" generic="T extends string">
import { translate } from "@common"
import { IonButton, IonContent, IonItem, IonList, IonPopover, IonRadio, IonRadioGroup } from "@ionic/vue"
import { computed } from "vue"

const props = defineProps<{
  modelValue: T
  options: { label: string, value: T }[]
  triggerId: string
}>()

defineEmits<{
  (event: "update:modelValue", value: T): void
}>()

const selectedLabel = computed(() => translate(props.options.find((option) => option.value === props.modelValue)?.label || "Sort"))
</script>
