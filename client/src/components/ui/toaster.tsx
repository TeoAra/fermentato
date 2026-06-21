import { useEffect } from "react"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function ToastPill({ id, title, description, variant, open, action, dismiss }: {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: string
  open?: boolean
  action?: React.ReactNode
  dismiss: (id: string) => void
}) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => dismiss(id), 3500)
    return () => clearTimeout(t)
  }, [id, open, dismiss])

  const isError = variant === "destructive"
  const isInfo = !isError && !!description && !title

  return (
    <div
      role="status"
      aria-live={isError ? "assertive" : "polite"}
      style={{
        opacity: open ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: open ? "auto" : "none",
      }}
      className={cn(
        "flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-[88vw] sm:max-w-sm",
        isError
          ? "bg-red-600 text-white"
          : "bg-gray-900 dark:bg-zinc-100 text-white dark:text-gray-900"
      )}
    >
      <span className="mt-0.5 shrink-0">
        {isError
          ? <AlertCircle className="w-4 h-4" />
          : <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />}
      </span>
      <div className="flex flex-col min-w-0 gap-0.5">
        {title && <span className="leading-snug">{title}</span>}
        {description && (
          <span className="text-xs font-normal opacity-75 leading-snug">{description}</span>
        )}
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    /*
     * PERSISTENT container — always in the DOM, never conditionally rendered.
     * Safari pre-allocates a single GPU compositing layer for this element at
     * app startup. When a notification fires, only the child's `opacity`
     * changes inside the existing layer → no new layer creation, no
     * re-compositing of header (z-50) or bottom nav (z-55) on iOS.
     *
     * Rules:
     *  - `transform: translateZ(0)` is STATIC — it never changes.
     *  - No `animate-in` / `@keyframes` / Tailwind enter animations.
     *  - Only `opacity` transitions on individual pills.
     *  - `contain: layout style paint` isolates this layer completely.
     */
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: "calc(env(safe-area-inset-top) + 3.5rem + 0.5rem)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0 1rem",
        pointerEvents: "none",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        contain: "layout style paint",
      }}
    >
      {toasts.map(({ id, title, description, variant, open, action }) => (
        <ToastPill
          key={id}
          id={id}
          title={title}
          description={description}
          variant={variant}
          open={open}
          action={action}
          dismiss={dismiss}
        />
      ))}
    </div>
  )
}
