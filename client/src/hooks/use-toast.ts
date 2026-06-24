import * as React from "react"
import { Capacitor } from "@capacitor/core"
import { isIosNative } from "@/lib/platform"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

/**
 * Fix DEFINITIVO del "detach" del chrome fisso su iOS nativo (WKWebView):
 * mostra la notifica come TOAST NATIVO dell'OS (@capacitor/toast) invece che
 * come overlay HTML position:fixed dentro la WebView. Una notifica disegnata
 * dall'OS vive FUORI dalla WebView → non crea/distrugge layer compositi e non
 * può ri-ancorare header/dock fissi (la causa storica del problema).
 *
 * Attivo solo su iOS nativo e solo se il plugin Toast è presente nel binario
 * installato (isPluginAvailable): le build precedenti senza plugin ricadono sul
 * toast HTML (che su iOS resta de-compositato, vedi toaster.tsx). I toast con
 * `action` (es. "Annulla") o con contenuto React non testuale restano HTML,
 * perché un toast OS è solo testo.
 */
function nodeToText(node: React.ReactNode): string | null {
  if (node == null || node === false || node === true) return null
  if (typeof node === "string" || typeof node === "number") return String(node)
  return null
}

/** Testo per il toast OS, oppure null se il toast NON deve usare la via nativa
 * (non iOS nativo, plugin assente, presenza di `action`, o contenuto non testo). */
function nativeToastText(props: Toast): string | null {
  if (!isIosNative) return null
  if (!Capacitor.isPluginAvailable("Toast")) return null
  if (props.action) return null
  const title = nodeToText(props.title)
  const description = nodeToText(props.description)
  if (title == null && description == null) return null
  const text = [title, description].filter(Boolean).join("\n")
  return text || null
}

function createHtmlToast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function toast({ ...props }: Toast) {
  // iOS nativo: instrada al toast nativo dell'OS quando disponibile (fuori dalla
  // WebView → non sposta header/dock). Se l'import o Toast.show falliscono
  // nonostante isPluginAvailable, ricade sul toast HTML così la notifica non
  // viene mai persa. Su web/PWA/Android resta sempre il toast HTML.
  const text = nativeToastText(props)
  if (text != null) {
    const id = genId()
    import("@capacitor/toast")
      .then((m) => m.Toast.show({ text, duration: "short", position: "top" }))
      .catch(() => {
        createHtmlToast(props)
      })
    return {
      id,
      dismiss: () => {},
      update: (_props: ToasterToast) => {},
    }
  }

  return createHtmlToast(props)
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
