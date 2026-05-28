import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  decimal,
  integer,
  unique,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  hashedPassword: varchar("hashed_password"), // For email/password auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nickname: varchar("nickname").unique(),
  bio: text("bio"),
  favoriteStyles: varchar("favorite_styles").array(),
  userType: varchar("user_type").notNull().default("customer"), // 'customer', 'pub_owner', 'brewery_owner', or 'admin' - legacy field
  roles: varchar("roles").array(), // Available roles: ['customer'], ['customer', 'pub_owner'], ['customer', 'brewery_owner'], etc.
  activeRole: varchar("active_role"), // Currently active role for UI/navigation
  breweryId: integer("brewery_id").references(() => breweries.id), // For brewery owners
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  needsOnboarding: boolean("needs_onboarding").default(false),
  isPublic: boolean("is_public").default(true), // Public profile visible to all
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastNicknameUpdate: timestamp("last_nickname_update").defaultNow(),
  lastProfileImageUpdate: timestamp("last_profile_image_update"),
  emailLastUpdated: timestamp("email_last_updated"),
  passwordLastUpdated: timestamp("password_last_updated"),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OAuth accounts for social login (Google, Facebook, etc.)
export const oauthAccounts = pgTable("oauth_accounts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider").notNull(), // 'google', 'facebook', etc.
  providerUserId: varchar("provider_user_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.provider, table.providerUserId)
]);

// Breweries table
export const breweries = pgTable("breweries", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  region: varchar("region").notNull(),
  country: varchar("country").default("Italia"),
  description: text("description"),
  descriptionHtml: text("description_html"),
  logoUrl: varchar("logo_url"),
  coverImageUrl: varchar("cover_image_url"),
  websiteUrl: varchar("website_url"),
  email: varchar("email"),
  vatNumber: varchar("vat_number"),
  phone: varchar("phone"),
  instagramUrl: varchar("instagram_url"),
  facebookUrl: varchar("facebook_url"),
  tiktokUrl: varchar("tiktok_url"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pubs table
export const pubs = pgTable("pubs", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  region: varchar("region").notNull(),
  postalCode: varchar("postal_code"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: varchar("phone"),
  email: varchar("email"),
  websiteUrl: varchar("website_url"),
  description: text("description"),
  imageUrl: varchar("image_url"), // Legacy field
  logoUrl: varchar("logo_url"), // Cloudinary URL for pub logo
  coverImageUrl: varchar("cover_image_url"), // Cloudinary URL for cover image
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  isActive: boolean("is_active").default(true),
  openingHours: jsonb("opening_hours"), // Store hours as JSON
  // Social Media Links
  facebookUrl: varchar("facebook_url"),
  instagramUrl: varchar("instagram_url"),
  twitterUrl: varchar("twitter_url"),
  tiktokUrl: varchar("tiktok_url"),
  // Business Info
  ownerId: varchar("owner_id").references(() => users.id),
  vatNumber: varchar("vat_number"), // P.IVA
  businessName: varchar("business_name"),
  menuInfoBox: text("menu_info_box"),
  // Subscription / verification
  isVerified: boolean("is_verified").default(false),
  subscriptionStatus: varchar("subscription_status").default("none"), // 'none' | 'trial' | 'active' | 'expired' | 'gifted'
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  slug: varchar("slug", { length: 150 }).unique(),
});

// Beers table
export const beers = pgTable("beers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  breweryId: integer("brewery_id").references(() => breweries.id).notNull(),
  style: varchar("style").notNull(),
  abv: decimal("abv", { precision: 3, scale: 1 }),
  ibu: integer("ibu"),
  description: text("description"),
  logoUrl: varchar("logo_url"), // Logo/etichetta della birra
  imageUrl: varchar("image_url"), // Immagine principale della birra

  color: varchar("color"), // Beer color
  isBottled: boolean("is_bottled").default(false), // Se disponibile in bottiglia
  isGlutenFree: boolean("is_gluten_free").default(false),
  isAlcoholFree: boolean("is_alcohol_free").default(false),
  isCollaboration: boolean("is_collaboration").default(false), // Birra in collaborazione
  isHidden: boolean("is_hidden").default(false), // Nascosta dalla pagina pubblica
  barcode: varchar("barcode"), // EAN/UPC barcode
  awards: jsonb("awards").$type<Array<{name: string; year: number; competition: string; type?: 'gold'|'silver'|'bronze'|'special'}>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Beer analytics — one row per page view (anonymous or logged-in)
export const beerViews = pgTable("beer_views", {
  id: serial("id").primaryKey(),
  beerId: integer("beer_id").references(() => beers.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Beer collaborations - which extra breweries co-produced a collab beer
export const beerCollaborations = pgTable("beer_collaborations", {
  id: serial("id").primaryKey(),
  beerId: integer("beer_id").references(() => beers.id, { onDelete: "cascade" }).notNull(),
  breweryId: integer("brewery_id").references(() => breweries.id, { onDelete: "cascade" }).notNull(),
}, (table) => [
  unique().on(table.beerId, table.breweryId),
]);

// Pub sizes - misure personalizzabili per ogni pub
export const pubSizes = pgTable("pub_sizes", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  sizeName: varchar("size_name").notNull(), // es. "Piccola", "Media", "Grande", "Boccale"
  sizeVolume: varchar("size_volume").notNull(), // es. "0.20L", "0.40L", "0.50L", "1L"
  orderIndex: integer("order_index").default(0), // ordine di visualizzazione
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tap list - which beers are currently on tap at which pubs
export const tapList = pgTable("tap_list", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  beerId: integer("beer_id").references(() => beers.id).notNull(),
  isActive: boolean("is_active").default(true),
  isVisible: boolean("is_visible").default(true), // Può essere nascosta temporaneamente
  // Prezzi flessibili - JSON con misure personalizzate del pub
  prices: jsonb("prices").$type<Record<string, number>>(), // es. {"Piccola": 4.50, "Media": 7.50, "Grande": 9.00}
  // Manteniamo i campi legacy per compatibilità
  priceSmall: decimal("price_small", { precision: 5, scale: 2 }), // 0.2L
  priceMedium: decimal("price_medium", { precision: 5, scale: 2 }), // 0.4L
  priceLarge: decimal("price_large", { precision: 5, scale: 2 }), // 0.5L
  tapNumber: integer("tap_number"),
  tapType: varchar("tap_type", { length: 20 }).default("spina"), // "spina" | "pompa"
  description: text("description"), // Note personalizzate del pub
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cantina (Bottle list) - beers available in bottles at pubs
export const bottleList = pgTable("bottle_list", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  beerId: integer("beer_id").references(() => beers.id).notNull(),
  isActive: boolean("is_active").default(true),
  isVisible: boolean("is_visible").default(true), // Può essere nascosta temporaneamente
  // Prezzi flessibili per bottiglie con misure personalizzate
  prices: jsonb("prices").$type<Record<string, number>>(), // es. {"33cl": 5.50, "50cl": 7.50, "75cl": 12.00}
  // Manteniamo compatibilità legacy
  priceBottle: decimal("price_bottle", { precision: 5, scale: 2 }), // Prezzo bottiglia
  bottleSize: varchar("bottle_size").default("0.33L"), // Dimensione bottiglia
  quantity: integer("quantity"), // Quantità disponibile
  description: text("description"), // Note personalizzate del pub
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food menu categories
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  infoBox: text("info_box"),
  isVisible: boolean("is_visible").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allergens reference table - 14 official allergens with emoji icons
export const allergens = pgTable("allergens", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  emoji: varchar("emoji").notNull(),
  orderIndex: integer("order_index").default(0),
});

// Food menu items
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => menuCategories.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 5, scale: 2 }).notNull(),
  allergens: jsonb("allergens").$type<string[]>(), // Array of allergen IDs
  isVisible: boolean("is_visible").default(true),
  isAvailable: boolean("is_available").default(true),
  isInfoBox: boolean("is_info_box").default(false),
  isVegetarian: boolean("is_vegetarian").default(false),
  isSpicy: boolean("is_spicy").default(false),
  imageUrl: varchar("image_url"),
  pairingBeerName: varchar("pairing_beer_name"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User favorites (universal system)
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  itemType: varchar("item_type").notNull(), // 'pub', 'brewery', 'beer'
  itemId: integer("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.itemType, table.itemId)
]);

// User activities table for tracking user actions
export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  activityType: varchar("activity_type").notNull(), // 'favorite_added', 'pub_visited', 'beer_rated', 'profile_updated'
  itemType: varchar("item_type"), // 'pub', 'brewery', 'beer', 'profile'
  itemId: integer("item_id"),
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data for activity
  createdAt: timestamp("created_at").defaultNow(),
});

// User beer tastings - birre assaggiate con note personali
export const userBeerTastings = pgTable("user_beer_tastings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  beerId: integer("beer_id").references(() => beers.id).notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }), // 0.5-5.0 scala decimale
  personalNotes: text("personal_notes"), // Note personali dell'utente
  format: varchar("format", { length: 100 }), // Come l'ha bevuta (es. alla spina, bottiglia, etc.)
  photoUrl: text("photo_url"), // Foto dell'assaggio
  tastedAt: timestamp("tasted_at").defaultNow(),
  pubId: integer("pub_id").references(() => pubs.id), // Dove l'ha assaggiata (opzionale)
  ownerReply: text("owner_reply"), // Risposta del proprietario del birrificio
  ownerReplyAt: timestamp("owner_reply_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.beerId) // Un record per utente per birra
]);

// Ratings table
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  pubId: integer("pub_id").notNull().references(() => pubs.id),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // One rating per user per pub
  unique("unique_user_pub_rating").on(table.userId, table.pubId),
]);

// Publican registration requests - pending approval
export const publicanRequests = pgTable("publican_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  pubName: varchar("pub_name").notNull(),
  pubAddress: varchar("pub_address").notNull(),
  pubCity: varchar("pub_city").notNull(),
  pubRegion: varchar("pub_region"),
  vatNumber: varchar("vat_number"),
  phone: varchar("phone"),
  email: varchar("email"),
  description: text("description"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  adminNotes: text("admin_notes"), // Notes from admin on approval/rejection
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Brewery registration requests - pending approval
export const breweryRequests = pgTable("brewery_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  breweryName: varchar("brewery_name").notNull(),
  breweryLocation: varchar("brewery_location").notNull(),
  breweryRegion: varchar("brewery_region"),
  breweryCountry: varchar("brewery_country"),
  vatNumber: varchar("vat_number"),
  phone: varchar("phone"),
  email: varchar("email"),
  websiteUrl: varchar("website_url"),
  description: text("description"),
  existingBreweryId: integer("existing_brewery_id").references(() => breweries.id),
  status: varchar("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Relations
export const breweriesRelations = relations(breweries, ({ many }) => ({
  beers: many(beers),
}));

export const pubsRelations = relations(pubs, ({ one, many }) => ({
  owner: one(users, {
    fields: [pubs.ownerId],
    references: [users.id],
  }),
  tapList: many(tapList),
  bottleList: many(bottleList),
  menuCategories: many(menuCategories),
  favorites: many(favorites),
}));

export const beersRelations = relations(beers, ({ one, many }) => ({
  brewery: one(breweries, {
    fields: [beers.breweryId],
    references: [breweries.id],
  }),
  tapList: many(tapList),
  bottleList: many(bottleList),
  favorites: many(favorites),
  collaborations: many(beerCollaborations),
}));

export const beerCollaborationsRelations = relations(beerCollaborations, ({ one }) => ({
  beer: one(beers, { fields: [beerCollaborations.beerId], references: [beers.id] }),
  brewery: one(breweries, { fields: [beerCollaborations.breweryId], references: [breweries.id] }),
}));

export const tapListRelations = relations(tapList, ({ one }) => ({
  pub: one(pubs, {
    fields: [tapList.pubId],
    references: [pubs.id],
  }),
  beer: one(beers, {
    fields: [tapList.beerId],
    references: [beers.id],
  }),
}));

export const bottleListRelations = relations(bottleList, ({ one }) => ({
  pub: one(pubs, {
    fields: [bottleList.pubId],
    references: [pubs.id],
  }),
  beer: one(beers, {
    fields: [bottleList.beerId],
    references: [beers.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  pub: one(pubs, {
    fields: [menuCategories.pubId],
    references: [pubs.id],
  }),
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const userActivitiesRelations = relations(userActivities, ({ one }) => ({
  user: one(users, {
    fields: [userActivities.userId],
    references: [users.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  pub: one(pubs, {
    fields: [ratings.pubId],
    references: [pubs.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertBrewery = typeof breweries.$inferInsert;
export type Brewery = typeof breweries.$inferSelect;

export type InsertPub = typeof pubs.$inferInsert;
export type Pub = typeof pubs.$inferSelect;

export type InsertBeer = typeof beers.$inferInsert;
export type Beer = typeof beers.$inferSelect;

export type InsertTapList = typeof tapList.$inferInsert;
export type TapList = typeof tapList.$inferSelect;

export type InsertBottleList = typeof bottleList.$inferInsert;
export type BottleList = typeof bottleList.$inferSelect;

export type InsertMenuCategory = typeof menuCategories.$inferInsert;
export type MenuCategory = typeof menuCategories.$inferSelect;

export type InsertAllergen = typeof allergens.$inferInsert;
export type Allergen = typeof allergens.$inferSelect;

export type InsertMenuItem = typeof menuItems.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertFavorite = typeof favorites.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;

export type InsertUserActivity = typeof userActivities.$inferInsert;
export type UserActivity = typeof userActivities.$inferSelect;
export type PubRecentActivity = {
  id: string;
  type: 'tasting' | 'saved_pub';
  userId: string;
  userName: string;
  userImage: string | null;
  beerId: number | null;
  beerName: string | null;
  rating: number | null;
  createdAt: string | Date;
};

export type InsertRating = typeof ratings.$inferInsert;
export type Rating = typeof ratings.$inferSelect;

export type InsertUserBeerTasting = typeof userBeerTastings.$inferInsert;
export type UserBeerTasting = typeof userBeerTastings.$inferSelect;

export type InsertOAuthAccount = typeof oauthAccounts.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;

// DTO Types for API responses (camelCase with proper numeric types)
export interface TapListItemDTO {
  id: number;
  pubId: number;
  beerId: number;
  isActive: boolean;
  isVisible: boolean;
  prices?: Record<string, number>;
  priceSmall?: number; // Decimal fields as numbers, not strings
  priceMedium?: number;
  priceLarge?: number;
  description?: string;
  tapNumber?: number;
  addedAt: string;
  updatedAt: string;
  beer: {
    id: number;
    name: string;
    style: string;
    abv?: string;
    ibu?: number;
    description?: string;
    imageUrl?: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
      logoUrl?: string;
    };
  };
}

export interface BottleListItemDTO {
  id: number;
  pubId: number;
  beerId: number;
  isActive: boolean;
  isVisible: boolean;
  prices?: Record<string, number>;
  priceBottle?: number; // Decimal fields as numbers, not strings
  price?: number; // Alternative field name expected by some components
  bottleSize?: string;
  size?: string; // Alternative field name expected by some components
  vintage?: string;
  quantity?: number;
  description?: string;
  addedAt: string;
  updatedAt: string;
  beer: {
    id: number;
    name: string;
    style: string;
    abv?: string;
    description?: string;
    imageUrl?: string;
    logoUrl?: string;
    brewery: {
      id: number;
      name: string;
      logoUrl?: string;
    };
  };
}

// Insert schemas
export const insertBrewerySchema = createInsertSchema(breweries).omit({
  id: true,
  createdAt: true,
});

export const insertPubSchema = createInsertSchema(pubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  logoUrl: z.url().optional().nullable(),
  coverImageUrl: z.url().optional().nullable(),
});

export const insertBeerSchema = createInsertSchema(beers).omit({
  id: true,
  createdAt: true,
});

export const insertTapListSchema = createInsertSchema(tapList).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export const insertBottleListSchema = createInsertSchema(bottleList).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
});

export const insertAllergenSchema = createInsertSchema(allergens).omit({
  id: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPubSizeSchema = createInsertSchema(pubSizes).omit({
  id: true,
  createdAt: true,
});

export const insertPublicanRequestSchema = createInsertSchema(publicanRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
  adminNotes: true,
});

export const insertBreweryRequestSchema = createInsertSchema(breweryRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
  adminNotes: true,
});

// Types
export type PubSize = typeof pubSizes.$inferSelect;
export type InsertPubSize = z.infer<typeof insertPubSizeSchema>;
export type PublicanRequest = typeof publicanRequests.$inferSelect;
export type InsertPublicanRequest = z.infer<typeof insertPublicanRequestSchema>;
export type BreweryRequest = typeof breweryRequests.$inferSelect;
export type InsertBreweryRequest = z.infer<typeof insertBreweryRequestSchema>;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // 'tap_change', 'new_beer', 'new_pub_request', 'event', 'new_pub'
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  pubId: integer("pub_id").references(() => pubs.id),
  beerId: integer("beer_id").references(() => beers.id),
  breweryId: integer("brewery_id").references(() => breweries.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  // Categorie — canale IN-APP (default true tranne newPubs)
  tapChanges: boolean("tap_changes").default(true),
  events: boolean("events").default(true),
  newPubs: boolean("new_pubs").default(false),
  checkinLikes: boolean("checkin_likes").default(true),
  checkinComments: boolean("checkin_comments").default(true),
  newFollowers: boolean("new_followers").default(true),
  breweryReplies: boolean("brewery_replies").default(true),
  reportUpdates: boolean("report_updates").default(true),
  adminBroadcasts: boolean("admin_broadcasts").default(true),
  // Categorie — canale PUSH (controllo indipendente dall'in-app)
  tapChangesPush: boolean("tap_changes_push").default(true),
  eventsPush: boolean("events_push").default(true),
  newPubsPush: boolean("new_pubs_push").default(false),
  checkinLikesPush: boolean("checkin_likes_push").default(true),
  checkinCommentsPush: boolean("checkin_comments_push").default(true),
  newFollowersPush: boolean("new_followers_push").default(true),
  breweryRepliesPush: boolean("brewery_replies_push").default(true),
  reportUpdatesPush: boolean("report_updates_push").default(true),
  adminBroadcastsPush: boolean("admin_broadcasts_push").default(true),
  // Categorie — canale EMAIL (default off per non-critiche; on per critiche)
  tapChangesEmail: boolean("tap_changes_email").default(false),
  eventsEmail: boolean("events_email").default(false),
  newPubsEmail: boolean("new_pubs_email").default(false),
  checkinLikesEmail: boolean("checkin_likes_email").default(false),
  checkinCommentsEmail: boolean("checkin_comments_email").default(false),
  newFollowersEmail: boolean("new_followers_email").default(false),
  breweryRepliesEmail: boolean("brewery_replies_email").default(true),
  reportUpdatesEmail: boolean("report_updates_email").default(true),
  adminBroadcastsEmail: boolean("admin_broadcasts_email").default(true),
  // Canali master
  pushEnabled: boolean("push_enabled").default(true),
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  // Ore di silenzio (HH:MM, mode: 'queue' rimanda, 'skip' scarta)
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  quietHoursMode: varchar("quiet_hours_mode", { length: 10 }).default("queue"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  updatedAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferencesSchema>;

// Push notification subscriptions (Web Push API)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

// Native push tokens (FCM per Android, APNs per iOS — via Capacitor)
export const nativePushTokens = pgTable("native_push_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  platform: varchar("platform", { length: 10 }).notNull(), // 'android' | 'ios'
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type NativePushToken = typeof nativePushTokens.$inferSelect;

// Pub Events
export const pubEvents = pgTable("pub_events", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("altro"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").default(true),
  startNotificationSent: boolean("start_notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPubEventSchema = createInsertSchema(pubEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PubEvent = typeof pubEvents.$inferSelect;
export type InsertPubEvent = z.infer<typeof insertPubEventSchema>;

// Brewery Events table (mirrored from pub_events)
export const breweryEvents = pgTable("brewery_events", {
  id: serial("id").primaryKey(),
  breweryId: integer("brewery_id").references(() => breweries.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("altro"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").default(true),
  startNotificationSent: boolean("start_notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBreweryEventSchema = createInsertSchema(breweryEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type BreweryEvent = typeof breweryEvents.$inferSelect;
export type InsertBreweryEvent = z.infer<typeof insertBreweryEventSchema>;

// Pub Event Interests — utenti interessati a un evento di pub
export const pubEventInterests = pgTable("pub_event_interests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => pubEvents.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique().on(table.userId, table.eventId)]);

// Brewery Event Interests — utenti interessati a un evento di birrificio
export const breweryEventInterests = pgTable("brewery_event_interests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => breweryEvents.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [unique().on(table.userId, table.eventId)]);

// Review Reports table
export const reviewReports = pgTable("review_reports", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  reporterId: varchar("reporter_id").notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ReviewReport = typeof reviewReports.$inferSelect;

// Content suggestion table — users can suggest changes to beers or breweries
export const contentSuggestions = pgTable("content_suggestions", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // 'beer' | 'brewery'
  itemId: integer("item_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  proposedChanges: jsonb("proposed_changes").notNull(),
  currentData: jsonb("current_data"),
  message: text("message"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

export const insertContentSuggestionSchema = createInsertSchema(contentSuggestions).omit({
  id: true,
  status: true,
  adminNotes: true,
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type InsertContentSuggestion = typeof contentSuggestions.$inferInsert;

// Addition requests — users can request new beers or breweries to be added
export const additionRequests = pgTable("addition_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'beer' | 'brewery'
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  // Beer fields
  beerName: varchar("beer_name"),
  style: varchar("style"),
  abv: varchar("abv"),
  // Brewery fields (for type='brewery' or to link a beer to existing brewery)
  breweryName: varchar("brewery_name"),
  breweryId: integer("brewery_id").references(() => breweries.id),
  city: varchar("city"),
  country: varchar("country"),
  websiteUrl: varchar("website_url"),
  // Common
  description: text("description"),
  imageUrl: varchar("image_url"),
  logoUrl: varchar("logo_url"),
  coverImageUrl: varchar("cover_image_url"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdditionRequestSchema = createInsertSchema(additionRequests).omit({
  id: true,
  status: true,
  adminNotes: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
});
export type AdditionRequest = typeof additionRequests.$inferSelect;
export type InsertAdditionRequest = z.infer<typeof insertAdditionRequestSchema>;

// Static editable pages (Contatti, Chi Siamo, Prezzi, Supporto)
export const staticPages = pgTable("static_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStaticPageSchema = createInsertSchema(staticPages).omit({ id: true, updatedAt: true });
export type StaticPage = typeof staticPages.$inferSelect;
export type InsertStaticPage = z.infer<typeof insertStaticPageSchema>;

// Custom schemas for forms
export const scanLogs = pgTable("scan_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  imageUrl: varchar("image_url"),
  ocrText: text("ocr_text"),
  ocrEngine: varchar("ocr_engine", { length: 30 }),
  source: varchar("source", { length: 20 }),
  usedQuery: varchar("used_query"),
  topCandidates: jsonb("top_candidates"),
  chosenBeerId: integer("chosen_beer_id").references(() => beers.id, { onDelete: "set null" }),
  chosenBreweryId: integer("chosen_brewery_id").references(() => breweries.id, { onDelete: "set null" }),
  wasCorrect: boolean("was_correct"),
  correctedBeerId: integer("corrected_beer_id").references(() => beers.id, { onDelete: "set null" }),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics: page views per pub (aggregated per day)
// ─── Brewery Announcements (news + release limitate) ─────────────────────────
export const breweryAnnouncements = pgTable("brewery_announcements", {
  id: serial("id").primaryKey(),
  breweryId: integer("brewery_id").references(() => breweries.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("news"), // 'news' | 'release' | 'collab'
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  releaseDate: date("release_date"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertBreweryAnnouncementSchema = createInsertSchema(breweryAnnouncements).omit({ id: true, createdAt: true });
export type InsertBreweryAnnouncement = z.infer<typeof insertBreweryAnnouncementSchema>;
export type BreweryAnnouncement = typeof breweryAnnouncements.$inferSelect;

export const pubPageViews = pgTable("pub_page_views", {
  pubId: integer("pub_id").references(() => pubs.id, { onDelete: "cascade" }).notNull(),
  viewDate: date("view_date").notNull().default(sql`CURRENT_DATE`),
  viewCount: integer("view_count").notNull().default(1),
}, (t) => ({ pk: primaryKey({ columns: [t.pubId, t.viewDate] }) }));

export type PubPageView = typeof pubPageViews.$inferSelect;

export type BeerCollaboration = typeof beerCollaborations.$inferSelect;

// ─── Festival Mode ────────────────────────────────────────────────────────────
export const festivals = pgTable("festivals", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  logoUrl: varchar("logo_url"),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  ownerId: varchar("owner_id").references(() => users.id),
  isActive: boolean("is_active").default(false),
  showFood: boolean("show_food").default(true),
  paidAt: timestamp("paid_at"),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  priceEur: integer("price_eur").default(99),
  createdAt: timestamp("created_at").defaultNow(),
  schedule: jsonb("schedule").$type<Array<{ label: string; date?: string; openFrom: string; openTo: string }>>(),
  useTokens: boolean("use_tokens").default(false),
  tokenName: varchar("token_name", { length: 50 }).default("token"),
});
export const insertFestivalSchema = createInsertSchema(festivals).omit({ id: true, createdAt: true });
export type InsertFestival = z.infer<typeof insertFestivalSchema>;
export type Festival = typeof festivals.$inferSelect;

export const festivalTaps = pgTable("festival_taps", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").references(() => festivals.id, { onDelete: "cascade" }).notNull(),
  tapNumber: integer("tap_number").notNull(),
  beerId: integer("beer_id").references(() => beers.id, { onDelete: "set null" }),
  customBeerName: varchar("custom_beer_name", { length: 255 }),
  customBreweryName: varchar("custom_brewery_name", { length: 255 }),
  style: varchar("style", { length: 100 }),
  abv: varchar("abv", { length: 10 }),
  notes: text("notes"),
  isAvailable: boolean("is_available").default(true),
  tapType: varchar("tap_type", { length: 20 }).default("spina"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [unique().on(t.festivalId, t.tapNumber)]);
export const insertFestivalTapSchema = createInsertSchema(festivalTaps).omit({ id: true, updatedAt: true });
export type InsertFestivalTap = z.infer<typeof insertFestivalTapSchema>;
export type FestivalTap = typeof festivalTaps.$inferSelect;

export const festivalFoodItems = pgTable("festival_food_items", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").references(() => festivals.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 8, scale: 2 }),
  category: varchar("category", { length: 100 }),
  isAvailable: boolean("is_available").default(true),
  allergens: jsonb("allergens").$type<string[]>(),
});
export const insertFestivalFoodItemSchema = createInsertSchema(festivalFoodItems).omit({ id: true });
export type InsertFestivalFoodItem = z.infer<typeof insertFestivalFoodItemSchema>;
export type FestivalFoodItem = typeof festivalFoodItems.$inferSelect;

export const festivalRatings = pgTable("festival_ratings", {
  id: serial("id").primaryKey(),
  festivalId: integer("festival_id").references(() => festivals.id, { onDelete: "cascade" }).notNull(),
  tapId: integer("tap_id").references(() => festivalTaps.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  ownerReply: text("owner_reply"),
  ownerReplyAt: timestamp("owner_reply_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.tapId, t.userId)]);
export type FestivalRating = typeof festivalRatings.$inferSelect;

// ─── Virtual Cellar ───────────────────────────────────────────────────────────
export const userCellar = pgTable("user_cellar", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  beerId: integer("beer_id").notNull().references(() => beers.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1),
  notes: text("notes"),
  vintage: varchar("vintage", { length: 10 }),
  purchasePrice: decimal("purchase_price", { precision: 8, scale: 2 }),
  addedAt: timestamp("added_at").defaultNow(),
}, (t) => [unique().on(t.userId, t.beerId)]);
export type UserCellarItem = typeof userCellar.$inferSelect;

// ─── Wishlist ─────────────────────────────────────────────────────────────────
export const userWishlist = pgTable("user_wishlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  beerId: integer("beer_id").notNull().references(() => beers.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
}, (t) => [unique().on(t.userId, t.beerId)]);
export type UserWishlistItem = typeof userWishlist.$inferSelect;

// ─── Prossima Spina ───────────────────────────────────────────────────────────
export const nextTapProposals = pgTable("next_tap_proposals", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").notNull().references(() => pubs.id, { onDelete: "cascade" }),
  beerId: integer("beer_id").notNull().references(() => beers.id, { onDelete: "cascade" }),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type NextTapProposal = typeof nextTapProposals.$inferSelect;

export const nextTapVotes = pgTable("next_tap_votes", {
  id: serial("id").primaryKey(),
  proposalId: integer("proposal_id").notNull().references(() => nextTapProposals.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  votedAt: timestamp("voted_at").defaultNow(),
}, (t) => [unique().on(t.proposalId, t.userId)]);
export type NextTapVote = typeof nextTapVotes.$inferSelect;

// ─── Keg Change Log ───────────────────────────────────────────────────────────
export const tapChangeLogs = pgTable("tap_change_logs", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").notNull().references(() => pubs.id, { onDelete: "cascade" }),
  tapNumber: integer("tap_number"),
  tapType: varchar("tap_type", { length: 20 }),
  oldBeerId: integer("old_beer_id"),
  oldBeerName: varchar("old_beer_name", { length: 255 }),
  newBeerId: integer("new_beer_id"),
  newBeerName: varchar("new_beer_name", { length: 255 }),
  changedAt: timestamp("changed_at").defaultNow(),
  durationMinutes: integer("duration_minutes"),
});
export type TapChangeLog = typeof tapChangeLogs.$inferSelect;

// ─── Tap Line Cleanings ───────────────────────────────────────────────────────
export const tapCleanings = pgTable("tap_cleanings", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").notNull().references(() => pubs.id, { onDelete: "cascade" }),
  tapNumber: integer("tap_number"),
  tapType: varchar("tap_type", { length: 20 }).default("spina"),
  lineName: varchar("line_name", { length: 100 }),
  cleanedAt: timestamp("cleaned_at").defaultNow(),
  notes: text("notes"),
});
export type TapCleaning = typeof tapCleanings.$inferSelect;

// ─── User Follows ─────────────────────────────────────────────────────────────
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.followerId, t.followingId)]);
export type UserFollow = typeof userFollows.$inferSelect;

// ─── SOCIAL: Likes & Comments su check-in (user_beer_tastings) ────────────────
export const checkinLikes = pgTable("checkin_likes", {
  id: serial("id").primaryKey(),
  tastingId: integer("tasting_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.tastingId, t.userId)]);

export const checkinComments = pgTable("checkin_comments", {
  id: serial("id").primaryKey(),
  tastingId: integer("tasting_id").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── MICROBLOG: post liberi (testo + immagine opzionale) ─────────────────────
export const microblogPosts = pgTable("microblog_posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  beerId: integer("beer_id"),
  pubId: integer("pub_id"),
  breweryId: integer("brewery_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const microblogLikes = pgTable("microblog_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => microblogPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.postId, t.userId)]);
export const microblogComments = pgTable("microblog_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => microblogPosts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ADMIN: Broadcast push notifications + News ──────────────────────────────
export const adminBroadcasts = pgTable("admin_broadcasts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url"),
  imageUrl: text("image_url"),
  audience: text("audience").notNull().default("all"), // all | publicans | brewers | admins
  sentBy: varchar("sent_by").references(() => users.id, { onDelete: "set null" }),
  sentCount: integer("sent_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── RSS: News birra (aggregati da fonti esterne) ────────────────────────────
export const rssSources = pgTable("rss_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  enabled: boolean("enabled").default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const rssItems = pgTable("rss_items", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => rssSources.id, { onDelete: "cascade" }),
  guid: text("guid").notNull(),
  title: text("title").notNull(),
  link: text("link").notNull(),
  summary: text("summary"),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.sourceId, t.guid)]);

// Like sui commenti dei check-in
export const checkinCommentLikes = pgTable("checkin_comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => checkinComments.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.commentId, t.userId)]);

// ─── Segnalazioni unificate (recensioni + commenti check-in) ─────────────────
export const contentReports = pgTable("content_reports", {
  id: serial("id").primaryKey(),
  targetType: varchar("target_type", { length: 30 }).notNull(), // 'review' | 'checkin_comment'
  targetId: integer("target_id").notNull(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending | resolved | dismissed | escalated
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ContentReport = typeof contentReports.$inferSelect;
export type CheckinCommentLike = typeof checkinCommentLikes.$inferSelect;

export type CheckinLike = typeof checkinLikes.$inferSelect;
export type CheckinComment = typeof checkinComments.$inferSelect;
export type MicroblogPost = typeof microblogPosts.$inferSelect;
export type AdminBroadcast = typeof adminBroadcasts.$inferSelect;
export type RssSource = typeof rssSources.$inferSelect;
export type RssItem = typeof rssItems.$inferSelect;

export const insertMicroblogPostSchema = createInsertSchema(microblogPosts).omit({ id: true, createdAt: true, userId: true });
export const insertCheckinCommentSchema = createInsertSchema(checkinComments).omit({ id: true, createdAt: true, userId: true });
export const insertAdminBroadcastSchema = createInsertSchema(adminBroadcasts).omit({ id: true, createdAt: true, sentBy: true, sentCount: true });
export const insertRssSourceSchema = createInsertSchema(rssSources).omit({ id: true, createdAt: true, lastFetchedAt: true });

// ─── Bot Connections ──────────────────────────────────────────────────────────
export const botConnections = pgTable("bot_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pubId: integer("pub_id").notNull().references(() => pubs.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(), // 'telegram' | 'whatsapp'
  chatId: varchar("chat_id", { length: 100 }).notNull(),   // Telegram chat_id or WhatsApp phone
  displayName: varchar("display_name"),
  isActive: boolean("is_active").default(true),
  pendingAction: jsonb("pending_action"),                   // conferma interattiva in corso
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [unique().on(t.platform, t.chatId)]);

export const botLinkTokens = pgTable("bot_link_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pubId: integer("pub_id").notNull().references(() => pubs.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BotConnection = typeof botConnections.$inferSelect;
export type BotLinkToken = typeof botLinkTokens.$inferSelect;

export const pubRegistrationSchema = insertPubSchema.extend({
  vatNumber: z.string().min(11, "P.IVA deve essere di almeno 11 caratteri"),
  businessName: z.string().min(1, "Ragione sociale è obbligatoria"),
  description: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.email("Email non valida").nullable().optional(),
  websiteUrl: z.url("URL non valido").nullable().optional(),
  slug: z.string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo lettere minuscole, numeri e trattini (es. il-mio-pub)")
    .max(100)
    .optional()
    .or(z.literal("")),
});
