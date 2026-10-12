/**
 * App actions mapped to the server permissions they require.
 *
 * Views, components and routes should always refer to an action from this file instead of
 * hardcoding a server permission, so that a permission change is a one line change here.
 *
 * The value is the permission expression evaluated by `hasPermission` of the user store.
 * It supports the `OR` and `AND` operators, and an empty value means the action is allowed
 * for every logged in user.
 */
export default {
  APP_SETTINGS_VIEW: "",
  APP_PRODUCTS_VIEW: "PIM_PRODUCT_VIEW OR PIM_PRODUCT_ADMIN",
  APP_PRODUCT_UPDATE: "PIM_PRODUCT_CREATE OR PIM_PRODUCT_ADMIN",
  APP_FEATURE_UPDATE: "PIM_FEATURE_CREATE OR PIM_FEATURE_ADMIN",
  APP_FEATURE_REMOVE: "PIM_FEATURE_ADMIN",
  APP_DUPLICATE_RESOLUTION: "PIM_PRODUCT_ADMIN",
  APP_SEARCH_REINDEX: "SEARCH_UPDATE OR SEARCH_ADMIN",
  APP_COMMON_ADMIN: "COMMON_ADMIN",
  // PRDT_IDEN_PREF is a ProductStore-wide setting other apps read too, so it needs the admin permission.
  APP_PRODUCT_IDENTIFIER_UPDATE: "COMMON_ADMIN"
} as const satisfies Record<string, string>
