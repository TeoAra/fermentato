import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardContainer
   Wrapper unificato con padding/max-width coerente per tutte le dashboard.
   ─────────────────────────────────────────────────────────────────────────── */
interface DashboardContainerProps {
  children: ReactNode;
  size?: "narrow" | "default" | "wide";
  className?: string;
}
export function DashboardContainer({ children, size = "default", className }: DashboardContainerProps) {
  // Allineato a PageContainer: narrow=3xl, default=5xl, wide=7xl (con hero=6xl disponibile via PageContainer)
  const max = { narrow: "max-w-3xl", default: "max-w-5xl", wide: "max-w-7xl" }[size];
  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-12">
      <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6", max, className)}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardHero
   Banner uniforme: gradiente brand, avatar/icona, titolo + sottotitolo + badge.
   Variante: "primary" (arancio brand), "dark" (carta scura), "neutral" (white).
   ─────────────────────────────────────────────────────────────────────────── */
interface DashboardHeroProps {
  title: string;
  subtitle?: ReactNode;
  avatar?: { src?: string | null; fallback: string; onClick?: () => void; uploading?: boolean };
  icon?: LucideIcon;
  badges?: { label: string; icon?: LucideIcon }[];
  actions?: ReactNode;
  variant?: "primary" | "dark" | "neutral";
  cover?: string | null;
  children?: ReactNode;
}
export function DashboardHero({
  title, subtitle, avatar, icon: Icon, badges = [], actions, variant = "primary", cover, children,
}: DashboardHeroProps) {
  const bg = {
    primary: "bg-gradient-to-br from-primary via-primary to-orange-600 text-white",
    dark:    "bg-gradient-to-br from-[hsl(25,18%,10%)] via-[hsl(20,15%,18%)] to-[hsl(30,12%,24%)] text-white",
    neutral: "bg-white dark:bg-card border border-stone-100 dark:border-border text-foreground",
  }[variant];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-sm",
        bg,
      )}
    >
      {cover && (
        <>
          <img src={cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />
        </>
      )}
      {!cover && variant !== "neutral" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
      )}

      <div className="relative z-10 p-5 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {avatar && (
            <button
              type="button"
              onClick={avatar.onClick}
              disabled={!avatar.onClick || avatar.uploading}
              aria-label="Cambia avatar"
              className={cn(
                "relative shrink-0 rounded-2xl overflow-hidden bg-white/10 ring-2 sm:ring-4 ring-white/30 shadow-lg flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto sm:mx-0",
                avatar.onClick && "cursor-pointer hover:ring-white/50 transition",
              )}
            >
              {avatar.src ? (
                <img src={avatar.src} alt={title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-white select-none">
                  {avatar.fallback.slice(0, 2).toUpperCase()}
                </span>
              )}
              {avatar.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
          )}

          {!avatar && Icon && (
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center mx-auto sm:mx-0">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-poppins tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div className={cn("text-sm sm:text-base mt-1", variant === "neutral" ? "text-muted-foreground" : "text-white/85")}>
                {subtitle}
              </div>
            )}
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                {badges.map((b, i) => {
                  const BadgeIcon = b.icon;
                  return (
                    <Badge
                      key={i}
                      className={cn(
                        "text-[11px] font-bold rounded-full",
                        variant === "neutral"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30",
                      )}
                    >
                      {BadgeIcon && <BadgeIcon className="w-3 h-3 mr-1" />}
                      {b.label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {actions && (
            <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
        {children && <div className="mt-4 sm:mt-5">{children}</div>}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatCard / StatsGrid
   Stat card uniforme con icona colorata. Mobile: 2 col, sm: 3, lg: 4-5.
   ─────────────────────────────────────────────────────────────────────────── */
export interface StatCardItem {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  accent?: "primary" | "blue" | "emerald" | "purple" | "red" | "amber" | "stone";
  onClick?: () => void;
  href?: string;
}
const STAT_ACCENTS = {
  primary:  { bg: "bg-primary/10",  text: "text-primary" },
  blue:     { bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-600 dark:text-blue-400" },
  emerald:  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400" },
  purple:   { bg: "bg-purple-50 dark:bg-purple-950/30",   text: "text-purple-600 dark:text-purple-400" },
  red:      { bg: "bg-red-50 dark:bg-red-950/30",         text: "text-red-500 dark:text-red-400" },
  amber:    { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-400" },
  stone:    { bg: "bg-stone-100 dark:bg-[#1B2735]/50",    text: "text-stone-600 dark:text-stone-300" },
};

export function StatCard({ icon: Icon, label, value, accent = "primary", onClick, href }: StatCardItem) {
  const a = STAT_ACCENTS[accent];
  const inner = (
    <div className="bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm hover:shadow-md transition-all p-3 sm:p-4 flex items-center justify-between gap-2 h-full">
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-black text-foreground mt-0.5">{value}</p>
      </div>
      <div className={cn("shrink-0 p-2 sm:p-2.5 rounded-xl", a.bg)}>
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", a.text)} />
      </div>
    </div>
  );
  if (href)    return <Link href={href}><div className="cursor-pointer">{inner}</div></Link>;
  if (onClick) return <button type="button" onClick={onClick} className="text-left w-full">{inner}</button>;
  return inner;
}

export function StatsGrid({ items, cols }: { items: StatCardItem[]; cols?: 3 | 4 | 5 }) {
  const colClass = cols === 5
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    : cols === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid gap-2.5 sm:gap-3", colClass)}>
      {items.map((it, i) => <StatCard key={i} {...it} />)}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardNavCard
   Card di navigazione con icona, titolo, descrizione. Usata per dash admin.
   ─────────────────────────────────────────────────────────────────────────── */
interface DashboardNavCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "blue" | "emerald" | "purple" | "red" | "amber" | "stone";
  badge?: string | number;
  external?: boolean;
}
const NAV_ACCENTS: Record<string, string> = {
  primary: "border-l-primary",
  blue:    "border-l-blue-600",
  emerald: "border-l-emerald-600",
  purple:  "border-l-purple-600",
  red:     "border-l-red-500",
  amber:   "border-l-amber-500",
  stone:   "border-l-stone-400",
};
export function DashboardNavCard({
  href, icon: Icon, title, description, accent = "primary", badge,
}: DashboardNavCardProps) {
  const a = STAT_ACCENTS[accent];
  return (
    <Link href={href}>
      <Card className={cn(
        "bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-l-4 group h-full",
        NAV_ACCENTS[accent],
      )}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className={cn("p-1.5 rounded-lg shrink-0", a.bg)}>
                  <Icon className={cn("w-5 h-5", a.text)} />
                </div>
                <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">{title}</h3>
                {badge !== undefined && badge !== 0 && (
                  <span className="ml-auto text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardSection
   Sezione standard con titolo + opzionale azione laterale.
   ─────────────────────────────────────────────────────────────────────────── */
export function DashboardSection({
  title, icon: Icon, action, children, className,
}: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("bg-white dark:bg-card border border-stone-100 dark:border-border rounded-2xl shadow-sm p-4 sm:p-5 md:p-6", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          {title && (
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
