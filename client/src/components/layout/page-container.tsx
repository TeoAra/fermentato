import { cn } from "@/lib/utils";
import type { ElementType, HTMLAttributes, ReactNode } from "react";

export type PageContainerVariant = "narrow" | "standard" | "hero" | "wide";

const VARIANT_MAX_WIDTH: Record<PageContainerVariant, string> = {
  narrow: "max-w-3xl",
  standard: "max-w-5xl",
  hero: "max-w-6xl",
  wide: "max-w-7xl",
};

interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  variant?: PageContainerVariant;
  as?: ElementType;
  noPadding?: boolean;
  children: ReactNode;
}

interface PageContainerInsetProps extends HTMLAttributes<HTMLDivElement> {
  bleedOnMobile?: boolean;
}

const PAGE_GUTTERS = "px-4 sm:px-6 lg:px-8";
const PAGE_GUTTERS_WITH_MOBILE_BLEED = "sm:px-6 lg:px-8";

export function PageContainerInset({
  bleedOnMobile = false,
  className,
  children,
  ...props
}: PageContainerInsetProps) {
  return (
    <div
      className={cn(bleedOnMobile ? PAGE_GUTTERS_WITH_MOBILE_BLEED : PAGE_GUTTERS, className)}
      {...props}
    >
      {children}
    </div>
  );
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
        !noPadding && PAGE_GUTTERS,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default PageContainer;
