import { request } from "./http"

/** A Shopify Admin GraphQL query run by the OMS (`shopify/graphql`) with a shop's SystemMessageRemote,
 *  which holds that shop's credentials. Returns the GraphQL `data`; GraphQL errors are thrown. */
export async function runShopifyGraphql<T>(systemMessageRemoteId: string, queryText: string, variables: Record<string, unknown> = {}): Promise<T> {
  const data = await request<Record<string, any>>({
    url: "shopify/graphql",
    method: "post",
    data: { systemMessageRemoteId, queryText, variables }
  })
  const errors = data?.errors ?? data?.response?.errors
  if(Array.isArray(errors) ? errors.length : errors) {throw new Error(`Shopify query failed: ${JSON.stringify(errors)}`)}

  return (data?.response ?? data?.data ?? data) as T
}
