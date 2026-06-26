import { useEffect } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { isIosNative } from "@/lib/platform"

function PillContent({ title, description, action, isError }: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  isError: boolean
}) {
  return (
    <>
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
    </>
  )
}

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
      <PillContent title={title} description={description} action={action} isError={isError} />
    </div>
  )
}

type ToastState = ReturnType<typeof useToast>

/*
 * iOS NATIVO — pill SEMPRE montata (nodo DOM stabile, mai smontato) che cambia
 * solo `visibility`. È la mitigazione web-only più robusta contro il "detach" di
 * header/dock in WKWebView: la causa è la CREAZIONE/DISTRUZIONE di un layer/
 * sottoalbero fisso a ogni notifica, che ri-ancora gli elementi position:fixed a
 * un offset di scroll stale. Qui il nodo nasce UNA volta all'avvio e da lì cambia
 * solo contenuto e visibilità — niente mount/unmount, niente transition opacity
 * (che promuoverebbe un layer temporaneo), niente translateZ/contain.
 * Il fix DEFINITIVO resta il toast OS nativo (@capacitor/toast, vedi
 * use-toast.ts), attivo dopo una ricompilazione dell'app; finché non è
 * disponibile, le notifiche testuali ricadono qui.
 */
function IosPersistentPill({ toasts, dismiss }: {
  toasts: ToastState["toasts"]
  dismiss: ToastState["dismiss"]
}) {
  const current = toasts[0]
  const open = !!current?.open
  const currentId = current?.id

  useEffect(() => {
    if (!open || !currentId) return
    const t = setTimeout(() => dismiss(currentId), 3500)
    return () => clearTimeout(t)
  }, [currentId, open, dismiss])

  const isError = current?.variant === "destructive"

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: "calc(var(--frozen-sat) + 3.5rem + 0.5rem)",
        zIndex: 90,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 1rem",
        pointerEvents: "none",
        transform: "none",
        WebkitTransform: "none",
        contain: "none",
      }}
    >
      <div
        role="status"
        aria-live={isError ? "assertive" : "polite"}
        style={{
          // Solo visibility → nessun layer creato/distrutto, nessun re-anchor.
          visibility: open ? "visible" : "hidden",
          transition: "none",
          pointerEvents: open ? "auto" : "none",
        }}
        className={cn(
          "flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-[88vw] sm:max-w-sm",
          isError
            ? "bg-red-600 text-white"
            : "bg-gray-900 dark:bg-zinc-100 text-white dark:text-gray-900"
        )}
      >
        {/*
         * Skeleton interno STABILE: ogni nodo è sempre montato. Cambiano solo
         * testo, `display` delle icone e className → NESSUN figlio del sottoalbero
         * fisso viene montato/smontato, eliminando anche il churn dei discendenti
         * (non solo del guscio) come possibile innesco del detach in WKWebView.
         */}
        <span className="mt-0.5 shrink-0">
          <AlertCircle className="w-4 h-4" style={{ display: isError ? "block" : "none" }} />
          <CheckCircle2
            className="w-4 h-4 text-emerald-400 dark:text-emerald-600"
            style={{ display: isError ? "none" : "block" }}
          />
        </span>
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="leading-snug">{current?.title}</span>
          <span className="text-xs font-normal opacity-75 leading-snug">{current?.description}</span>
        </div>
        <div className="ml-auto shrink-0">{current?.action}</div>
      </div>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  // Segnala all'hook di re-anchor del chrome iOS (bottom-navigation.tsx, attivo
  // solo su PWA/Safari) ogni apertura/dismiss. Su iOS nativo l'hook è disattivato
  // ma l'evento resta innocuo.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app-toast-changed"))
  }, [toasts])

  // iOS nativo: pill persistente (nodo stabile + sola visibility) per non
  // creare/distruggere layer fissi a ogni notifica. Vedi IosPersistentPill.
  if (isIosNative) {
    return <IosPersistentPill toasts={toasts} dismiss={dismiss} />
  }

  return (
    /*
     * PERSISTENT container — always in the DOM, never conditionally rendered.
     * Safari pre-allocates a single GPU compositing layer for this element at
     * app startup. When a notification fires, only the child's `opacity`
     * changes inside the existing layer → no new layer creation, no
     * re-compositing of header (z-50) or bottom nav (z-55).
     *
     * Rules (web / PWA / mobile Safari):
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
        top: "calc(var(--frozen-sat) + 3.5rem + 0.5rem)",
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
          variant={variant ?? undefined}
          open={open}
          action={action}
          dismiss={dismiss}
        />
      ))}
    </div>
  )
}
