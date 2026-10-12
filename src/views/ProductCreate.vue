<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/products" />
        </ion-buttons>
        <ion-title>{{ translate("Create product") }}</ion-title>
        <ion-progress-bar :value="progress"></ion-progress-bar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="step === 'display'" class="section">
        <ion-list lines="none">
          <ion-list-header>{{ translate("Display") }}</ion-list-header>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              v-model="info.imageUrl"
              :label="translate('Image URL')"
              label-placement="stacked"
              fill="outline"
              type="url"
              clear-input
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.productName, 'ion-touched': displayTouched }"
              v-model="info.productName"
              :label="translate('Name *')"
              label-placement="stacked"
              fill="outline"
              :error-text="displayErrors.productName"
              @ion-blur="displayTouched && validateDisplay()"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.internalName, 'ion-touched': displayTouched }"
              v-model="info.internalName"
              :label="translate('Internal name *')"
              label-placement="stacked"
              fill="outline"
              :error-text="displayErrors.internalName"
              @ion-blur="displayTouched && validateDisplay()"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.brandName, 'ion-touched': displayTouched }"
              v-model="info.brandName"
              :label="translate('Brand name *')"
              label-placement="stacked"
              fill="outline"
              :error-text="displayErrors.brandName"
            />
          </ion-item>
          <ion-item>
            <ion-select
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.productTypeId, 'ion-touched': displayTouched }"
              v-model="info.productTypeId"
              :label="translate('Type *')"
              label-placement="stacked"
              interface="popover"
              fill="outline"
              :error-text="displayErrors.productTypeId"
              @ion-change="displayTouched && validateDisplay()"
            >
              <ion-select-option
                v-for="option in productTypes"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-textarea
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.description, 'ion-touched': displayTouched }"
              v-model="info.description"
              :label="translate('Desc')"
              label-placement="stacked"
              auto-grow
              fill="outline"
              :error-text="displayErrors.description"
            />
          </ion-item>
          <ion-item>
            <ion-textarea
              class="ion-margin-top"
              :class="{ 'ion-invalid': displayTouched && displayErrors.longDescription, 'ion-touched': displayTouched }"
              v-model="info.longDescription"
              :label="translate('Long desc')"
              label-placement="stacked"
              auto-grow
              fill="outline"
              :error-text="displayErrors.longDescription"
            />
          </ion-item>
          <ion-item>
            <ion-button slot="end" fill="outline" @click="next('tags')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <div v-if="step === 'tags'" class="section">
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>{{ translate("Tags") }}</ion-label>
            <span>{{ tags.length }}</span>
          </ion-list-header>
          <div class="ion-margin-start">
            <ion-chip
              v-for="tag in tags"
              :key="tag"
              outline
            >
              <ion-label>{{ tag }}</ion-label>
              <ion-icon
                :icon="closeOutline"
                @click="removeTag(tag)"
              />
            </ion-chip>
          </div>
          <ion-item>
            <ion-input
              v-model="newTag"
              :placeholder="translate('Add tag')"
              fill="outline"
              label-placement="stacked"
              @keyup.enter="commitTag"
            />
            <ion-button
              fill="clear"
              :disabled="!newTag.trim()"
              @click="commitTag"
            >
              {{ translate("Add") }}
            </ion-button>
          </ion-item>
          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('display')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('dates')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <div v-if="step === 'dates'" class="section">
        <ion-list lines="none">
          <ion-list-header>{{ translate("Dates") }}</ion-list-header>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              v-model="dates.introductionDate"
              type="date"
              :label="translate('Introduction date')"
              label-placement="stacked"
              fill="outline"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              v-model="dates.releaseDate"
              type="date"
              :label="translate('Release date')"
              label-placement="stacked"
              fill="outline"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              v-model="dates.supportDiscontinuationDate"
              type="date"
              :label="translate('Support discontinuation date')"
              label-placement="stacked"
              fill="outline"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              v-model="dates.salesDiscontinuationDate"
              type="date"
              :label="translate('Sales discontinuation')"
              label-placement="stacked"
              fill="outline"
            />
          </ion-item>
          <ion-item
            lines="none"
            class="oos-toggle"
          >
            <ion-toggle v-model="dates.salesDiscWhenNotAvail">
              <ion-label>
                {{ translate("Discontinue when out of stock") }}
                <p class="ion-text-wrap">{{ translate("This item will not come back into stock. Do not accept backorders") }}</p>
              </ion-label>
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('tags')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('shipping')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Shipping & Handling -->
      <div v-if="step === 'shipping'" class="section-grid">
        <ion-list lines="none">
          <ion-list-header>{{ translate("Shipping and Handling") }}</ion-list-header>
        </ion-list>
        <div class="shipping-grid">
          <div class="shipping-fields">
            <ion-item lines="none">
              <ion-select
                class="ion-margin-top"
                v-model="shippingDimensions.defaultShipmentBoxTypeId"
                :label="translate('Default box type')"
                label-placement="stacked"
                interface="popover"
                fill="outline"
              >
                <ion-select-option value="">
                  {{ translate("None") }}
                </ion-select-option>
                <ion-select-option
                  v-for="option in boxTypes"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <div class="measure-row">
              <ion-input
                class="ion-margin-top"
                v-model="shippingDimensions.productWidth"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Width')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="shippingDimensions.widthUomId"
                placeholder="unit"
                :aria-label="translate('Width unit')"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.abbreviation }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                class="ion-margin-top"
                v-model="shippingDimensions.productHeight"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Height')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="shippingDimensions.heightUomId"
                placeholder="unit"
                :aria-label="translate('Height unit')"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.abbreviation }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                class="ion-margin-top"
                v-model="shippingDimensions.productDepth"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Depth')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="shippingDimensions.depthUomId"
                placeholder="unit"
                :aria-label="translate('Depth unit')"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in lengthUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.abbreviation }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="measure-row">
              <ion-input
                class="ion-margin-top"
                v-model="shippingDimensions.productWeight"
                min="0"
                placeholder="00"
                type="number"
                :label="translate('Weight')"
                label-placement="stacked"
                fill="outline"
              />
              <ion-select
                v-model="shippingDimensions.weightUomId"
                placeholder="unit"
                :aria-label="translate('Weight unit')"
                interface="popover"
                fill="outline"
              >
                <ion-select-option
                  v-for="uom in weightUoms"
                  :key="uom.id"
                  :value="uom.id"
                >
                  {{ uom.abbreviation }}
                </ion-select-option>
              </ion-select>
            </div>

            <ion-item lines="full">
              <ion-checkbox v-model="shippingDimensions.inShippingBox">
                {{ translate("In shipping box") }}
              </ion-checkbox>
            </ion-item>
            <ion-item lines="full">
              <ion-checkbox v-model="shippingDimensions.chargeShipping">
                {{ translate("Charge shipping") }}
              </ion-checkbox>
            </ion-item>
          </div>

          <div class="shipping-illustration">
            <DimensionBox
              :width="shippingDimensions.productWidth"
              :height="shippingDimensions.productHeight"
              :depth="shippingDimensions.productDepth"
              :width-unit="unitLabel(shippingDimensions.widthUomId)"
              :height-unit="unitLabel(shippingDimensions.heightUomId)"
              :depth-unit="unitLabel(shippingDimensions.depthUomId)"
              :width-factor="lengthUomToMm(shippingDimensions.widthUomId)"
              :height-factor="lengthUomToMm(shippingDimensions.heightUomId)"
              :depth-factor="lengthUomToMm(shippingDimensions.depthUomId)"
            />
          </div>
        </div>
        <ion-item lines="none">
          <ion-button slot="start" fill="outline" @click="next('dates')">
            {{ translate("Back") }}
          </ion-button>
          <ion-button slot="end" fill="outline" @click="next('inventoryPolicy')">
            {{ translate("Next") }}
          </ion-button>
        </ion-item>
      </div>

      <!-- Inventory Policy -->
      <div v-if="step === 'inventoryPolicy'" class="section">
        <ion-list lines="none">
          <ion-list-header>{{ translate("Inventory policy") }}</ion-list-header>
          <ion-item lines="full">
            <ion-toggle v-model="inventoryPolicy.returnable">
              {{ translate("Returnable") }}
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-toggle v-model="inventoryPolicy.taxable">
              {{ translate("Taxable") }}
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('shipping')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('identifications')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Identifications -->
      <div v-if="step === 'identifications'" class="section">
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>{{ translate("Identifications") }}</ion-label>
          </ion-list-header>
          <ion-item
            v-for="type in identificationTypes"
            :key="type.id"
          >
            <ion-input
              class="ion-margin-top"
              v-model="identValues[type.id]"
              :label="type.label"
              label-placement="stacked"
              fill="outline"
              clear-input
            />
          </ion-item>
          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('inventoryPolicy')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('categories')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Categories -->
      <div v-if="step === 'categories'" class="section">
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>{{ translate("Categories") }}</ion-label>
            <span>{{ selectedCategories.length }}</span>
          </ion-list-header>

          <div class="ion-margin-right">
            <ion-chip :outline="!isCategorySelected(category.productCategoryId)" @click="!isCategorySelected(category.productCategoryId) ? addCategory(category) : removeCategory(category.productCategoryId)" v-for="category in categories" :key="category.productCategoryId">
              {{ category.categoryName }}
            </ion-chip>
          </div>
          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('identifications')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('prices')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Prices -->
      <div v-if="step === 'prices'" class="section">
        <ion-list lines="none">
          <ion-list-header><h4>{{ translate("Prices") }}</h4></ion-list-header>
          <ion-item>
            <ion-select
              class="ion-margin-top"
              :class="{ 'ion-invalid': pricesTouched && priceErrors.priceUomId, 'ion-touched': pricesTouched }"
              v-model="priceUomId"
              :label="translate('Currency')"
              label-placement="stacked"
              interface="popover"
              fill="outline"
              :error-text="priceErrors.priceUomId"
              @ion-change="pricesTouched && validatePrices()"
            >
              <ion-select-option
                v-for="option in currencies"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': pricesTouched && priceErrors.DEFAULT_PRICE, 'ion-touched': pricesTouched }"
              :label="translate('Default Price')"
              label-placement="stacked"
              fill="outline"
              v-model="draftedPrices.DEFAULT_PRICE"
              type="number"
              min="0"
              :error-text="priceErrors.DEFAULT_PRICE"
              @ion-blur="pricesTouched && validatePrices()"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': pricesTouched && priceErrors.LIST_PRICE, 'ion-touched': pricesTouched }"
              :label="translate('List Price')"
              label-placement="stacked"
              fill="outline"
              v-model="draftedPrices.LIST_PRICE"
              type="number"
              min="0"
              :error-text="priceErrors.LIST_PRICE"
              @ion-blur="pricesTouched && validatePrices()"
            />
          </ion-item>
          <ion-item>
            <ion-input
              class="ion-margin-top"
              :class="{ 'ion-invalid': pricesTouched && priceErrors.WHOLESALE_PRICE, 'ion-touched': pricesTouched }"
              :label="translate('Wholesale Price')"
              label-placement="stacked"
              fill="outline"
              v-model="draftedPrices.WHOLESALE_PRICE"
              type="number"
              min="0"
              :error-text="priceErrors.WHOLESALE_PRICE"
              @ion-blur="pricesTouched && validatePrices()"
            />
          </ion-item>

          <ion-item>
            <ion-button slot="start" fill="outline" @click="next('categories')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" @click="next('features')">
              {{ translate("Next") }}
            </ion-button>
          </ion-item>
        </ion-list>
      </div>

      <!-- Features -->
      <div v-if="step === 'features'" class="section">
        <FeaturesSection
          :family-axes="draftAxes"
          :applied-feature-ids="draftAppliedIds"
          :feature-types="featureTypes"
          @toggle="onToggleFeature"
          @create-value="onCreateFeatureValue"
        />
        <ion-item lines="none">
          <ion-button slot="start" fill="outline" @click="next('prices')">
            {{ translate("Back") }}
          </ion-button>
          <ion-button slot="end" fill="outline" :disabled="creating" @click="submit">
            {{ translate("Save") }}
          </ion-button>
        </ion-item>
      </div>

      <!-- Variants -->
      <!-- <div v-if="step === 'variants'" class="section">
        <ion-list lines="none">
          <ion-list-header>
            <ion-label>{{ translate("Variants") }}</ion-label>
            <span>{{ variants.length }}</span>
            <ion-button @click="pickerOpen = true">{{ translate("Add") }}</ion-button>
          </ion-list-header>
          <ion-item
            v-for="variant in variants"
            :key="variant.productId"
            lines="full"
          >
            <ion-thumbnail slot="start">
              <DxpShopifyImg
                :src="variant.imageUrl"
                size="thumb"
              />
            </ion-thumbnail>
            <ion-label>
              <h3>{{ variantName(variant) }}</h3>
              <p>{{ variant.sku || variant.productId }}</p>
            </ion-label>
            <ion-button
              slot="end"
              fill="clear"
              color="danger"
              size="small"
              @click="removeVariant(variant.productId)"
            >
              {{ translate("Remove") }}
            </ion-button>
          </ion-item>

          <ion-item lines="none">
            <ion-button slot="start" fill="outline" @click="next('prices')">
              {{ translate("Back") }}
            </ion-button>
            <ion-button slot="end" fill="outline" :disabled="creating" @click="submit">
              {{ translate("Save") }}
            </ion-button>
          </ion-item>
        </ion-list>

        <ProductPicker
          :is-open="pickerOpen"
          :title="translate('Add variant')"
          :exclude-product-ids="variantIds"
          @select="addVariant"
          @dismiss="pickerOpen = false"
        />
      </div> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonHeader, IonIcon,
  IonInput, IonItem, IonLabel, IonPage, IonSelect, IonSelectOption, IonProgressBar,
  IonTextarea, IonTitle, IonToggle, IonToolbar,
  IonList, IonListHeader,
  onIonViewWillEnter
} from "@ionic/vue"
import { computed, reactive, ref } from "vue"
import { z } from "zod"
import router from "../router"
import { useQuery } from "@tanstack/vue-query"
import { emitter, translate } from "@common"
import { closeOutline } from "ionicons/icons"
import DimensionBox from "@/components/detail/DimensionBox.vue"
import ProductPicker from "@/components/detail/ProductPicker.vue"
import FeaturesSection from "@/components/detail/FeaturesSection.vue"
import { createFeature, createProduct, fetchProductCategories, triggerSolrIndex } from "@/api/pim"
import { boxTypesOptions, currencyUomOptions, featureTypesOptions, identificationTypesOptions, lengthUomOptions, weightUomOptions, productTypesOptions } from "@/queries/catalog"
import { buildFeatureAxes, FEATURE_APPL_TYPE } from "@/domain/normalize/feature"
import { lengthUomToMm } from "@/domain/product/uom"
import { productDisplayName } from "@/domain/normalize/product"
import { useToast } from "@/composables/useToast"
import type { ProductCategory, ProductFeatureApplication, ProductSummary } from "@/domain/types/product"
import { useUserStore } from "@/store/user"

const toast = useToast()

// ---------- Display validation (Zod) ----------
const displaySchema = z.object({
  productName: z.string().trim().min(1, "Product Name is required").max(200, "Max 200 characters"),
  internalName: z.string().trim().min(1, "Internal Name is required").max(200, "Max 200 characters"),
  brandName: z.string().trim().min(1, "Brand Name is required").max(100, "Max 100 characters"),
  productTypeId: z.string().min(1, "Product type is required"),
  imageUrl: z.string().trim().max(2000, "Max 2000 characters").optional(),
  description: z.string().trim().max(5000, "Max 5000 characters").optional(),
  longDescription: z.string().trim().max(10000, "Max 10000 characters").optional()
})

type DisplayErrors = Partial<Record<keyof z.infer<typeof displaySchema>, string>>
const displayErrors = ref<DisplayErrors>({})
const displayTouched = ref(false)

const validateDisplay = (): boolean => {
  displayTouched.value = true
  const result = displaySchema.safeParse(info)
  if(result.success) {
    displayErrors.value = {}

    return true
  }
  const errors: DisplayErrors = {}
  for(const issue of result.error.issues) {
    const field = issue.path[0] as keyof DisplayErrors
    if(field && !errors[field]) {
      errors[field] = issue.message
    }
  }
  displayErrors.value = errors

  return false
}

// ---------- Prices validation (Zod) ----------
const PRICE_FIELDS = ["DEFAULT_PRICE", "LIST_PRICE", "WHOLESALE_PRICE"] as const
type PriceField = typeof PRICE_FIELDS[number]

const positivePrice = z.string().trim().refine(
  (v) => v === "" || (!isNaN(Number(v)) && Number(v) > 0),
  { message: "Must be a positive number" }
)

const pricesSchema = z.object({
  priceUomId: z.string(),
  DEFAULT_PRICE: positivePrice,
  LIST_PRICE: positivePrice,
  WHOLESALE_PRICE: positivePrice
}).superRefine((data, ctx) => {
  const anyEntered = PRICE_FIELDS.some((f) => data[f].trim() !== "")
  if(anyEntered && !data.priceUomId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Currency is required when a price is set",
      path: ["priceUomId"]
    })
  }
})

type PriceErrors = Partial<Record<PriceField | "priceUomId", string>>
const priceErrors = ref<PriceErrors>({})
const pricesTouched = ref(false)
const currentProductStore = computed(() => useUserStore().getCurrentProductStore)

const validatePrices = (): boolean => {
  pricesTouched.value = true
  const result = pricesSchema.safeParse({
    priceUomId: priceUomId.value,
    DEFAULT_PRICE: draftedPrices.value.DEFAULT_PRICE,
    LIST_PRICE: draftedPrices.value.LIST_PRICE,
    WHOLESALE_PRICE: draftedPrices.value.WHOLESALE_PRICE
  })
  if(result.success) {
    priceErrors.value = {}

    return true
  }
  const errors: PriceErrors = {}
  for(const issue of result.error.issues) {
    const field = issue.path[0] as keyof PriceErrors
    if(field && !errors[field]) {
      errors[field] = issue.message
    }
  }
  priceErrors.value = errors

  return false
}

// Reference data
const productTypesQuery = useQuery(productTypesOptions())
const boxTypesQuery = useQuery(boxTypesOptions())
const lengthUomsQuery = useQuery(lengthUomOptions())
const weightUomsQuery = useQuery(weightUomOptions())
const identificationTypesQuery = useQuery(identificationTypesOptions())
const featureTypesQuery = useQuery(featureTypesOptions())
const currenciesQuery = useQuery(currencyUomOptions())
const productTypes = computed(() => productTypesQuery.data.value ?? [])
const boxTypes = computed(() => boxTypesQuery.data.value ?? [])
const lengthUoms = computed(() => lengthUomsQuery.data.value ?? [])
const weightUoms = computed(() => weightUomsQuery.data.value ?? [])
const identificationTypes = computed(() => identificationTypesQuery.data.value ?? [])
const featureTypes = computed(() => featureTypesQuery.data.value ?? [])
const currencies = computed(() => currenciesQuery.data.value ?? [])

const info = reactive({
  productName: "",
  internalName: "",
  brandName: "",
  productTypeId: "",
  imageUrl: "",
  description: "",
  longDescription: ""
})

const dates = reactive({
  introductionDate: "",
  releaseDate: "",
  supportDiscontinuationDate: "",
  salesDiscontinuationDate: "",
  salesDiscWhenNotAvail: false
})

const shippingDimensions = reactive({
  productWidth: "" as number | "",
  productHeight: "" as number | "",
  productDepth: "" as number | "",
  productWeight: "" as number | "",
  widthUomId: "",
  heightUomId: "",
  depthUomId: "",
  weightUomId: "",
  inShippingBox: false,
  chargeShipping: false,
  defaultShipmentBoxTypeId: "",
})

const inventoryPolicy = reactive({
  returnable: true,
  taxable: true
})

const tags = ref<string[]>([])
const newTag = ref("")
const identValues = reactive<Record<string, string>>({})
const draftedPrices = ref({
  "DEFAULT_PRICE": "",
  "LIST_PRICE": "",
  "WHOLESALE_PRICE": ""
})
const selectedCategories = ref<ProductCategory[]>([])
const categories = ref();
const variants = ref<ProductSummary[]>([])
const pickerOpen = ref(false)
const creating = ref(false)
const step = ref("display")
const priceUomId = ref("USD")

const steps = ["display", "tags", "dates", "shipping", "inventoryPolicy", "identifications", "categories", "prices", "features"]

const variantIds = computed(() => variants.value.map((v) => v.productId))
const progress = computed(() => steps.findIndex((s) => s === step.value) / 10)

// Tags
const commitTag = () => {
  const tag = newTag.value.trim()
  if(!tag || tags.value.includes(tag)) {return}
  tags.value.push(tag)
  newTag.value = ""
}
const removeTag = (tag: string) => {
  tags.value = tags.value.filter((t) => t !== tag)
}

// Categories
const addCategory = (category: ProductCategory) => {
  if(!selectedCategories.value.some((c) => c.productCategoryId === category.productCategoryId)) {
    selectedCategories.value.push(category)
  }
}

const removeCategory = (productCategoryId: string) => {
  selectedCategories.value = selectedCategories.value.filter((c) => c.productCategoryId !== productCategoryId)
}

const isCategorySelected = computed(() => (productCategoryId: string) => {
  return selectedCategories.value.some((c) => c.productCategoryId === productCategoryId)
})

// Identifications — flat record; only non-empty entries are submitted
const filledIdentifications = computed(() =>
  Object.entries(identValues)
    .filter(([, idValue]) => idValue.trim())
    .map(([goodIdentificationTypeId, idValue]) => ({ goodIdentificationTypeId, idValue }))
)

// Features — local draft; applyFeature called post-creation
const draftedFeatures = ref<ProductFeatureApplication[]>([])
const draftAxes = computed(() => buildFeatureAxes(draftedFeatures.value))
const draftAppliedIds = computed(() => new Set(draftedFeatures.value.map((f) => f.productFeatureId)))

const onToggleFeature = ({ application, applied }: { application: { productFeatureId: string }; applied: boolean }) => {
  // On the create page all drafted features are "applied"; clicking removes them
  if(applied) {
    draftedFeatures.value = draftedFeatures.value.filter((f) => f.productFeatureId !== application.productFeatureId)
  }
}

const onCreateFeatureValue = async ({ featureTypeId, description }: { featureTypeId: string; description: string }) => {
  try {
    const { productFeatureId } = await createFeature({ productFeatureTypeId: featureTypeId, description })
    const featureTypeDescription = featureTypes.value.find((t) => t.id === featureTypeId)?.label ?? featureTypeId
    draftedFeatures.value.push({
      productId: "",
      productFeatureId,
      productFeatureApplTypeId: FEATURE_APPL_TYPE.standard,
      featureTypeId,
      featureTypeDescription,
      description,
      fromDate: new Date().toISOString(),
      thruDate: null,
      active: true,
      sequenceNum: null
    })
  } catch(error) {
    toast.error(error, translate("Could not add feature"))
  }
}

// Variants
const variantName = productDisplayName
const addVariant = (items: Array<{ product: ProductSummary; quantity: number }>) => {
  for(const { product } of items) {
    if(!variants.value.some((v) => v.productId === product.productId)) {
      variants.value.push(product)
    }
  }
  pickerOpen.value = false
}
const removeVariant = (productId: string) => {
  variants.value = variants.value.filter((v) => v.productId !== productId)
}

const next = (s: string) => {
  if(step.value === "display" && s !== "display") {
    if(!validateDisplay()) {return}
  }
  if(step.value === "prices" && s !== "prices") {
    if(!validatePrices()) {return}
  }
  step.value = s
}

// Shipping helper
const unitLabel = (uomId: string) => lengthUoms.value.find((uom) => uom.id === uomId)?.label ?? ""

// Submit
const yesNo = (val: boolean): "Y" | "N" => (val ? "Y" : "N")

const submit = async () => {
  if(creating.value) {return}
  creating.value = true

  try {
    const { productId } = await createProduct({
      productName: info.productName.trim() || undefined,
      internalName: info.internalName.trim() || undefined,
      brandName: info.brandName.trim() || undefined,
      description: info.description.trim() || undefined,
      longDescription: info.longDescription.trim() || undefined,
      productTypeId: info.productTypeId || undefined,
      detailImageUrl: info.imageUrl.trim() || undefined,
      introductionDate: dates.introductionDate || undefined,
      releaseDate: dates.releaseDate || undefined,
      supportDiscontinuationDate: dates.supportDiscontinuationDate || undefined,
      salesDiscontinuationDate: dates.salesDiscontinuationDate || undefined,
      salesDiscWhenNotAvail: yesNo(dates.salesDiscWhenNotAvail),
      returnable: yesNo(inventoryPolicy.returnable),
      taxable: yesNo(inventoryPolicy.taxable),
      chargeShipping: yesNo(shippingDimensions.chargeShipping),
      inShippingBox: yesNo(shippingDimensions.inShippingBox),
      defaultShipmentBoxTypeId: shippingDimensions.defaultShipmentBoxTypeId || undefined,
      productWidth: shippingDimensions.productWidth !== "" ? shippingDimensions.productWidth : undefined,
      productHeight: shippingDimensions.productHeight !== "" ? shippingDimensions.productHeight : undefined,
      productDepth: shippingDimensions.productDepth !== "" ? shippingDimensions.productDepth : undefined,
      productWeight: shippingDimensions.productWeight !== "" ? shippingDimensions.productWeight : undefined,
      widthUomId: shippingDimensions.widthUomId || undefined,
      heightUomId: shippingDimensions.heightUomId || undefined,
      depthUomId: shippingDimensions.depthUomId || undefined,
      weightUomId: shippingDimensions.weightUomId || undefined,
      isVirtual: "Y",
      keywords: tags.value.map((keyword) => ({
        keywordTypeId: "KWT_TAG",
        statusId: "KW_APPROVED",
        keyword
      })),
      identifications: filledIdentifications.value,
      prices: Object.entries(draftedPrices.value).filter(([type, price]) => price).map(([type, price]) => ({
        price,
        currencyUomId: priceUomId.value,
        productPricePurposeId: "LISTING",
        productPriceTypeId: type,
        productStoreId: currentProductStore.value.productStoreId,
        productStoreGroupId: currentProductStore.value.primaryStoreGroupId
      })),
      categories: selectedCategories.value,
      featureAppls: draftedFeatures.value.map((feature) => {
        delete feature?.productId
        return {
          ...feature
        }
      })
    })

    triggerSolrIndex(productId)
    emitter.emit("presentLoader", "Creating product...")
    setTimeout(() => {
      router.replace(`/products/${productId}`)
      emitter.emit("dismissLoader")
    }, 3000)

  } catch(error) {
    toast.error(error, translate("Could not create product"))
    creating.value = false
  }
}

onIonViewWillEnter(async () => {
  categories.value = await fetchProductCategories();
})

</script>

<style scoped>
div.section {
  width: 375px;
  margin: auto;
}

div.section-grid {
  width: 610px;
  margin: auto;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.grid-desc {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  margin-top: 16px;
}

.oos-toggle {
  margin-top: 8px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-row ion-input {
  flex: 1;
}

.no-tags {
  font-size: 14px;
  color: var(--ion-color-medium);
  margin: 0;
}

.shipping-grid {
  display: grid;
  grid-template-columns: 375px 1fr;
  gap: 24px;
  justify-content: center;
}

.shipping-fields {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shipping-fields ion-item {
  --padding-start: 0;
  --padding-end: 0;
}

.measure-row {
  display: grid;
  grid-template-columns: 1fr max-content;
  gap: 8px;
  align-items: end;
}

.shipping-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.toggle-row ion-item {
  --padding-start: 0;
}

.variants-list {
  margin-top: 4px;
}

.no-variants,
.no-categories {
  color: var(--ion-color-medium);
  font-size: 13px;
}

.categories-list {
  margin-top: 4px;
}

.create-footer {
  padding: 16px;
}

@media (max-width: 720px) {
  .grid-desc {
    grid-template-columns: 1fr;
  }

  .shipping-grid {
    grid-template-columns: 1fr;
  }
}
</style>
