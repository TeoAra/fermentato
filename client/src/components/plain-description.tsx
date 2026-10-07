import { forwardRef, useId, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import { descriptionToText } from "@shared/description-text";
import { cn } from "@/lib/utils";

export function PlainDescription({ text, className }: { text?: string | null; className?: string }) {
  const value = descriptionToText(text);
  if (!value) return null;
  return <div className={cn(className, "whitespace-pre-wrap break-words font-normal not-italic")}>{value}</div>;
}

export interface PlainDescriptionEditorProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange" | "maxLength"> {
  content: string;
  onChange: (text: string) => void;
  maxChars?: number;
}

/** Grows with its text; scrolling belongs to the surrounding page/dialog only. */
export const PlainDescriptionEditor = forwardRef<HTMLTextAreaElement, PlainDescriptionEditorProps>(
  ({ content, onChange, maxChars = 5000, className, id, onPaste, style, ...props }, forwardedRef) => {
    const generatedId = useId();
    const ref = useRef<HTMLTextAreaElement | null>(null);
    const value = descriptionToText(content, { trim: false });
    const countId = `${id || generatedId}-count`;
    useLayoutEffect(() => {
      const element = ref.current;
      if (!element) return;
      element.style.height = "auto";
      element.style.height = `${Math.max(104, element.scrollHeight)}px`;
    }, [value]);
    return <div className="space-y-1.5">
      <textarea
        {...props}
        id={id || generatedId}
        ref={element => {
          ref.current = element;
          if (typeof forwardedRef === "function") forwardedRef(element);
          else if (forwardedRef) forwardedRef.current = element;
        }}
        aria-label={props["aria-label"] || "Descrizione"}
        aria-describedby={[props["aria-describedby"], countId].filter(Boolean).join(" ")}
        value={value}
        maxLength={maxChars}
        rows={4}
        className={cn("block min-h-[104px] w-full rounded-xl border border-input bg-background px-3 py-2 text-base leading-6 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-sm", className)}
        style={{ ...style, overflow: "hidden", resize: "none", maxHeight: "none" }}
        data-description-editor="plain"
        onChange={event => onChange(descriptionToText(event.currentTarget.value, { trim: false }))}
        onPaste={event => {
          onPaste?.(event);
          if (event.defaultPrevented) return;
          const incoming = descriptionToText(event.clipboardData.getData("text/html") || event.clipboardData.getData("text/plain"), { trim: false });
          if (!incoming) return;
          event.preventDefault();
          const element = event.currentTarget;
          const start = element.selectionStart, end = element.selectionEnd;
          const insert = incoming.slice(0, Math.max(0, maxChars - value.length + end - start));
          onChange(value.slice(0, start) + insert + value.slice(end));
          requestAnimationFrame(() => ref.current?.setSelectionRange(start + insert.length, start + insert.length));
        }}
      />
      <p id={countId} className="text-right text-xs text-muted-foreground">{value.length}/{maxChars}</p>
    </div>;
  }
);
PlainDescriptionEditor.displayName = "PlainDescriptionEditor";
