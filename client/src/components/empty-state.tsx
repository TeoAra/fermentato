import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onCta,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const padY = size === "sm" ? "py-10" : size === "lg" ? "py-20" : "py-14";
  const iconBox = size === "sm" ? "w-12 h-12" : "w-16 h-16";
  const titleSize = size === "sm" ? "text-[15px]" : "text-lg";

  return (
    <div
      className={`text-center ${padY} bg-white dark:bg-card rounded-3xl border border-stone-100 dark:border-[#23262E]/60 ${className}`}
    >
      <div
        className={`${iconBox} rounded-2xl bg-stone-100 dark:bg-[#1A1D24] flex items-center justify-center mx-auto mb-3`}
      >
        {icon}
      </div>
      <h3 className={`${titleSize} font-extrabold text-foreground`}>{title}</h3>
      {subtitle && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 px-6 max-w-md mx-auto">
          {subtitle}
        </p>
      )}
      {ctaLabel && (ctaHref || onCta) && (
        <div className="mt-4">
          {ctaHref ? (
            <Link href={ctaHref}>
              <Button className="rounded-2xl font-bold">{ctaLabel}</Button>
            </Link>
          ) : (
            <Button onClick={onCta} className="rounded-2xl font-bold">
              {ctaLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
