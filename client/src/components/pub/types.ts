export interface PubBrewery {
  id?: number;
  name?: string;
  logoUrl?: string | null;
}

export interface PubBeer {
  id: number;
  name: string;
  style?: string | null;
  abv?: string | number | null;
  ibu?: number | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  isGlutenFree?: boolean;
  isAlcoholFree?: boolean;
  breweryName?: string | null;
  brewery?: PubBrewery | null;
  country?: string | null;
  countryEmoji?: string | null;
}

export interface PriceItem {
  size: string;
  price: string;
  format?: string;
}

export interface TapItem {
  id: number;
  beer: PubBeer;
  prices?: PriceItem[];
  priceSmall?: string | null;
  priceMedium?: string | null;
  priceLarge?: string | null;
  tapNumber?: number | null;
  tapType?: string | null;
  description?: string | null;
  isVisible?: boolean | null;
}

export interface BottleItem {
  id: number;
  beer: PubBeer;
  format?: string | null;
  size?: string | null;
  price?: string | null;
  imageUrl?: string | null;
}

export interface MenuItemAllergen {
  emoji: string;
  label: string;
}

export interface MenuItem {
  id: number | string;
  name: string;
  description?: string | null;
  price: string | number;
  imageUrl?: string | null;
  allergens?: (string | number | MenuItemAllergen)[] | null;
  pairingBeer?: { id?: number; name: string; logoUrl?: string | null } | null;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isAvailable?: boolean;
}

export interface MenuCategory {
  id: number | string;
  name: string;
  description?: string | null;
  items: MenuItem[];
}

export interface FoodMenu {
  categories: MenuCategory[];
}

export interface PubLike {
  id?: number;
  name?: string;
  description?: string | null;
  richContent?: any;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  coverImageUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  openingHours?: any;
  amenities?: string[] | null;
  services?: string[] | null;
  slug?: string | null;
  ownerId?: string | number | null;
  hasBeerShop?: boolean;
  hasGiftCard?: boolean;
  hasPrivateEvents?: boolean;
  isAccessible?: boolean;
}

export type OpenStatus = 'open' | 'closing_soon' | 'opening_soon' | 'closed';

export interface OpenStatusInfo {
  status: OpenStatus;
  label: string;
  detail?: string;
}
