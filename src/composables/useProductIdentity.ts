import { computed } from "vue"
import { productIdentity } from "@/domain/product/identification"
import { useProductIdentificationStore } from "@/store/productIdentification"

/** The ProductStore's product identifier setting (Settings > Product identifier) applied to a product,
 *  for lists that need the text itself rather than the ProductIdentity component. */
export function useProductIdentity() {
  const productIdentificationStore = useProductIdentificationStore()
  const pref = computed(() => productIdentificationStore.getProductIdentificationPref)

  return {
    identityOf: (product?: object | null) => productIdentity(pref.value, product)
  }
}
