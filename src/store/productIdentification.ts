import { commonUtil, logger, translate } from "@common"
import { defineStore } from "pinia"
import { fetchGoodIdentificationTypes, fetchProductIdentificationSetting, storeProductIdentificationSetting } from "@/api/productIdentification"
import { runProductSolrQuery, solrDocs, solrTotal } from "@/api/solr"
import {
  ALWAYS_OFFERED_IDENTIFICATION_TYPES, DEFAULT_PRODUCT_IDENTIFICATION_PREF, PRODUCT_DOCUMENT_IDENTIFIERS,
  type ProductIdentificationOption, type ProductIdentificationPref, parseProductIdentificationPref
} from "@/domain/product/identification"
import { identifierCoveragePayload } from "@/domain/solr/productQuery"
import { showToast } from "@/utils"

// The store whose preference was asked for last: a slower answer for a store already left is dropped.
let requestedPrefStoreId = ""
// Saves go out one after another, so a quick second change can never land before the first.
let pendingSave: Promise<unknown> = Promise.resolve()

/** The ProductStore's product identifier preference (PRDT_IDEN_PREF), ported from the other
 *  AccxUI apps' product store settings so rows show the same primary and secondary identifiers. */
export const useProductIdentificationStore = defineStore("productIdentification", {
  state: () => ({
    productIdentificationPref: { ...DEFAULT_PRODUCT_IDENTIFICATION_PREF } as ProductIdentificationPref,
    productIdentificationOptions: [] as ProductIdentificationOption[],
    sampleProducts: [] as Record<string, unknown>[],
    currentSampleProduct: null as Record<string, unknown> | null,
    /** Products that have each identifier, by option id, out of identifierCoverageTotal. */
    identifierCoverage: {} as Record<string, number>,
    identifierCoverageTotal: 0
  }),
  getters: {
    getProductIdentificationPref: (state) => state.productIdentificationPref,
    getProductIdentificationOptions: (state) => state.productIdentificationOptions,
    getCurrentSampleProduct: (state) => state.currentSampleProduct,
    getIdentifierCoverage: (state) => state.identifierCoverage
  },
  actions: {
    async fetchProductIdentificationPref(productStoreId: string) {
      requestedPrefStoreId = productStoreId
      if(!productStoreId) {
        this.productIdentificationPref = { ...DEFAULT_PRODUCT_IDENTIFICATION_PREF }

        return
      }

      let pref: ProductIdentificationPref
      try {
        pref = parseProductIdentificationPref(await fetchProductIdentificationSetting(productStoreId))
      } catch (error) {
        logger.error("Failed to fetch the product identifier setting", error)
        // Never keep the previous store's preference: rows would show it, and a change would save it here.
        pref = { ...DEFAULT_PRODUCT_IDENTIFICATION_PREF }
      }
      if(requestedPrefStoreId === productStoreId) {this.productIdentificationPref = pref}
    },
    async setProductIdentificationPref(productStoreId: string, productIdentificationPref: ProductIdentificationPref) {
      // Shown at once, so a second change made before this save returns builds on it.
      this.productIdentificationPref = productIdentificationPref
      const save = pendingSave.then(() => storeProductIdentificationSetting(productStoreId, JSON.stringify(productIdentificationPref)))
      pendingSave = save.catch(() => undefined)
      try {
        await save
        await showToast(translate("Product Store setting updated successfully."))
      } catch (error) {
        const serverError = commonUtil.getErrorMessage(error);
        logger.error("Failed to update the product identifier setting", error)
        await showToast(`${translate("Failed to update Product Store setting.")} ${serverError}`);
        // Show what the store really has, so the select matches it and the choice can be made again.
        await pendingSave
        await this.fetchProductIdentificationPref(productStoreId)
      }
    },
    async prepareProductIdentifierOptions() {
      let goodIdentificationTypes: ProductIdentificationOption[] = []
      try {
        goodIdentificationTypes = (await fetchGoodIdentificationTypes()).map((type) => ({
          goodIdentificationTypeId: String(type.goodIdentificationTypeId ?? ""),
          description: type.description ? String(type.description) : undefined
        }))
      } catch (error) {
        logger.error("Failed to fetch good identification types", error)
      }

      const options = new Map([...PRODUCT_DOCUMENT_IDENTIFIERS, ...ALWAYS_OFFERED_IDENTIFICATION_TYPES, ...goodIdentificationTypes]
        .filter((option) => option.goodIdentificationTypeId)
        .map((option) => [option.goodIdentificationTypeId, option]))
      this.productIdentificationOptions = [...options.values()]
      await this.fetchIdentifierCoverage()
    },
    async fetchIdentifierCoverage() {
      const documentFields = new Set(PRODUCT_DOCUMENT_IDENTIFIERS.map((option) => option.goodIdentificationTypeId))
      const identifiers = this.productIdentificationOptions.map((option) => ({
        id: option.goodIdentificationTypeId,
        isDocumentField: documentFields.has(option.goodIdentificationTypeId)
      }))
      try {
        const response = await runProductSolrQuery(identifierCoveragePayload(identifiers))
        this.identifierCoverage = Object.fromEntries(identifiers.flatMap(({ id }, index) => {
          const count = response.facets?.[`i${index}`]?.count

          return typeof count === "number" ? [[id, count]] : []
        }))
        this.identifierCoverageTotal = solrTotal(response)
      } catch (error) {
        // The options still work without counts.
        logger.error("Failed to count products by identifier", error)
        this.identifierCoverage = {}
        this.identifierCoverageTotal = 0
      }
    },
    async fetchSampleProducts() {
      // A random sample across the catalog: the first documents in index order are often variants of
      // one product, and a preview of only those says little about what other products show.
      const sample = { query: "*:*", filter: ["docType:PRODUCT"], limit: 10 }
      try {
        this.sampleProducts = solrDocs(await runProductSolrQuery({ ...sample, sort: `random_${Date.now()} asc` })
          .catch(() => runProductSolrQuery(sample)))
      } catch (error) {
        logger.error("Failed to fetch sample products", error)
        this.sampleProducts = []
      }
      this.shuffleProduct()
    },
    shuffleProduct() {
      this.currentSampleProduct = this.sampleProducts.length
        ? this.sampleProducts[Math.floor(Math.random() * this.sampleProducts.length)]
        : null
    }
  },
  persist: {
    pick: ["productIdentificationPref"]
  }
})
