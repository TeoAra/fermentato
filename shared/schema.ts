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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  nickname: varchar("nickname").unique(),
  bio: text("bio"),
  favoriteStyles: varchar("favorite_styles").array(),
  userType: varchar("user_type").notNull().default("customer"), // 'customer', 'pub_owner', or 'admin' - legacy field
  roles: varchar("roles").array(), // Available roles for this user: ['customer'], ['customer', 'pub_owner'], or ['customer', 'pub_owner', 'admin']
  activeRole: varchar("active_role"), // Currently active role for UI/navigation
  lastNicknameUpdate: timestamp("last_nickname_update").defaultNow(),
  emailLastUpdated: timestamp("email_last_updated"),
  passwordLastUpdated: timestamp("password_last_updated"),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Breweries table
export const breweries = pgTable("breweries", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location").notNull(),
  region: varchar("region").notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url"),
  websiteUrl: varchar("website_url"),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  bottleImageUrl: varchar("bottle_image_url"), // Immagine della bottiglia
  color: varchar("color"), // Beer color
  isBottled: boolean("is_bottled").default(false), // Se disponibile in bottiglia
  createdAt: timestamp("created_at").defaultNow(),
});

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
  imageUrl: varchar("image_url"),
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
  rating: integer("rating"), // 1-5 stelle (opzionale)
  personalNotes: text("personal_notes"), // Note personali dell'utente
  tastedAt: timestamp("tasted_at").defaultNow(),
  pubId: integer("pub_id").references(() => pubs.id), // Dove l'ha assaggiata (opzionale)
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

export type InsertRating = typeof ratings.$inferInsert;
export type Rating = typeof ratings.$inferSelect;

export type InsertUserBeerTasting = typeof userBeerTastings.$inferInsert;
export type UserBeerTasting = typeof userBeerTastings.$inferSelect;

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
  logoUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
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

// Types
export type PubSize = typeof pubSizes.$inferSelect;
export type InsertPubSize = z.infer<typeof insertPubSizeSchema>;

// Custom schemas for forms
export const pubRegistrationSchema = insertPubSchema.extend({
  vatNumber: z.string().min(11, "P.IVA deve essere di almeno 11 caratteri"),
  businessName: z.string().min(1, "Ragione sociale è obbligatoria"),
  description: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Email non valida").nullable().optional(),
  websiteUrl: z.string().url("URL non valido").nullable().optional(),
});
