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
  userType: varchar("user_type").notNull().default("customer"), // 'customer' or 'pub_owner'
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
  imageUrl: varchar("image_url"),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  isActive: boolean("is_active").default(true),
  openingHours: jsonb("opening_hours"), // Store hours as JSON
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
  logoUrl: varchar("logo_url"),
  color: varchar("color"), // Beer color
  createdAt: timestamp("created_at").defaultNow(),
});

// Tap list - which beers are currently on tap at which pubs
export const tapList = pgTable("tap_list", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  beerId: integer("beer_id").references(() => beers.id).notNull(),
  isActive: boolean("is_active").default(true),
  priceSmall: decimal("price_small", { precision: 5, scale: 2 }), // 0.2L
  priceMedium: decimal("price_medium", { precision: 5, scale: 2 }), // 0.4L
  priceLarge: decimal("price_large", { precision: 5, scale: 2 }), // 0.5L
  tapNumber: integer("tap_number"),
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Food menu categories
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  pubId: integer("pub_id").references(() => pubs.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food menu items
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => menuCategories.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 5, scale: 2 }).notNull(),
  allergens: jsonb("allergens"), // Array of allergens
  isAvailable: boolean("is_available").default(true),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User favorites
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  beerId: integer("beer_id").references(() => beers.id),
  pubId: integer("pub_id").references(() => pubs.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  menuCategories: many(menuCategories),
  favorites: many(favorites),
}));

export const beersRelations = relations(beers, ({ one, many }) => ({
  brewery: one(breweries, {
    fields: [beers.breweryId],
    references: [breweries.id],
  }),
  tapList: many(tapList),
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
  beer: one(beers, {
    fields: [favorites.beerId],
    references: [beers.id],
  }),
  pub: one(pubs, {
    fields: [favorites.pubId],
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

export type InsertMenuCategory = typeof menuCategories.$inferInsert;
export type MenuCategory = typeof menuCategories.$inferSelect;

export type InsertMenuItem = typeof menuItems.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertFavorite = typeof favorites.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;

// Insert schemas
export const insertBrewerySchema = createInsertSchema(breweries).omit({
  id: true,
  createdAt: true,
});

export const insertPubSchema = createInsertSchema(pubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
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

// Custom schemas for forms
export const pubRegistrationSchema = insertPubSchema.extend({
  vatNumber: z.string().min(11, "P.IVA deve essere di almeno 11 caratteri"),
  businessName: z.string().min(1, "Ragione sociale è obbligatoria"),
});
