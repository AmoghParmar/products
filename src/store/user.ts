import { DateTime, Settings } from "luxon"
import { defineStore } from "pinia"
import { api, commonUtil, cookieHelper, logger, translate } from "@common"
import { useAuth } from "@common/composables/useAuth"

import { showToast } from "@/utils"
import Actions from "@/authorization/actions"

let permissionsRequest: Promise<void> | null = null

export const useUserStore = defineStore("user", {
  state: () => ({
    current: {} as any,
    permissions: [] as string[],
    currentProductStore: {
      productStoreId: "",
      storeName: "None"
    } as any,
    pwaState: {
      updateExists: false,
      registration: null as any
    },
    timeZones: [] as any[],
    oms: "",
    // The app version this deployment is pinned to. undefined = not resolved yet, "" = no version
    // configured, "vX.Y.Z" = pinned. Resolved from the OMS by useAuth().fetchAppVersion() on Login.
    appVersion: undefined as string | undefined,
    fetchStatus: {
      profile: "none",
      permissions: "none"
    } as any
  }),
  getters: {
    getPermissions: (state) => state.permissions,
    getUserProfile: (state) => state.current,
    getAppVersion: (state) => state.appVersion,
    getPwaState: (state) => state.pwaState,
    getCurrentProductStore: (state) => state.currentProductStore,
    getUserTimeZone: (state) => state.current.timeZone,
    getAvailableTimeZones: (state) => state.timeZones,
    hasPermission: (state) => (permissionId: string): boolean => {
      if(!permissionId) {return true}
      if(state.permissions.includes(Actions.APP_COMMON_ADMIN)) {return true}

      if(permissionId.includes(" OR ")) {
        return permissionId.split(" OR ").some((part) => useUserStore().hasPermission(part.trim()))
      }

      if(permissionId.includes(" AND ")) {
        return permissionId.split(" AND ").every((part) => useUserStore().hasPermission(part.trim()))
      }

      return state.permissions.includes(permissionId)
    }
  },
  actions: {
    async fetchUserProfile() {
      this.fetchStatus.profile = "pending"

      try {
        const userProfileResp = await api({
          url: "admin/user/profile",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        })
        this.current = userProfileResp.data
        useAuth().updateUserId(this.current.userId)

        if(this.current.timeZone) {Settings.defaultZone = this.current.timeZone}

        this.oms = cookieHelper().get("oms") || '';
        this.fetchStatus.profile = "success"
      } catch (error: any) {
        const serverError = commonUtil.getErrorMessage(error);
        await showToast(`${translate("Failed to fetch user profile information")}. ${serverError}`)
        logger.error("Failed to fetch user profile information", error)
        useAuth().clearAuth()
        this.fetchStatus.profile = "error"

        return Promise.reject(error)
      }
    },
    async fetchPermissions() {
      this.fetchStatus.permissions = "pending"
      this.permissions = []
      const permissionId = import.meta.env.VITE_APP_PERMISSION_ID
      const serverPermissions: string[] = []
      const viewSize = 200
      let viewIndex = 0

      try {
        let hasMore = true
        while(hasMore) {
          const resp = await api({
            url: "admin/user/permissions",
            method: "GET",
            params: { viewIndex, viewSize }
          }) as any

          const docs = resp?.data?.docs ?? []
          if(resp?.status === 200 && docs.length && !commonUtil.hasError(resp)) {
            serverPermissions.push(...docs.map((permission: any) => permission.permissionId).filter(Boolean))
            viewIndex += 1
          } else {
            hasMore = false
          }
        }

        if(permissionId && !serverPermissions.includes(permissionId) && !serverPermissions.includes(Actions.APP_COMMON_ADMIN)) {
          const permissionError = "You do not have permission to access the app."
          await showToast(translate(permissionError))
          logger.error("error", permissionError)
          this.fetchStatus.permissions = "error"

          return Promise.reject(new Error(permissionError))
        }

        this.permissions = serverPermissions
        this.fetchStatus.permissions = "success"
      } catch (error: any) {
        this.fetchStatus.permissions = "error"
        logger.error("Failed to fetch permissions", error)

        return Promise.reject(error)
      }
    },
    async ensurePermissions(force = false) {
      if(!force && this.fetchStatus.permissions === "success") {return}

      if(!permissionsRequest) {
        permissionsRequest = this.fetchPermissions().finally(() => {
          permissionsRequest = null
        })
      }

      return permissionsRequest
    },
    async fetchProductStores() {
      try {
        const productStoresResp = await api({
          url: "admin/productStores",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        })
        this.current.stores = Array.isArray(productStoresResp.data) ? productStoresResp.data : []
        this.current.stores.push({
          productStoreId: "",
          storeName: "None"
        })
        this.setCurrentProductStore(this.current.stores[0])
      } catch (error: any) {
        logger.error("Failed to fetch product stores", error)
      }
    },
    setCurrentProductStore(productStoreInfo: any) {
      let productStore = productStoreInfo
      if(productStoreInfo?.productStoreId && !productStoreInfo.storeName) {
        productStore = this.current.stores?.find((store: any) => store.productStoreId === productStoreInfo.productStoreId)
      }

      this.currentProductStore = productStore
    },
    async setUserTimeZone(tzId: string) {
      if(this.current.timeZone === tzId) {return tzId}

      try {
        const resp = await api({
          url: "admin/user/profile",
          method: "post",
          baseURL: commonUtil.getMaargURL(),
          data: {
            userId: this.current.userId,
            tzId
          }
        }) as any

        if(resp?.status !== 200) {throw resp}

        this.current.timeZone = tzId
        Settings.defaultZone = tzId
        await showToast(translate("Time zone updated successfully"))

        return tzId
      } catch (error: any) {
        const serverError = commonUtil.getErrorMessage(error);
        logger.error("Failed to update time zone", error)
        await showToast(`${translate("Failed to update time zone")}. ${serverError}`)

        return Promise.reject(error)
      }
    },
    async fetchAvailableTimeZones() {
      if(this.timeZones.length) {return}

      try {
        const resp = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          baseURL: commonUtil.getMaargURL()
        }) as any

        this.timeZones = (resp.data?.timeZones || []).filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid)
      } catch (error: any) {
        logger.error("Failed to fetch time zones", error)
      }
    },
    updatePwaState(payload: any) {
      this.pwaState.registration = payload.registration
      this.pwaState.updateExists = payload.updateExists
    },
    async postLogin() {
      try {
        await this.fetchUserProfile()
        await this.ensurePermissions(true)
        await this.fetchProductStores()
      } catch (error: any) {
        return Promise.reject(error)
      }
    },
    postLogout() {
      permissionsRequest = null
      this.$reset()
    }
  },
  persist: {
    omit: ["fetchStatus"]
  }
})
