import { motion } from "framer-motion";
import {
  ShoppingBag,
  Calendar,
  PartyPopper,
  Gift,
  Accessibility,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PubLike } from "./types";

interface InfoCardsProps {
  pub: PubLike;
  onTabChange?: (tab: string) => void;
}

interface InfoCardDef {
  key: string;
  label: string;
  icon: LucideIcon;
  available: boolean;
  onClick?: () => void;
}

export default function InfoCards({ pub, onTabChange }: InfoCardsProps) {
  const services = pub?.services || [];
  const has = (k: string) => services.includes(k);

  const cards: InfoCardDef[] = [
    {
      key: "beer_shop",
      label: "Beer shop",
      icon: ShoppingBag,
      available: pub?.hasBeerShop ?? has("beer_shop"),
    },
    {
      key: "events",
      label: "Eventi",
      icon: Calendar,
      available: true,
      onClick: () => onTabChange?.("overview"),
    },
    {
      key: "private_events",
      label: "Feste private",
      icon: PartyPopper,
      available: pub?.hasPrivateEvents ?? has("private_events"),
    },
    {
      key: "gift_card",
      label: "Gift card",
      icon: Gift,
      available: pub?.hasGiftCard ?? has("gift_card"),
    },
    {
      key: "accessibility",
      label: "Accessibilità",
      icon: Accessibility,
      available: pub?.isAccessible ?? has("accessibility"),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
       className="space-y-3 pt-5 sm:pt-6"
      data-testid="info-cards-section"
    >
      <div>
        <h2 className="text-xl font-black text-foreground tracking-tight">Info utili</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Servizi e informazioni aggiuntive</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon;
          const content = (
            <>
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  c.available ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground leading-tight">{c.label}</p>
                <p className={cn("text-[11px] mt-0.5 font-semibold", c.available ? "text-accent-foreground" : "text-muted-foreground")}>
                  {c.available ? "Disponibile" : "Non disponibile"}
                </p>
              </div>
              {c.onClick && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </>
          );

          return c.onClick ? (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="text-left bg-card rounded-2xl border border-border shadow-card-sm p-3.5 min-h-16 flex items-center gap-2.5 interactive-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`info-card-${c.key}`}
            >
              {content}
            </button>
          ) : (
            <div
              key={c.key}
              className="bg-card rounded-2xl border border-border p-3.5 min-h-16 flex items-center gap-2.5"
              data-testid={`info-card-${c.key}`}
            >
              {content}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
