import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { api } from "@common"
import { showToast } from "@/utils"
import { useUserStore } from "./user"

const commonUtilMock = vi.hoisted(() => ({
  getMaargURL: vi.fn(() => "https://maarg.example/rest/s1/"),
  getOmsURL: vi.fn(() => "https://oms.example/rest/s1/"),
  hasError: vi.fn(() => false),
  isMoqui: vi.fn(() => true)
}))

vi.mock("@common", () => ({
  api: vi.fn(),
  commonUtil: commonUtilMock,
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  translate: (message: string) => message
}))

vi.mock("@common/composables/useAuth", () => ({
  useAuth: () => ({
    clearAuth: vi.fn(),
    updateUserId: vi.fn()
  })
}))

vi.mock("@/utils", () => ({
  showToast: vi.fn()
}))

const permissionResponse = (docs: { permissionId: string }[]) => ({
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
  data: { docs }
}) as any

describe("user store permissions", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api).mockReset()
    vi.mocked(showToast).mockReset()
    vi.unstubAllEnvs()
    commonUtilMock.hasError.mockReturnValue(false)
    commonUtilMock.isMoqui.mockReturnValue(true)
  })

  it("supports empty, OR, AND, and common admin permission expressions", () => {
    const userStore = useUserStore()
    userStore.permissions = ["PIM_PRODUCT_VIEW", "PIM_FEATURE_CREATE"]

    expect(userStore.hasPermission("")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_ADMIN")).toBe(false)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW OR PIM_PRODUCT_ADMIN")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW AND PIM_FEATURE_CREATE")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW AND PIM_FEATURE_ADMIN")).toBe(false)

    userStore.permissions = ["COMMON_ADMIN"]

    expect(userStore.hasPermission("PIM_PRODUCT_ADMIN")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW AND PIM_FEATURE_ADMIN")).toBe(true)
    expect(userStore.hasPermission("PIM_PRODUCT_VIEW OR PIM_PRODUCT_ADMIN")).toBe(true)
  })

  it("loads Moqui permissions from admin/user/permissions with pagination", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "PIM_PRODUCT_VIEW" }, { permissionId: "PIM_FEATURE_CREATE" }]))
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "SEARCH_UPDATE" }, { permissionId: "PRODUCTS_APP_VIEW" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    await userStore.fetchPermissions()

    expect(api).toHaveBeenNthCalledWith(1, {
      url: "admin/user/permissions",
      method: "GET",
      params: { viewIndex: 0, viewSize: 200 }
    })
    expect(api).toHaveBeenNthCalledWith(2, {
      url: "admin/user/permissions",
      method: "GET",
      params: { viewIndex: 1, viewSize: 200 }
    })
    expect(userStore.permissions).toEqual(["PIM_PRODUCT_VIEW", "PIM_FEATURE_CREATE", "SEARCH_UPDATE", "PRODUCTS_APP_VIEW"])
    expect(userStore.fetchStatus.permissions).toBe("success")
  })

  it("rejects app access when configured app permission is missing", async () => {
    vi.stubEnv("VITE_APP_PERMISSION_ID", "PRODUCTS_APP_VIEW")
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "PIM_PRODUCT_VIEW" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()

    await expect(userStore.fetchPermissions()).rejects.toThrow("You do not have permission to access the app.")
    expect(userStore.permissions).toEqual([])
    expect(userStore.fetchStatus.permissions).toBe("error")
    expect(showToast).toHaveBeenCalledWith("You do not have permission to access the app.")
  })

  it("clears stale permissions when configured app access is rejected", async () => {
    vi.stubEnv("VITE_APP_PERMISSION_ID", "PRODUCTS_APP_VIEW")
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "PIM_PRODUCT_VIEW" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    userStore.permissions = ["COMMON_ADMIN"]

    await expect(userStore.fetchPermissions()).rejects.toThrow("You do not have permission to access the app.")

    expect(userStore.permissions).toEqual([])
  })

  it("allows configured app access with common admin permission", async () => {
    vi.stubEnv("VITE_APP_PERMISSION_ID", "PRODUCTS_APP_VIEW")
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "COMMON_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    await userStore.fetchPermissions()

    expect(userStore.permissions).toEqual(["COMMON_ADMIN"])
    expect(userStore.fetchStatus.permissions).toBe("success")
    expect(showToast).not.toHaveBeenCalled()
  })

  it("retries stale pending permission status", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "COMMON_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    userStore.fetchStatus.permissions = "pending"

    await userStore.ensurePermissions()

    expect(userStore.permissions).toEqual(["COMMON_ADMIN"])
    expect(userStore.fetchStatus.permissions).toBe("success")
  })

  it("force refreshes successful permission status", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "COMMON_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    userStore.permissions = ["PIM_PRODUCT_VIEW"]
    userStore.fetchStatus.permissions = "success"

    await userStore.ensurePermissions(true)

    expect(api).toHaveBeenCalledTimes(2)
    expect(userStore.permissions).toEqual(["COMMON_ADMIN"])
  })

  it("deduplicates concurrent permission loads", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce(permissionResponse([{ permissionId: "COMMON_ADMIN" }]))
      .mockResolvedValueOnce(permissionResponse([]))

    const userStore = useUserStore()
    await Promise.all([
      userStore.ensurePermissions(),
      userStore.ensurePermissions()
    ])

    expect(api).toHaveBeenCalledTimes(2)
    expect(userStore.permissions).toEqual(["COMMON_ADMIN"])
  })
})
