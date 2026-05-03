import { cn } from "@/lib/utils";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

type Variant = "narrow" | "standard" | "hero" | "wide";

const VARIANT_MAX_WIDTH: Record<Variant, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-5xl",
  hero: "max-w-6xl",
  wide: "max-w-7xl",
};

interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant;
  as?: ElementType;
  noPadding?: boolean;
  children: ReactNode;
}

export function PageContainer({
  variant = "standard",
  as: Component = "div",
  noPadding = false,
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn(
        "w-full mx-auto",
        VARIANT_MAX_WIDTH[variant],
        !noPadding && "px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default PageContainer;
