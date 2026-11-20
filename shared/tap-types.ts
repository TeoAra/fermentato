/** Persisted values: "pompa" is the existing database value for hand pump. */
export const TAP_TYPES = ["spina", "pompa", "botte"] as const;
export type TapType = (typeof TAP_TYPES)[number];

const TYPE_INFO = {
  spina: { label: "Alla spina", beerLabel: "Birra alla spina", priceLabel: "Prezzi alla spina", positionLabel: "Spina" },
  pompa: { label: "Hand pump", beerLabel: "Birra in hand pump", priceLabel: "Prezzi in hand pump", positionLabel: "Hand pump" },
  botte: { label: "Alla botte", beerLabel: "Birra alla botte", priceLabel: "Prezzi alla botte", positionLabel: "Botte" },
} as const;

/** Read compatibility only: legacy null/absent types remain draught. */
export function normalizeTapType(value?: string | null): TapType {
  return value === "pompa" || value === "botte" ? value : "spina";
}

export function getTapTypeInfo(value?: string | null) {
  return TYPE_INFO[normalizeTapType(value)];
}

export function groupTapItems<T extends {
  tapType?: string | null;
  tapNumber?: number | null;
  isActive?: boolean | null;
  isVisible?: boolean | null;
}>(items: readonly T[]) {
  const visible = items.filter(item => item.isActive !== false && item.isVisible !== false)
    .sort((a, b) => (a.tapNumber ?? 999) - (b.tapNumber ?? 999));
  return TAP_TYPES.map(type => ({
    type,
    label: TYPE_INFO[type].label,
    items: visible.filter(item => normalizeTapType(item.tapType) === type),
  })).filter(group => group.items.length > 0);
}
