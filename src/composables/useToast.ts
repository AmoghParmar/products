import { toastController } from "@ionic/vue"
import { commonUtil, logger } from "@common"

/** One toast surface for the app; mutations route success/error feedback through here. */
export function useToast() {
  const show = async (message: string, color?: "success" | "danger" | "warning") => {
    const toast = await toastController.create({ message, duration: 3000, position: "bottom", color })
    await toast.present()
  }

  return {
    success: (message: string) => show(message, "success"),
    error: (error: unknown, fallback?: string) => {
      if(error) {
        logger.error(fallback || "Error", error)
      }
      const serverError = commonUtil.getErrorMessage(error)
      const message = fallback
        ? `${fallback}${serverError ? `. ${serverError}` : ""}`
        : serverError
      return show(message, "danger")
    },
    info: (message: string) => show(message)
  }
}
