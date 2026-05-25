import { motion } from "framer-motion";
import {
  ShoppingBag,
  Calendar,
  PartyPopper,
  Gift,
  Accessibility,
  ChevronRight,
} from "lucide-react";
import type { PubLike } from "./types";

interface InfoCardsProps {
  pub: PubLike;
  onTabChange?: (tab: string) => void;
}

interface InfoCardDef {
  key: string;
  label: string;
  icon: any;
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
      className="space-y-3 pt-4"
      data-testid="info-cards-section"
    >
      <div>
        <h2 className="text-xl font-black text-[#151515] dark:text-[#F5F5F5]">Info utili</h2>
        <p className="text-xs text-[#6B6357] dark:text-[#B7BDC7] mt-0.5">Servizi e informazioni aggiuntive</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="text-left bg-white dark:bg-[#1A1D24] rounded-[20px] border border-[#E8DED1] dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
              data-testid={`info-card-${c.key}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  c.available ? "bg-[#FFF7EA] dark:bg-[#F59E0B]/15 text-[#F59E0B]" : "bg-[#FAF7F1] dark:bg-[#12151A] text-[#6B6357] dark:text-[#B7BDC7]"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[#151515] dark:text-[#F5F5F5] leading-tight">{c.label}</p>
                <p className={`text-[10px] mt-0.5 font-semibold ${c.available ? "text-[#F59E0B]" : "text-[#6B6357] dark:text-[#B7BDC7]"}`}>
                  {c.available ? "Disponibile" : "Non disponibile"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#6B6357] dark:text-[#B7BDC7] flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
