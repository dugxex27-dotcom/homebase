import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import type { User } from "@shared/schema"

export function Toaster() {
  const { toasts } = useToast()
  const { user } = useAuth()
  const typedUser = user as User | undefined

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determine variant based on user role if not explicitly set
        const toastVariant = variant || (typedUser?.role === 'contractor' ? 'contractor' : typedUser?.role === 'homeowner' ? 'homeowner' : 'default')
        
        return (
          <Toast key={id} variant={toastVariant as any} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
