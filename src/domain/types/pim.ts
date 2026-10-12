/** Request payloads for the pim component's write APIs (/rest/s1/pim). One place to track the contract. */

export interface PriceEntry {
  productPriceTypeId: string
  currencyUomId: string
  price?: number
  productPricePurposeId?: string
  productStoreId?: string
  productStoreGroupId?: string
  fromDate?: string
  thruDate?: string
}

/** PATCH semantics: only send changed fields; empty string clears a field server-side. */
export interface ProductFieldsPatch {
  productName?: string
  internalName?: string
  brandName?: string
  description?: string
  longDescription?: string
  comments?: string
  productTypeId?: string
  primaryProductCategoryId?: string
  introductionDate?: string
  releaseDate?: string
  supportDiscontinuationDate?: string
  salesDiscontinuationDate?: string
  salesDiscWhenNotAvail?: "Y" | "N"
  returnable?: "Y" | "N"
  taxable?: "Y" | "N"
  chargeShipping?: "Y" | "N"
  inShippingBox?: "Y" | "N"
  defaultShipmentBoxTypeId?: string
  productWeight?: number | string
  productHeight?: number | string
  productWidth?: number | string
  productDepth?: number | string
  weightUomId?: string
  heightUomId?: string
  widthUomId?: string
  depthUomId?: string
  detailImageUrl?: string
  smallImageUrl?: string
  /** attribute-backed toggles (no Product columns; pim maps to ProductAttribute) */
  requiresInspection?: "Y" | "N"
  autoApproveSubstitutes?: "Y" | "N"
  prices?: PriceEntry[]
}

export interface IdentificationCreate {
  goodIdentificationTypeId: string
  idValue: string
}

export interface IdentificationKey {
  goodIdentificationTypeId: string
  fromDate: string
}

export interface AssociationCreate {
  productIdTo: string
  productAssocTypeId: string
  sequenceNum?: number
  quantity?: number
  scrapFactor?: number
  instruction?: string
  reason?: string
}

export interface AssociationKey {
  productIdTo: string
  productAssocTypeId: string
  fromDate: string
}

export interface AssociationUpdate extends AssociationKey {
  sequenceNum?: number
  quantity?: number | null
  scrapFactor?: number | null
  instruction?: string
  reason?: string
}

export interface FeatureApply {
  productFeatureId: string
  productFeatureApplTypeId?: string
  sequenceNum?: number
}

export interface FeatureCreate {
  productFeatureTypeId: string
  description: string
  abbrev?: string
  idCode?: string
}

export interface ProductPriceCreate {
  productPriceTypeId: string
  currencyUomId: string
  price: number
  productPricePurposeId?: string
  productStoreId?: string
}

export interface ProductCreatePayload {
  productName?: string
  internalName?: string
  brandName?: string
  description?: string
  longDescription?: string
  productTypeId?: string
  introductionDate?: string
  releaseDate?: string
  supportDiscontinuationDate?: string
  salesDiscontinuationDate?: string
  salesDiscWhenNotAvail?: "Y" | "N"
  returnable?: "Y" | "N"
  taxable?: "Y" | "N"
  chargeShipping?: "Y" | "N"
  inShippingBox?: "Y" | "N"
  defaultShipmentBoxTypeId?: string
  productWeight?: number | string
  productHeight?: number | string
  productWidth?: number | string
  productDepth?: number | string
  weightUomId?: string
  heightUomId?: string
  widthUomId?: string
  depthUomId?: string
  detailImageUrl?: string
  smallImageUrl?: string
  isVirtual?: "Y" | "N"
  [key: string]: any
}

export interface DedupChange {
  productId: string
  goodIdentificationTypeId: string
  idValue: string
}
